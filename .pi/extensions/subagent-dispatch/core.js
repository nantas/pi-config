import fs from "node:fs";
import path from "node:path";

export function normalizeStringList(input) {
  if (input === false) return false;
  if (input === undefined || input === null || input === true) return undefined;

  const values = Array.isArray(input)
    ? input
    : String(input)
        .split(",")
        .map((entry) => entry.trim());

  const normalized = [...new Set(values.map((entry) => String(entry).trim()).filter(Boolean))];
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeSkillNames(input) {
  if (input === false) return false;
  if (input === undefined || input === null || input === true) return undefined;

  if (Array.isArray(input)) {
    const normalized = [...new Set(input.map((entry) => String(entry).trim()).filter(Boolean))];
    return normalized.length > 0 ? normalized : undefined;
  }

  const trimmed = String(input).trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return normalizeSkillNames(parsed);
    } catch {
      // Fall back to comma splitting.
    }
  }

  return normalizeStringList(trimmed);
}

export function normalizeProjectContext(taskContext, agentDefinition) {
  const requested = taskContext ?? "default";
  const effective =
    requested === "default"
      ? agentDefinition.inheritProjectContext
        ? "inherit"
        : "strip"
      : requested;

  return { requested, effective };
}

export function sanitizeAgentDefinition(agentDefinition) {
  if (!agentDefinition || typeof agentDefinition !== "object") return agentDefinition;

  const next = { ...agentDefinition };
  const normalizedExtensions = normalizeStringList(next.extensions);
  if (
    normalizedExtensions === undefined ||
    (Array.isArray(normalizedExtensions) && normalizedExtensions.every((entry) => entry === "[]"))
  ) {
    delete next.extensions;
  } else {
    next.extensions = normalizedExtensions;
  }

  const normalizedSkills = normalizeSkillNames(next.skills);
  if (normalizedSkills === undefined) {
    delete next.skills;
  } else {
    next.skills = normalizedSkills;
  }

  return next;
}

export function buildSyntheticAgentName(agentName, taskId) {
  return `${agentName}__dispatch_${taskId}`;
}

export function buildAvailableAgentsSummary(agentDefinitions) {
  const definitions = Array.isArray(agentDefinitions) ? agentDefinitions : [];
  if (definitions.length === 0) {
    return "No dispatch agents are currently available.";
  }

  const lines = definitions.map((definition) => {
    const source = definition.source ?? "unknown";
    const description = String(definition.description ?? "").trim();
    return description
      ? `- ${definition.name} (${source}): ${description}`
      : `- ${definition.name} (${source})`;
  });

  return `Available dispatch agents right now:\n${lines.join("\n")}`;
}

export function buildDispatchToolDescription(agentDefinitions) {
  return [
    "Repository-owned subagent entrypoint.",
    "Only execute agents listed in the current dispatch scope; do not invent agent names.",
    "If unsure which agent fits, choose from the available list below instead of guessing.",
    buildAvailableAgentsSummary(agentDefinitions),
  ].join("\n\n");
}

export function buildMissingAgentDiagnostic(agentName, agentDefinitions) {
  const available = Array.isArray(agentDefinitions)
    ? agentDefinitions.map((definition) => definition.name).sort()
    : [];
  const availableText = available.length > 0 ? available.join(", ") : "(none)";

  return {
    summary: `Agent '${agentName}' is not in dispatch scope. Available agents: ${availableText}.`,
    error: `Missing agent in dispatch scope: ${agentName}. Available agents: ${availableText}.`,
  };
}

export function getDispatchResultText(result) {
  const directText = String(result?.finalOutput ?? result?.error ?? result?.savedOutputPath ?? "")
    .trim();
  if (directText) {
    return directText;
  }

  const outputPath = result?.savedOutputPath || result?.artifactPaths?.outputPath;
  if (typeof outputPath === "string" && outputPath.trim()) {
    try {
      const artifactText = fs.readFileSync(outputPath, "utf-8").trim();
      if (artifactText) {
        return artifactText;
      }
    } catch {
      // Fall through to default text.
    }
  }

  return "";
}

export function summarizeDispatchResult(result) {
  const directText = getDispatchResultText(result).replace(/\s+/g, " ");
  if (directText) {
    return directText.length > 240 ? `${directText.slice(0, 237)}...` : directText;
  }

  const outputPath = result?.artifactPaths?.outputPath;
  if (typeof outputPath === "string" && outputPath.trim()) {
    try {
      const artifactText = fs.readFileSync(outputPath, "utf-8").trim().replace(/\s+/g, " ");
      if (artifactText) {
        return artifactText.length > 240 ? `${artifactText.slice(0, 237)}...` : artifactText;
      }
    } catch {
      // Fall through to default summary.
    }
    return outputPath;
  }

  return "Subagent completed.";
}

export function formatDispatchSyncText(dispatchResult) {
  const header = [
    `dispatch ${dispatchResult.runId} (${dispatchResult.mode})`,
    dispatchResult.aggregateSummary,
  ];

  const sections = (dispatchResult.results ?? []).map((item) => {
    const lines = [`## Task ${item.taskId}: ${item.agent} (${String(item.status ?? "").toUpperCase()})`];
    const outputText = getDispatchResultText(item);
    lines.push(outputText || item.summary || "(no output)");

    if (item.savedOutputPath) {
      lines.push(`Saved output: \`${item.savedOutputPath}\``);
    }
    if (item.artifactPaths?.outputPath) {
      lines.push(`Artifact output: \`${item.artifactPaths.outputPath}\``);
    }
    if (item.sessionFile) {
      lines.push(`Session: \`${item.sessionFile}\``);
    }

    return lines.join("\n\n");
  });

  return [...header, ...sections].join("\n\n");
}

export function shouldSkipGlobalDispatchExtensionRegistration(input) {
  const extensionFile = path.resolve(String(input?.extensionFile ?? ""));
  const cwd = path.resolve(String(input?.cwd ?? process.cwd()));
  const globalPrefix = path.join(process.env.HOME ?? "", ".pi", "agent", "extensions", "subagent-dispatch");
  const projectExtensionFile = path.join(cwd, ".pi", "extensions", "subagent-dispatch", "index.ts");

  if (!extensionFile || !cwd || !globalPrefix) return false;
  if (!extensionFile.startsWith(globalPrefix)) return false;
  if (extensionFile === projectExtensionFile) return false;

  return fs.existsSync(projectExtensionFile);
}

export function serializeTaskPlan(task, agentDefinition, runId, taskId) {
  const projectContext = normalizeProjectContext(task.projectContext, agentDefinition);
  const taskSkills = normalizeSkillNames(task.skills);
  const agentSkills = normalizeSkillNames(agentDefinition.skills);

  let skills;
  if (taskSkills === false) {
    skills = false;
  } else {
    const merged = [...new Set([...(agentSkills ?? []), ...(taskSkills ?? [])])];
    skills = merged.length > 0 ? merged : undefined;
  }

  return {
    runId,
    taskId,
    agent: agentDefinition.name,
    syntheticAgent: buildSyntheticAgentName(agentDefinition.name, taskId),
    task: task.task,
    cwd: task.cwd ?? agentDefinition.cwd,
    context: task.context ?? "fresh",
    reads: normalizeStringList(task.reads),
    skills,
    model: task.model,
    projectContext,
    policy: {
      systemPromptMode: agentDefinition.systemPromptMode,
      tools: agentDefinition.tools ?? [],
      extensions: agentDefinition.extensions ?? [],
      inheritProjectContext: agentDefinition.inheritProjectContext,
      inheritSkills: agentDefinition.inheritSkills,
      skills: agentSkills,
    },
  };
}

export function buildDispatchUserMessage(args, agentDefinitions) {
  const request = String(args ?? "").trim();
  if (!request) return null;

  return [
    {
      type: "text",
      text:
        "Dispatch request from /dispatch. Interpret the following user task in natural language, decide whether it should stay local or be decomposed into one or more delegated subagent tasks, and if delegation is needed call the repository-owned dispatch tool yourself. Do not ask the user to write JSON or hand-author tasks[]. Do not bypass the repository-owned dispatch tool with ad-hoc subagent flows. Only choose agents that are explicitly listed in the current dispatch scope below.",
    },
    {
      type: "text",
      text: buildAvailableAgentsSummary(agentDefinitions),
    },
    {
      type: "text",
      text: `User request:\n${request}`,
    },
  ];
}
