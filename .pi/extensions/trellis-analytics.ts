/**
 * trellis-analytics — Passive telemetry extension for the Trellis framework.
 *
 * Tracks skill loads, phase context injection, and reference consumption
 * across Pi sessions. Uses stateless append-only writes to
 * `.trellis/.analytics/<YYYY-MM>/<sessionId>.jsonl` and registers a
 * `trellis_analytics` tool for querying the collected data.
 *
 * Design: open → write → fsync → close per event. No fd state, no lifecycle
 * dependency, no cross-turn state machines (except reference tracking).
 *
 * Capabilities: workflow-observability, context-consumption-tracking,
 * streaming-persistence, analysis-tool.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@earendil-works/pi-ai";
import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalyticsEvent {
  ts: string;
  session: string;
  event: string;
  data: Record<string, unknown>;
}

interface PendingCommand {
  command: string;
  phase: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoNow(): string {
  return new Date().toISOString();
}

/** Extract skill name from a SKILL.md path. */
function extractSkillFromPath(filePath: string): { skill: string; namespace: string } | null {
  // Match patterns like .agents/skills/gitnexus/gitnexus-debugging/SKILL.md
  // or .pi/skills/pkg-research/SKILL.md
  const match = filePath.match(
    /(?:\.agents|\.pi)\/skills\/([^/]+)\/([^/]+)\/SKILL\.md$/
  );
  if (match) {
    return { namespace: match[1], skill: `${match[1]}/${match[2]}` };
  }
  // Flat skills: .agents/skills/close-task/SKILL.md
  const flatMatch = filePath.match(
    /(?:\.agents|\.pi)\/skills\/([^/]+)\/SKILL\.md$/
  );
  if (flatMatch) {
    return { namespace: flatMatch[1], skill: flatMatch[1] };
  }
  return null;
}

/** Extract phase from trellis-load-phase-context command. */
function extractPhase(command: string): string | null {
  const match = command.match(/trellis-load-phase-context\s+--phase\s+(\w+)/);
  return match ? match[1] : null;
}

/** Extract file paths from === filepath === headers. */
function extractInjectedFiles(output: string): string[] {
  const files: string[] = [];
  const regex = /^=== (.+?) ===$/gm;
  let m;
  while ((m = regex.exec(output)) !== null) {
    files.push(m[1].trim());
  }
  return [...new Set(files)];
}

/** Parse [trellis-mode:xxx] groups and their file entries. */
function extractModeMap(output: string): Record<string, string[]> {
  const modeMap: Record<string, string[]> = {};
  const lines = output.split("\n");
  let currentMode = "";
  for (const line of lines) {
    const modeMatch = line.match(/^\[trellis-mode:(\w+)\]/);
    if (modeMatch) {
      currentMode = modeMatch[1];
      if (!modeMap[currentMode]) modeMap[currentMode] = [];
      continue;
    }
    if (currentMode) {
      const fileMatch = line.match(/^=== (.+?) ===$/);
      if (fileMatch) {
        modeMap[currentMode].push(fileMatch[1].trim());
      }
    }
  }
  return modeMap;
}

/** Parse [trellis-bound-change] line. */
function extractBoundChange(output: string): {
  change_id: string;
  schema: string;
  path: string;
  next_stage: string;
  bridge_workflow: string;
} | null {
  const match = output.match(
    /\[trellis-bound-change\]\s+change_id=(\S+)\s+schema=(\S+)\s+path=(\S+)\s+next_stage=(\S+)\s+bridge_workflow=(\S+)/
  );
  if (!match) return null;
  return {
    change_id: match[1],
    schema: match[2],
    path: match[3],
    next_stage: match[4],
    bridge_workflow: match[5],
  };
}

/** Extract references from inline content (file paths and known skill names). */
function extractReferences(
  output: string,
  injectedFiles: Set<string>,
  knownSkillNames: ReadonlySet<string>
): { ref: string; type: "file" | "skill" }[] {
  const refs: { ref: string; type: "file" | "skill" }[] = [];
  const seen = new Set<string>();

  // Extract file paths: .md, .yaml, .json, .ts, .cs
  const fileRegex = /\b[\w./-]+\.(md|yaml|json|ts|cs)\b/g;
  let m;
  while ((m = fileRegex.exec(output)) !== null) {
    const ref = m[0];
    if (!seen.has(ref) && !injectedFiles.has(ref)) {
      seen.add(ref);
      refs.push({ ref, type: "file" });
    }
  }

  // Extract known skill names from inline content
  for (const skillName of knownSkillNames) {
    if (output.includes(skillName) && !seen.has(skillName)) {
      seen.add(skillName);
      refs.push({ ref: skillName, type: "skill" });
    }
  }

  return refs;
}

/** Extract invoke targets from [trellis-mode:invoke] group. */
function extractInvokeTargets(output: string): string[] {
  const targets: string[] = [];
  const lines = output.split("\n");
  let inInvoke = false;
  for (const line of lines) {
    if (line.match(/^\[trellis-mode:invoke\]/)) {
      inInvoke = true;
      continue;
    }
    if (line.match(/^\[trellis-mode:/)) {
      inInvoke = false;
      continue;
    }
    if (inInvoke) {
      const fileMatch = line.match(/^=== (.+?) ===$/);
      if (fileMatch) {
        targets.push(fileMatch[1].trim());
      }
    }
  }
  return targets;
}

// ---------------------------------------------------------------------------
// Stateless Analytics Writer
// ---------------------------------------------------------------------------

/** Resolve the analytics file path for a session: `.trellis/.analytics/<YYYY-MM>/<sessionId>.jsonl` */
function resolveAnalyticsPath(cwd: string, sessionId: string): string {
  const now = new Date();
  const monthDir = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return path.join(cwd, ".trellis", ".analytics", monthDir, `${sessionId}.jsonl`);
}

/** Write a single analytics event. Stateless: open → write → fsync → close. */
function writeAnalytics(
  cwd: string,
  sessionId: string,
  eventType: string,
  data: Record<string, unknown>
): void {
  const filePath = resolveAnalyticsPath(cwd, sessionId);
  const record: AnalyticsEvent = {
    ts: isoNow(),
    session: sessionId,
    event: eventType,
    data,
  };
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    const fd = fs.openSync(filePath, "a");
    fs.writeSync(fd, JSON.stringify(record) + "\n");
    fs.fsyncSync(fd);
    fs.closeSync(fd);
  } catch (err) {
    console.error("[trellis-analytics] write error:", err);
  }
}

// ---------------------------------------------------------------------------
// Main Extension
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  // Sentinel: only activate in Trellis-managed repositories
  const sentinelPath = path.join(process.cwd(), ".trellis", "config.yaml");
  if (!fs.existsSync(sentinelPath)) return;

  // Dedup guard
  const _key = "__pi_ext_trellis_analytics_loaded";
  if ((globalThis as any)[_key]) return;
  (globalThis as any)[_key] = true;

  // State
  const cwd = process.cwd();
  let sessionId: string | null = null;
  const pendingCommands = new Map<string, PendingCommand>();
  const knownReferences = new Map<string, { ref: string; type: string }>();
  const loadedSkills = new Set<string>();
  // Dynamic set of known skill names for reference extraction
  const knownSkillNames = new Set<string>();

  /** Lazily resolve session ID from session manager. */
  function ensureSessionId(ctx: any): string {
    if (sessionId) return sessionId;
    const sessionFile = ctx.sessionManager.getSessionFile();
    sessionId = sessionFile
      ? path.basename(sessionFile, ".jsonl")
      : `session-${Date.now()}`;
    return sessionId;
  }

  // ---------------------------------------------------------------------------
  // Events: tool_call — skill tracking + command detection
  // ---------------------------------------------------------------------------
  pi.on("tool_call", async (event, ctx) => {
    const sid = ensureSessionId(ctx);

    // --- Skill load tracking (read tool, SKILL.md path) ---
    if (event.toolName === "read") {
      const filePath: string = (event.input as any).path ?? "";
      if (filePath.endsWith("SKILL.md") || filePath.includes("/SKILL.md")) {
        const skillInfo = extractSkillFromPath(filePath);
        if (skillInfo) {
          // Dedup: only write skill_load on first load
          if (!loadedSkills.has(skillInfo.skill)) {
            loadedSkills.add(skillInfo.skill);
            knownSkillNames.add(skillInfo.skill);
            const shortName = skillInfo.skill.split("/").pop()!;
            if (shortName !== skillInfo.skill) knownSkillNames.add(shortName);

            writeAnalytics(cwd, sid, "skill_load", {
              skill: skillInfo.skill,
              namespace: skillInfo.namespace,
              path: filePath,
              source: "autonomous",
            });
          }
        }
      }

      // Check if this read matches a known reference (precise suffix match)
      for (const [key, refData] of knownReferences.entries()) {
        if (refData.type === "file") {
          const nPath = filePath.replace(/\\/g, "/");
          const nRef = refData.ref.replace(/\\/g, "/");
          if (
            nPath === nRef ||
            (nPath.endsWith(nRef) && nPath[nPath.length - nRef.length - 1] === "/")
          ) {
            writeAnalytics(cwd, sid, "reference_followed", {
              ref: refData.ref,
              type: refData.type,
              read: true,
            });
            knownReferences.delete(key);
          }
        }
      }
    }

    // --- Phase context injection detection (bash tool) ---
    if (event.toolName === "bash") {
      const command: string = (event.input as any).command ?? "";
      if (command.includes("trellis-load-phase-context")) {
        const phase = extractPhase(command);
        if (phase) {
          pendingCommands.set(event.toolCallId, {
            command,
            phase,
          });
        }
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Events: tool_result — parse phase context output
  // ---------------------------------------------------------------------------
  pi.on("tool_result", async (event, _ctx) => {
    if (!sessionId) return;

    const pending = pendingCommands.get(event.toolCallId);
    if (!pending) return;
    pendingCommands.delete(event.toolCallId);

    // Extract text content from the result
    const content = event.content;
    let outputText = "";
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part.type === "text") {
          outputText += part.text ?? "";
        }
      }
    } else if (typeof content === "string") {
      outputText = content;
    }

    if (!outputText) return;

    // Parse the output
    const injectedFiles = extractInjectedFiles(outputText);
    const modeMap = extractModeMap(outputText);
    const invokeTargets = extractInvokeTargets(outputText);
    const boundChange = extractBoundChange(outputText);
    const injectedFileSet = new Set(injectedFiles);
    const references = extractReferences(outputText, injectedFileSet, knownSkillNames);

    // Record references for tracking
    for (const ref of references) {
      knownReferences.set(ref.ref, ref);
    }

    writeAnalytics(cwd, sessionId, "context_injection_parsed", {
      phase: pending.phase,
      injectedFiles,
      modeMap,
      invokeTargets,
      boundChange,
      referenceCount: references.length,
    });
  });

  // ---------------------------------------------------------------------------
  // Tool: trellis_analytics
  // ---------------------------------------------------------------------------
  pi.registerTool({
    name: "trellis_analytics",
    label: "Trellis Analytics",
    description:
      "Query Trellis analytics data. Actions: summary, context-consumption, timeline, list-sessions.",
    parameters: Type.Object({
      action: StringEnum([
        "summary",
        "context-consumption",
        "timeline",
        "list-sessions",
      ] as const),
      session_id: Type.Optional(
        Type.String({ description: "Filter by Pi session ID" })
      ),
      limit: Type.Optional(
        Type.Number({ description: "Max records to return (default 50)" })
      ),
    }),
    async execute(
      _toolCallId: string,
      params: {
        action: string;
        session_id?: string;
        limit?: number;
      },
      _signal: AbortSignal,
      _onUpdate?: (update: any) => void,
      _ctx?: any
    ) {
      const analyticsDir = path.join(cwd, ".trellis", ".analytics");
      const limit = params.limit ?? 50;

      try {
        switch (params.action) {
          case "summary":
            return handleSummary(analyticsDir, params, limit);
          case "context-consumption":
            return handleContextConsumption(analyticsDir, params, limit);
          case "timeline":
            return handleTimeline(analyticsDir, params, limit);
          case "list-sessions":
            return handleListSessions(analyticsDir);
          default:
            return {
              content: [
                {
                  type: "text",
                  text: `Unknown action: ${params.action}. Use: summary, context-consumption, timeline, list-sessions`,
                },
              ],
            };
        }
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  });

  // ---------------------------------------------------------------------------
  // Tool action handlers
  // ---------------------------------------------------------------------------

  function readJsonlLines(
    filePath: string,
    maxLines?: number
  ): AnalyticsEvent[] {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content
      .split("\n")
      .filter((l) => l.trim());
    const sliced = maxLines ? lines.slice(-maxLines) : lines;
    const events: AnalyticsEvent[] = [];
    for (const line of sliced) {
      try {
        events.push(JSON.parse(line));
      } catch {
        // skip malformed lines
      }
    }
    return events;
  }

  /** Scan analytics directory for JSONL files in both new and legacy formats. */
  function findAllJsonlFiles(
    analyticsDir: string
  ): { filePath: string; sessionId: string }[] {
    const results: { filePath: string; sessionId: string }[] = [];

    if (!fs.existsSync(analyticsDir)) return results;

    // New format: <YYYY-MM>/<sessionId>.jsonl
    for (const entry of fs.readdirSync(analyticsDir)) {
      const fullPath = path.join(analyticsDir, entry);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }
      if (stat.isDirectory() && /^\d{4}-\d{2}$/.test(entry)) {
        for (const file of fs.readdirSync(fullPath)) {
          if (file.endsWith(".jsonl")) {
            results.push({
              filePath: path.join(fullPath, file),
              sessionId: file.replace(".jsonl", ""),
            });
          }
        }
      }
    }

    // Legacy format: orphans/<sessionId>.jsonl
    const orphanDir = path.join(analyticsDir, "orphans");
    if (fs.existsSync(orphanDir)) {
      for (const file of fs.readdirSync(orphanDir)) {
        if (file.endsWith(".jsonl")) {
          results.push({
            filePath: path.join(orphanDir, file),
            sessionId: file.replace(".jsonl", ""),
          });
        }
      }
    }

    // Legacy format: tasks/<taskSlug>/events.jsonl
    const tasksDir = path.join(analyticsDir, "tasks");
    if (fs.existsSync(tasksDir)) {
      for (const taskDir of fs.readdirSync(tasksDir)) {
        const eventsFile = path.join(tasksDir, taskDir, "events.jsonl");
        if (fs.existsSync(eventsFile)) {
          results.push({
            filePath: eventsFile,
            sessionId: taskDir,
          });
        }
      }
    }

    return results;
  }

  function handleSummary(
    analyticsDir: string,
    params: { session_id?: string },
    _limit: number
  ) {
    const files = findAllJsonlFiles(analyticsDir);

    if (params.session_id) {
      const file = files.find((f) => f.sessionId === params.session_id);
      if (!file) {
        return {
          content: [
            {
              type: "text",
              text: `No analytics data found for session: ${params.session_id}`,
            },
          ],
        };
      }

      const events = readJsonlLines(file.filePath);
      const skillLoads = events.filter((e) => e.event === "skill_load");
      const injections = events.filter(
        (e) => e.event === "context_injection_parsed"
      );

      const topSkills = new Map<string, number>();
      for (const sl of skillLoads) {
        const name = (sl.data.skill as string) ?? "unknown";
        topSkills.set(name, (topSkills.get(name) ?? 0) + 1);
      }
      const sortedSkills = [...topSkills.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      let text = `## Session Summary: ${params.session_id}\n\n`;
      text += `- **Session:** ${params.session_id}\n`;
      text += `- **Total events:** ${events.length}\n`;

      // Workflows detected (phases with context injection)
      const phases = [...new Set(injections.map((e) => e.data.phase as string))];
      text += `- **Workflows detected:** ${phases.length > 0 ? phases.join(", ") : "none"}\n`;

      // Injected files count
      const totalInjectedFiles = injections.reduce(
        (acc, e) => acc + ((e.data.injectedFiles as string[]) ?? []).length,
        0
      );
      text += `- **Injected files:** ${totalInjectedFiles}\n`;
      text += `- **Skill loads:** ${skillLoads.length}\n`;
      text += `\n### Top Skills\n`;
      for (const [name, count] of sortedSkills) {
        text += `- ${name}: ${count} loads\n`;
      }

      return { content: [{ type: "text", text }] };
    }

    // Global summary
    let totalEvents = 0;
    const allSessions = new Set<string>();
    const allSkills = new Map<string, number>();
    const workflowEvents = new Map<string, number>(); // phase -> event count

    for (const file of files) {
      const events = readJsonlLines(file.filePath);
      totalEvents += events.length;
      for (const e of events) {
        allSessions.add(e.session);
        if (e.event === "skill_load") {
          const name = (e.data.skill as string) ?? "unknown";
          allSkills.set(name, (allSkills.get(name) ?? 0) + 1);
        }
        if (e.event === "context_injection_parsed") {
          const phase = (e.data.phase as string) ?? "unknown";
          workflowEvents.set(phase, (workflowEvents.get(phase) ?? 0) + 1);
        }
      }
    }

    const sortedSkills = [...allSkills.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    let text = `## Analytics Summary\n\n`;
    text += `- **Total sessions:** ${allSessions.size}\n`;
    text += `- **Total events:** ${totalEvents}\n`;
    text += `\n### Tracked Workflows\n`;
    if (workflowEvents.size > 0) {
      for (const [phase, count] of workflowEvents.entries()) {
        text += `- ${phase}: ${count} injection(s)\n`;
      }
    } else {
      text += `- No workflows tracked yet\n`;
    }
    text += `\n### Top 5 Skills\n`;
    for (const [name, count] of sortedSkills) {
      text += `- ${name}: ${count} loads\n`;
    }

    return { content: [{ type: "text", text }] };
  }

  function handleContextConsumption(
    analyticsDir: string,
    params: { session_id?: string },
    _limit: number
  ) {
    if (!params.session_id) {
      return {
        content: [
          {
            type: "text",
            text: "session_id is required for context-consumption action.",
          },
        ],
      };
    }

    const files = findAllJsonlFiles(analyticsDir);
    const file = files.find((f) => f.sessionId === params.session_id);
    if (!file) {
      return {
        content: [
          {
            type: "text",
            text: `No analytics data found for session: ${params.session_id}`,
          },
        ],
      };
    }

    const events = readJsonlLines(file.filePath);

    const injections = events.filter(
      (e) => e.event === "context_injection_parsed"
    );
    const followedRefs = events.filter(
      (e) => e.event === "reference_followed" && e.data.read === true
    );

    let text = `## Context Consumption: ${params.session_id}\n\n`;

    for (const inj of injections) {
      const phase = (inj.data.phase as string) ?? "unknown";
      const files = (inj.data.injectedFiles as string[]) ?? [];
      const modes = (inj.data.modeMap as Record<string, string[]>) ?? {};
      const invokes = (inj.data.invokeTargets as string[]) ?? [];

      text += `### Phase: ${phase}\n`;
      text += `- **Injected files:** ${files.length}\n`;

      for (const [mode, modeFiles] of Object.entries(modes)) {
        text += `  - ${mode}: ${modeFiles.length} files\n`;
      }

      text += `- **Invoke targets:** ${invokes.length}\n`;
      text += `\n`;
    }

    let totalRefs = 0;
    for (const inj of injections) {
      totalRefs += (inj.data.referenceCount as number) ?? 0;
    }

    text += `### Consumption Rate\n`;
    text += `- **References followed:** ${followedRefs.length}\n`;
    text += `- **Total references extracted:** ${totalRefs}\n`;

    return { content: [{ type: "text", text }] };
  }

  function handleTimeline(
    analyticsDir: string,
    params: { session_id?: string; limit?: number },
    limit: number
  ) {
    const files = findAllJsonlFiles(analyticsDir);
    let targetFile: string | null = null;

    if (params.session_id) {
      targetFile =
        files.find((f) => f.sessionId === params.session_id)?.filePath ??
        null;
    }

    if (!targetFile) {
      return {
        content: [
          {
            type: "text",
            text: "session_id is required for timeline action.",
          },
        ],
      };
    }

    const events = readJsonlLines(targetFile, limit);

    let text = `## Timeline\n\n`;
    text += `Source: ${path.basename(path.dirname(targetFile))}/${path.basename(targetFile)}\n\n`;

    for (const e of events) {
      const time = new Date(e.ts).toLocaleTimeString();
      let summary = "";
      switch (e.event) {
        case "skill_load":
          summary = `Skill loaded: ${e.data.skill}`;
          break;
        case "context_injection_parsed":
          summary = `Phase context parsed: ${e.data.phase} (${(e.data.injectedFiles as string[])?.length ?? 0} files)`;
          break;
        case "reference_followed":
          summary = `Reference followed: ${e.data.ref}`;
          break;
        default:
          summary = `${e.event}`;
      }
      text += `- **${time}**: ${summary}\n`;
    }

    return { content: [{ type: "text", text }] };
  }

  function handleListSessions(analyticsDir: string) {
    const files = findAllJsonlFiles(analyticsDir);

    let text = `## Tracked Sessions\n\n`;
    text += `| # | Session ID | Events |\n`;
    text += `|---|------------|--------|\n`;

    files.forEach((file, idx) => {
      const events = readJsonlLines(file.filePath);
      text += `| ${idx + 1} | ${file.sessionId} | ${events.length} |\n`;
    });

    return { content: [{ type: "text", text }] };
  }
}
