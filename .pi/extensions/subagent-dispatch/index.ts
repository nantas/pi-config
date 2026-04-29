import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { Type } from "@sinclair/typebox";
import { discoverAgentsAll } from "../../npm/node_modules/pi-subagents/agents.ts";
import { getArtifactsDir } from "../../npm/node_modules/pi-subagents/artifacts.ts";
import { createSubagentExecutor } from "../../npm/node_modules/pi-subagents/subagent-executor.ts";
import {
  buildAvailableAgentsSummary,
  buildDispatchToolDescription,
  buildDispatchUserMessage,
  buildMissingAgentDiagnostic,
  formatDispatchSyncText,
  sanitizeAgentDefinition,
  serializeTaskPlan,
  summarizeDispatchResult,
} from "./core.js";

const PROJECT_ROOT = process.cwd();

const DispatchTaskSchema = Type.Object({
  agent: Type.String({ minLength: 1 }),
  task: Type.String({ minLength: 1 }),
  projectContext: Type.Optional(
    Type.Union([
      Type.Literal("default"),
      Type.Literal("inherit"),
      Type.Literal("strip"),
    ])
  ),
  context: Type.Optional(Type.Union([Type.Literal("fresh"), Type.Literal("fork")])),
  skills: Type.Optional(
    Type.Unsafe({
      type: ["string", "array", "boolean"],
      items: { type: "string" },
    })
  ),
  reads: Type.Optional(
    Type.Unsafe({
      type: ["array", "boolean"],
      items: { type: "string" },
    })
  ),
  model: Type.Optional(Type.String()),
  cwd: Type.Optional(Type.String()),
});

const DispatchRequestSchema = Type.Object({
  mode: Type.Optional(Type.Union([Type.Literal("sync"), Type.Literal("async")])),
  tasks: Type.Array(DispatchTaskSchema, { minItems: 1 }),
});

function loadAgentDefinitions(cwd = PROJECT_ROOT) {
  const discovery = discoverAgentsAll(cwd);
  const merged = new Map();

  for (const definition of discovery.builtin) {
    merged.set(definition.name, sanitizeAgentDefinition(definition));
  }

  for (const definition of discovery.user) {
    merged.set(definition.name, sanitizeAgentDefinition(definition));
  }

  for (const definition of discovery.project) {
    merged.set(definition.name, sanitizeAgentDefinition(definition));
  }

  return [...merged.values()];
}

function resolveAgentDefinition(agentName, cwd = PROJECT_ROOT) {
  const definitions = loadAgentDefinitions(cwd);
  const byName = definitions.find((definition) => definition.name === agentName);
  if (byName) return byName;

  return (
    definitions.find((definition) => path.basename(definition.filePath, ".md") === agentName) ??
    null
  );
}

function formatDispatchSummary(result) {
  return formatDispatchSyncText(result);
}

function expandTilde(value) {
  return value.startsWith("~/")
    ? path.join(process.env.HOME ?? os.homedir(), value.slice(2))
    : value;
}

function getSubagentSessionRoot(parentSessionFile) {
  if (parentSessionFile) {
    const baseName = path.basename(parentSessionFile, ".jsonl");
    const sessionsDir = path.dirname(parentSessionFile);
    return path.join(sessionsDir, baseName);
  }

  return path.join(os.tmpdir(), "pi-dispatch-session-root");
}

function createSubagentState() {
  return {
    baseCwd: PROJECT_ROOT,
    currentSessionId: null,
    asyncJobs: new Map(),
    foregroundControls: new Map(),
    lastForegroundControlId: null,
    cleanupTimers: new Map(),
    lastUiContext: null,
    poller: null,
    completionSeen: new Map(),
    watcher: null,
    watcherRestartTimer: null,
    resultFileCoalescer: {
      schedule: () => false,
      clear: () => {},
    },
  };
}

function createDispatchExecutor(pi, syntheticAgents) {
  return createSubagentExecutor({
    pi,
    state: createSubagentState(),
    config: {},
    asyncByDefault: false,
    tempArtifactsDir: getArtifactsDir(null),
    getSubagentSessionRoot,
    expandTilde,
    discoverAgents: () => ({ agents: syntheticAgents }),
  });
}

function buildSyntheticAgentDefinition(agentDefinition, taskPlan) {
  return sanitizeAgentDefinition({
    ...agentDefinition,
    name: taskPlan.syntheticAgent,
    inheritProjectContext: taskPlan.projectContext.effective === "inherit",
    skills:
      taskPlan.skills === false
        ? []
        : taskPlan.skills ?? agentDefinition.skills ?? [],
  });
}

function groupTaskPlansByContext(taskPlans) {
  const groups = new Map();

  for (const plan of taskPlans) {
    const key = plan.context ?? "fresh";
    const current = groups.get(key) ?? [];
    current.push(plan);
    groups.set(key, current);
  }

  return [...groups.entries()].map(([context, plans]) => ({ context, plans }));
}

function inferSingleStatus(result, fallbackError) {
  if (result?.detached) return "detached";
  if (result?.exitCode === 0) return "completed";
  if (result?.error || fallbackError) return "failed";
  return "completed";
}

function normalizeGroupResult(groupPlans, toolResult, groupError) {
  const detailResults = Array.isArray(toolResult?.details?.results)
    ? toolResult.details.results
    : [];

  return groupPlans.map((plan, index) => {
    const result = detailResults[index];
    const artifacts = result?.artifactPaths
      ? Object.values(result.artifactPaths)
      : [];

    return {
      taskId: plan.taskId,
      agent: plan.agent,
      status: inferSingleStatus(result, groupError),
      summary:
        summarizeDispatchResult(result) ||
        summarizeDispatchResult({ error: groupError?.message }) ||
        "Dispatch task completed.",
      finalOutput: result?.finalOutput,
      artifactPaths: result?.artifactPaths,
      sessionFile: result?.sessionFile,
      savedOutputPath: result?.savedOutputPath,
      artifacts,
      error:
        result?.error || groupError
          ? { message: String(result?.error ?? groupError?.message ?? "Dispatch task failed.") }
          : null,
    };
  });
}

function buildAggregateSummary(results) {
  const completed = results.filter((item) => item.status === "completed").length;
  const failed = results.filter((item) => item.status === "failed").length;
  const detached = results.filter((item) => item.status === "detached").length;
  return `Completed ${completed}/${results.length} tasks; failed ${failed}; detached ${detached}.`;
}

async function delegateDispatch(pi, ctx, signal, onUpdate, request) {
  const runId = crypto.randomUUID();
  const mode = request.mode ?? "sync";

  if (mode === "async") {
    return {
      runId,
      mode,
      results: request.tasks.map((task, index) => ({
        taskId: String(index + 1),
        agent: task.agent,
        status: "blocked",
        summary: "async is reserved in v1 and is not fully specified by this baseline.",
        artifacts: [],
        error: {
          message: "Async dispatch is intentionally deferred in the v1 baseline.",
        },
      })),
      aggregateSummary: "Async dispatch is reserved for a later change.",
    };
  }

  const taskPlans = [];
  for (const [index, task] of request.tasks.entries()) {
    const lookupCwd = task.cwd ? path.resolve(ctx.cwd, task.cwd) : ctx.cwd;
    const agentDefinition = resolveAgentDefinition(task.agent, lookupCwd);
    if (!agentDefinition) {
      const diagnostic = buildMissingAgentDiagnostic(task.agent, loadAgentDefinitions(lookupCwd));
      return {
        runId,
        mode,
        results: request.tasks.map((item, fallbackIndex) => ({
          taskId: String(fallbackIndex + 1),
          agent: item.agent,
          status: fallbackIndex === index ? "failed" : "blocked",
          summary:
            fallbackIndex === index
              ? diagnostic.summary
              : "Blocked because an earlier task referenced an agent outside dispatch scope.",
          artifacts: [],
          error:
            fallbackIndex === index
              ? { message: diagnostic.error }
              : null,
        })),
        aggregateSummary: diagnostic.summary,
      };
    }

    taskPlans.push({
      taskId: String(index + 1),
      agentDefinition,
      ...serializeTaskPlan(task, agentDefinition, runId, String(index + 1)),
    });
  }

  const groupedPlans = groupTaskPlansByContext(taskPlans);
  const normalizedResults = [];

  for (const group of groupedPlans) {
    const executor = createDispatchExecutor(
      pi,
      group.plans.map((plan) => buildSyntheticAgentDefinition(plan.agentDefinition, plan))
    );

    try {
      const toolResult = await executor.execute(
        `dispatch-${runId}-${group.context}`,
        {
          tasks: group.plans.map((plan) => ({
            agent: plan.syntheticAgent,
            task: plan.task,
            cwd: plan.cwd,
            ...(plan.reads !== undefined ? { reads: plan.reads } : {}),
            ...(plan.skills !== undefined ? { skill: plan.skills } : {}),
            ...(plan.model ? { model: plan.model } : {}),
          })),
          context: group.context,
          async: false,
          clarify: false,
          cwd: PROJECT_ROOT,
        },
        signal,
        onUpdate,
        ctx
      );

      normalizedResults.push(...normalizeGroupResult(group.plans, toolResult, null));
    } catch (error) {
      normalizedResults.push(
        ...normalizeGroupResult(
          group.plans,
          null,
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }
  }

  normalizedResults.sort((left, right) => Number(left.taskId) - Number(right.taskId));

  return {
    runId,
    mode,
    results: normalizedResults,
    aggregateSummary: buildAggregateSummary(normalizedResults),
  };
}

export default function registerSubagentDispatchExtension(pi) {
  const availableAgents = loadAgentDefinitions(PROJECT_ROOT);

  pi.registerTool({
    name: "dispatch",
    description: buildDispatchToolDescription(availableAgents),
    parameters: DispatchRequestSchema,
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const result = await delegateDispatch(pi, ctx, signal, onUpdate, params);

      return {
        content: [
          {
            type: "text",
            text: formatDispatchSummary(result),
          },
        ],
        details: result,
      };
    },
  });

  pi.registerCommand("dispatch", {
    description: "Natural-language slash command for repository-owned subagent dispatch.",
    handler: async (args, ctx) => {
      const message = buildDispatchUserMessage(args, loadAgentDefinitions(ctx.cwd));
      if (!message) {
        ctx.ui.notify(
          "Usage: /dispatch <natural-language task description>",
          "warning"
        );
        return;
      }

      if (ctx.isIdle()) {
        pi.sendUserMessage(message);
        return;
      }

      pi.sendUserMessage(message, { deliverAs: "followUp" });
      ctx.ui.notify("Dispatch request queued as a follow-up.", "info");
    },
  });
}
