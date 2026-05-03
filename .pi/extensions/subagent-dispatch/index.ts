import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Type } from "@sinclair/typebox";
import { discoverAgentsAll } from "pi-subagents/agents.ts";
import { getArtifactsDir } from "pi-subagents/artifacts.ts";
import { createSubagentExecutor } from "pi-subagents/subagent-executor.ts";
import {
  buildAvailableAgentsSummary,
  buildDispatchToolDescription,
  buildDispatchUserMessage,
  buildMissingAgentDiagnostic,
  formatDispatchSyncText,
  sanitizeAgentDefinition,
  serializeTaskPlan,
  shouldSkipGlobalDispatchExtensionRegistration,
  summarizeDispatchResult,
} from "./core.js";

const PROJECT_ROOT = process.cwd();
const EXTENSION_FILE = fileURLToPath(import.meta.url);

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
  output: Type.Optional(Type.Union([Type.String(), Type.Boolean()])),
  count: Type.Optional(Type.Integer({ minimum: 1 })),
});

const ChainParallelItemSchema = Type.Object({
  agent: Type.String({ minLength: 1 }),
  task: Type.String({ minLength: 1 }),
  output: Type.Optional(Type.Union([Type.String(), Type.Boolean()])),
  reads: Type.Optional(
    Type.Unsafe({
      type: ["array", "boolean"],
      items: { type: "string" },
    })
  ),
  model: Type.Optional(Type.String()),
  cwd: Type.Optional(Type.String()),
  skills: Type.Optional(
    Type.Unsafe({
      type: ["string", "array", "boolean"],
      items: { type: "string" },
    })
  ),
  count: Type.Optional(Type.Integer({ minimum: 1 })),
});

const ChainItemSchema = Type.Union([
  Type.Object({
    agent: Type.String({ minLength: 1 }),
    task: Type.String({ minLength: 1 }),
    output: Type.Optional(Type.Union([Type.String(), Type.Boolean()])),
    reads: Type.Optional(
      Type.Unsafe({
        type: ["array", "boolean"],
        items: { type: "string" },
      })
    ),
    model: Type.Optional(Type.String()),
    cwd: Type.Optional(Type.String()),
    skills: Type.Optional(
      Type.Unsafe({
        type: ["string", "array", "boolean"],
        items: { type: "string" },
      })
    ),
    concurrency: Type.Optional(Type.Integer({ minimum: 1 })),
  }),
  Type.Object({
    parallel: Type.Array(ChainParallelItemSchema, { minItems: 1 }),
    concurrency: Type.Optional(Type.Integer({ minimum: 1 })),
  }),
]);

const DispatchRequestSchema = Type.Object({
  mode: Type.Optional(Type.Union([Type.Literal("sync"), Type.Literal("async")])),
  tasks: Type.Optional(Type.Array(DispatchTaskSchema, { minItems: 1 })),
  chain: Type.Optional(Type.Array(ChainItemSchema, { minItems: 1 })),
  action: Type.Optional(Type.Union([Type.Literal("list"), Type.Literal("get"), Type.Literal("status")])),
  concurrency: Type.Optional(Type.Integer({ minimum: 1 })),
  agentScope: Type.Optional(Type.Union([Type.Literal("user"), Type.Literal("project"), Type.Literal("both")])),
  id: Type.Optional(Type.String()),
  agent: Type.Optional(Type.String()),
});

function loadAgentDefinitions(cwd = PROJECT_ROOT, scope = "both") {
  const discovery = discoverAgentsAll(cwd);
  const merged = new Map();

  for (const definition of discovery.builtin) {
    merged.set(definition.name, sanitizeAgentDefinition(definition));
  }

  if (scope === "both" || scope === "user") {
    for (const definition of discovery.user) {
      merged.set(definition.name, sanitizeAgentDefinition(definition));
    }
  }

  if (scope === "both" || scope === "project") {
    for (const definition of discovery.project) {
      merged.set(definition.name, sanitizeAgentDefinition(definition));
    }
  }

  return [...merged.values()];
}

function resolveAgentDefinition(agentName, cwd = PROJECT_ROOT, scope = "both") {
  const definitions = loadAgentDefinitions(cwd, scope);
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

function expandTaskCounts(tasks) {
  return tasks.flatMap((task, index) => {
    const count = task.count ?? 1;
    return Array.from({ length: count }, (_, i) => ({
      ...task,
      _originalIndex: index,
      _instance: i + 1,
    }));
  });
}

function resolveOutputPath(output, baseCwd, taskCwd) {
  if (output === false || output === undefined || output === null) return undefined;
  if (output === true) return undefined;
  const raw = String(output).trim();
  if (!raw) return undefined;
  if (raw.startsWith("~")) return expandTilde(raw);
  if (path.isAbsolute(raw)) return raw;
  const effectiveCwd = taskCwd ? path.resolve(baseCwd, taskCwd) : baseCwd;
  return path.resolve(effectiveCwd, raw);
}

async function handleAction(request, ctx) {
  const scope = request.agentScope ?? "both";

  if (request.action === "list") {
    const agents = loadAgentDefinitions(ctx.cwd, scope);
    const text = buildAvailableAgentsSummary(agents);
    return {
      runId: crypto.randomUUID(),
      mode: "management",
      executionMode: "management",
      results: [{
        taskId: "1",
        agent: "list",
        status: "completed",
        summary: text,
        finalOutput: text,
        artifacts: [],
        error: null,
      }],
      aggregateSummary: `${agents.length} agent(s) available.`,
    };
  }

  if (request.action === "get") {
    if (!request.agent) {
      return {
        runId: crypto.randomUUID(),
        mode: "management",
        executionMode: "management",
        results: [{
          taskId: "1",
          agent: "(none)",
          status: "failed",
          summary: "Missing agent parameter for get action.",
          artifacts: [],
          error: { message: "Missing agent parameter for get action." },
        }],
        aggregateSummary: "Failed: missing agent parameter.",
      };
    }
    const agent = resolveAgentDefinition(request.agent, ctx.cwd, scope);
    if (!agent) {
      const diagnostic = buildMissingAgentDiagnostic(request.agent, loadAgentDefinitions(ctx.cwd, scope));
      return {
        runId: crypto.randomUUID(),
        mode: "management",
        executionMode: "management",
        results: [{
          taskId: "1",
          agent: request.agent,
          status: "failed",
          summary: diagnostic.summary,
          artifacts: [],
          error: { message: diagnostic.error },
        }],
        aggregateSummary: diagnostic.summary,
      };
    }
    const detailText = JSON.stringify(agent, null, 2);
    return {
      runId: crypto.randomUUID(),
      mode: "management",
      executionMode: "management",
      results: [{
        taskId: "1",
        agent: agent.name,
        status: "completed",
        summary: `${agent.name} (${agent.source})`,
        finalOutput: detailText,
        artifacts: [],
        error: null,
      }],
      aggregateSummary: `Agent details for ${agent.name}.`,
    };
  }

  if (request.action === "status") {
    const runId = request.id ?? "(unknown)";
    return {
      runId: crypto.randomUUID(),
      mode: "management",
      executionMode: "management",
      results: [{
        taskId: "1",
        agent: "status",
        status: "completed",
        summary: `Status query for run ${runId}. Async status queries require the subagent extension status infrastructure.`,
        artifacts: [],
        error: null,
      }],
      aggregateSummary: `Status query for run ${runId}. Use the subagent tool for detailed async status.`,
    };
  }

  return {
    runId: crypto.randomUUID(),
    mode: "management",
    executionMode: "management",
    results: [{
      taskId: "1",
      agent: "(none)",
      status: "failed",
      summary: `Unknown action: ${request.action}`,
      artifacts: [],
      error: { message: `Unknown action: ${request.action}` },
    }],
    aggregateSummary: `Unknown action: ${request.action}`,
  };
}

function collectChainAgents(chain, runId) {
  const agents = new Map();
  for (let stepIndex = 0; stepIndex < chain.length; stepIndex++) {
    const step = chain[stepIndex];
    if (step.parallel) {
      for (let pIndex = 0; pIndex < step.parallel.length; pIndex++) {
        const item = step.parallel[pIndex];
        const key = `${item.agent}__dispatch_chain_${runId}_s${stepIndex}_p${pIndex}`;
        if (!agents.has(key)) {
          agents.set(key, { original: item.agent, key });
        }
      }
    } else {
      const key = `${step.agent}__dispatch_chain_${runId}_s${stepIndex}`;
      if (!agents.has(key)) {
        agents.set(key, { original: step.agent, key });
      }
    }
  }
  return agents;
}

async function executeChain(pi, ctx, signal, onUpdate, request, runId) {
  const scope = request.agentScope ?? "both";
  const chainDir = path.join(os.tmpdir(), "pi-dispatch-chain", runId);
  fs.mkdirSync(chainDir, { recursive: true });

  // Resolve all agents referenced in the chain
  const agentMap = new Map();
  const referencedAgents = new Set();
  for (const step of request.chain) {
    if (step.parallel) {
      for (const item of step.parallel) referencedAgents.add(item.agent);
    } else {
      referencedAgents.add(step.agent);
    }
  }

  for (const agentName of referencedAgents) {
    const agentDef = resolveAgentDefinition(agentName, ctx.cwd, scope);
    if (!agentDef) {
      const diagnostic = buildMissingAgentDiagnostic(agentName, loadAgentDefinitions(ctx.cwd, scope));
      return {
        runId,
        mode: request.mode ?? "sync",
        results: request.chain.map((step, i) => ({
          taskId: String(i + 1),
          agent: step.agent || step.parallel?.[0]?.agent || "(unknown)",
          status: i === 0 ? "failed" : "blocked",
          summary: i === 0 ? diagnostic.summary : "Blocked because an earlier step referenced an agent outside dispatch scope.",
          artifacts: [],
          error: i === 0 ? { message: diagnostic.error } : null,
        })),
        aggregateSummary: diagnostic.summary,
      };
    }
    agentMap.set(agentName, agentDef);
  }

  // Build pi-subagents compatible chain with synthetic agent names
  const syntheticAgentMap = new Map();
  const syntheticAgents = [];

  const chainSteps = [];
  for (let stepIndex = 0; stepIndex < request.chain.length; stepIndex++) {
    const step = request.chain[stepIndex];
    if (step.parallel) {
      const parallelTasks = [];
      for (let pIndex = 0; pIndex < step.parallel.length; pIndex++) {
        const item = step.parallel[pIndex];
        const syntheticName = `${item.agent}__dispatch_chain_${runId}_s${stepIndex}_p${pIndex}`;
        syntheticAgentMap.set(`${stepIndex}:${pIndex}`, syntheticName);
        if (!syntheticAgents.find((a) => a.name === syntheticName)) {
          const baseDef = agentMap.get(item.agent);
          syntheticAgents.push(sanitizeAgentDefinition({
            ...baseDef,
            name: syntheticName,
          }));
        }
        parallelTasks.push({
          agent: syntheticName,
          task: item.task,
          ...(item.cwd ? { cwd: item.cwd } : {}),
          ...(item.output !== undefined ? { output: item.output } : {}),
          ...(item.reads !== undefined ? { reads: item.reads } : {}),
          ...(item.model ? { model: item.model } : {}),
          ...(item.skills !== undefined ? { skill: item.skills } : {}),
          ...(item.count ? { count: item.count } : {}),
        });
      }
      chainSteps.push({
        parallel: parallelTasks,
        concurrency: step.concurrency ?? request.concurrency,
      });
    } else {
      const syntheticName = `${step.agent}__dispatch_chain_${runId}_s${stepIndex}`;
      syntheticAgentMap.set(`${stepIndex}`, syntheticName);
      if (!syntheticAgents.find((a) => a.name === syntheticName)) {
        const baseDef = agentMap.get(step.agent);
        syntheticAgents.push(sanitizeAgentDefinition({
          ...baseDef,
          name: syntheticName,
        }));
      }
      chainSteps.push({
        agent: syntheticName,
        task: step.task,
        ...(step.cwd ? { cwd: step.cwd } : {}),
        ...(step.output !== undefined ? { output: step.output } : {}),
        ...(step.reads !== undefined ? { reads: step.reads } : {}),
        ...(step.model ? { model: step.model } : {}),
        ...(step.skills !== undefined ? { skill: step.skills } : {}),
        ...(step.concurrency ? { concurrency: step.concurrency } : {}),
      });
    }
  }

  const executor = createDispatchExecutor(pi, syntheticAgents);

  try {
    const toolResult = await executor.execute(
      `dispatch-chain-${runId}`,
      {
        chain: chainSteps,
        task: request.chain[0]?.task ?? "",
        context: "fresh",
        async: request.mode === "async",
        clarify: false,
        chainDir,
        concurrency: request.concurrency,
      },
      signal,
      onUpdate,
      ctx
    );

    const detailResults = Array.isArray(toolResult?.details?.results)
      ? toolResult.details.results
      : [];

    const normalizedResults = detailResults.map((result, index) => {
      const step = request.chain[index] ?? request.chain[request.chain.length - 1];
      const agentName = step?.agent || step?.parallel?.map((p) => p.agent).join(", ") || "(unknown)";
      return {
        taskId: String(index + 1),
        agent: agentName,
        status: inferSingleStatus(result, null),
        summary: summarizeDispatchResult(result) || "Chain step completed.",
        finalOutput: result?.finalOutput,
        artifactPaths: result?.artifactPaths,
        sessionFile: result?.sessionFile,
        savedOutputPath: result?.savedOutputPath,
        artifacts: result?.artifactPaths ? Object.values(result.artifactPaths) : [],
        error: result?.error ? { message: String(result.error) } : null,
      };
    });

    return {
      runId,
      mode: request.mode ?? "sync",
      executionMode: "chain",
      results: normalizedResults,
      aggregateSummary: buildAggregateSummary(normalizedResults),
    };
  } catch (error) {
    return {
      runId,
      mode: request.mode ?? "sync",
      executionMode: "chain",
      results: request.chain.map((step, index) => ({
        taskId: String(index + 1),
        agent: step.agent || step.parallel?.map((p) => p.agent).join(", ") || "(unknown)",
        status: index === 0 ? "failed" : "blocked",
        summary: index === 0 ? String(error instanceof Error ? error.message : error) : "Blocked due to chain execution failure.",
        artifacts: [],
        error: index === 0 ? { message: String(error instanceof Error ? error.message : error) } : null,
      })),
      aggregateSummary: `Chain execution failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function executeTasks(pi, ctx, signal, onUpdate, request, runId) {
  const scope = request.agentScope ?? "both";
  const mode = request.mode ?? "sync";
  const tasks = request.tasks ?? [];
  const expandedTasks = expandTaskCounts(tasks);

  const taskPlans = [];
  for (const [index, task] of expandedTasks.entries()) {
    const lookupCwd = task.cwd ? path.resolve(ctx.cwd, task.cwd) : ctx.cwd;
    const agentDefinition = resolveAgentDefinition(task.agent, lookupCwd, scope);
    if (!agentDefinition) {
      const diagnostic = buildMissingAgentDiagnostic(task.agent, loadAgentDefinitions(lookupCwd, scope));
      return {
        runId,
        mode,
        executionMode: "tasks",
        results: expandedTasks.map((item, fallbackIndex) => ({
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

    const plan = {
      taskId: String(index + 1),
      agentDefinition,
      output: task.output,
      ...serializeTaskPlan(task, agentDefinition, runId, String(index + 1)),
    };
    // Ensure each count instance has a unique synthetic agent name
    if (task._instance > 1) {
      plan.syntheticAgent = `${plan.syntheticAgent}_i${task._instance}`;
    }
    taskPlans.push(plan);
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
            cwd: plan.cwd ? path.resolve(PROJECT_ROOT, plan.cwd) : PROJECT_ROOT,
            ...(plan.reads !== undefined ? { reads: plan.reads } : {}),
            ...(plan.skills !== undefined ? { skill: plan.skills } : {}),
            ...(plan.model ? { model: plan.model } : {}),
            ...(plan.output !== undefined ? { output: plan.output } : {}),
          })),
          context: group.context,
          async: mode === "async",
          clarify: false,
          concurrency: request.concurrency,
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
    executionMode: "tasks",
    results: normalizedResults,
    aggregateSummary: buildAggregateSummary(normalizedResults),
  };
}

async function delegateDispatch(pi, ctx, signal, onUpdate, request) {
  const runId = crypto.randomUUID();

  // Route: action management
  if (request.action) {
    return handleAction(request, ctx);
  }

  // Route: chain mode
  if (request.chain && request.chain.length > 0) {
    if (request.tasks && request.tasks.length > 0) {
      console.warn("[dispatch] Both 'chain' and 'tasks' provided; 'chain' takes precedence.");
    }
    return executeChain(pi, ctx, signal, onUpdate, request, runId);
  }

  // Route: tasks mode
  if (request.tasks && request.tasks.length > 0) {
    return executeTasks(pi, ctx, signal, onUpdate, request, runId);
  }

  return {
    runId,
    mode: request.mode ?? "sync",
    results: [{
      taskId: "1",
      agent: "(none)",
      status: "failed",
      summary: "No dispatch execution mode specified. Provide 'tasks', 'chain', or 'action'.",
      artifacts: [],
      error: { message: "No dispatch execution mode specified. Provide 'tasks', 'chain', or 'action'." },
    }],
    aggregateSummary: "Failed: no execution mode specified.",
  };
}

export default function registerSubagentDispatchExtension(pi) {
  if (
    shouldSkipGlobalDispatchExtensionRegistration({
      extensionFile: EXTENSION_FILE,
      cwd: PROJECT_ROOT,
    })
  ) {
    return;
  }

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
