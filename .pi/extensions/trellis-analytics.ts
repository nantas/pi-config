/**
 * trellis-analytics — Passive telemetry extension for the Trellis framework.
 *
 * Tracks skill loads, phase context injection, invoke resolution, and
 * reference consumption across Pi sessions. Writes streaming JSONL to
 * `.trellis/.analytics/` and registers a `trellis_analytics` tool for
 * querying the collected data.
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
  turn: number;
  event: string;
  data: Record<string, unknown>;
}

interface PendingCommand {
  command: string;
  phase: string;
}

// Invoke target tracking with turn-of-origin for 10-turn timeout
interface TrackedInvoke {
  skill: string;
  source: string;
  originTurn: number;
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
    // Skip non-file headers like "=== prd.md ===" — actually include all
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

const INVOKE_TIMEOUT_TURNS = 10;

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

/** Match a file read path against a reference with suffix/precision logic. */
function matchReference(filePath: string, ref: string): boolean {
  const nPath = filePath.replace(/\\/g, "/");
  const nRef = ref.replace(/\\/g, "/");

  // Exact match
  if (nPath === nRef) return true;

  // Suffix match with path-boundary guard.
  // "contest.md" should NOT match ref "test.md" even though it ends with it.
  // The character right before the suffix must be "/" or undefined (full string).
  const suffixCheck = (longer: string, shorter: string): boolean => {
    if (!longer.endsWith(shorter)) return false;
    const boundaryIdx = longer.length - shorter.length - 1;
    const boundary = longer[boundaryIdx];
    return boundary === undefined || boundary === "/";
  };
  if (suffixCheck(nPath, nRef) || suffixCheck(nRef, nPath)) return true;

  // Basename match (when paths differ but file is the same)
  const basePath = path.basename(nPath);
  const baseRef = path.basename(nRef);
  if (basePath === baseRef) return true;

  // Path segment containment (e.g., ref="shell/scenes/main.md" matches read ending "scenes/main.md")
  if (nPath.includes("/" + nRef) || nRef.includes("/" + nPath)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Streaming JSONL Writer
// ---------------------------------------------------------------------------

class JsonlWriter {
  private fd: number | null = null;
  private filePath: string = "";
  private taskSlug: string | null = null;
  private sessionId: string = "";
  private turnCounter: number = 0;

  constructor(private cwd: string) {}

  init(sessionId: string): void {
    this.sessionId = sessionId;

    // Read .trellis/.current-task
    const pointerPath = path.join(this.cwd, ".trellis", ".current-task");
    let taskSlug: string | null = null;
    try {
      const ref = fs.readFileSync(pointerPath, "utf-8").trim();
      if (ref) {
        // Extract slug from path like .trellis/tasks/05-12-my-task or absolute
        taskSlug = path.basename(ref);
      }
    } catch {
      // No current task → orphan mode
    }

    if (taskSlug) {
      this.taskSlug = taskSlug;
      const dir = path.join(
        this.cwd, ".trellis", ".analytics", "tasks", taskSlug
      );
      this.filePath = path.join(dir, "events.jsonl");
      fs.mkdirSync(dir, { recursive: true });
      this.fd = fs.openSync(this.filePath, "a");
    } else {
      this.taskSlug = null;
      const orphanDir = path.join(this.cwd, ".trellis", ".analytics", "orphans");
      fs.mkdirSync(orphanDir, { recursive: true });
      this.filePath = path.join(orphanDir, `${sessionId}.jsonl`);
      this.fd = fs.openSync(this.filePath, "a");
    }
  }

  getTaskSlug(): string | null {
    return this.taskSlug;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  incrementTurn(): number {
    return ++this.turnCounter;
  }

  getTurn(): number {
    return this.turnCounter;
  }

  write(eventType: string, data: Record<string, unknown>): void {
    if (this.fd === null) return;
    const record: AnalyticsEvent = {
      ts: isoNow(),
      session: this.sessionId,
      turn: this.turnCounter,
      event: eventType,
      data,
    };
    try {
      const line = JSON.stringify(record) + "\n";
      fs.writeSync(this.fd, line);
      fs.fsyncSync(this.fd);
    } catch (err) {
      console.error("[trellis-analytics] write error:", err);
    }
  }

  close(): void {
    if (this.fd !== null) {
      try {
        fs.closeSync(this.fd);
      } catch {
        // ignore
      }
      this.fd = null;
    }
  }

  getFilePath(): string {
    return this.filePath;
  }
}

// ---------------------------------------------------------------------------
// Main Extension
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  // Dedup guard
  const _key = "__pi_ext_trellis_analytics_loaded";
  if ((globalThis as any)[_key]) return;
  (globalThis as any)[_key] = true;

  pi.on("session_shutdown", () => {
    delete (globalThis as any)[_key];
  });

  // State
  const cwd = process.cwd();
  const writer = new JsonlWriter(cwd);
  const pendingCommands = new Map<string, PendingCommand>();
  const knownInvokeTargets = new Map<string, TrackedInvoke>();
  const knownReferences = new Map<string, { ref: string; type: string }>();
  const loadedSkills = new Set<string>();
  // Dynamic set of known skill names for reference extraction
  const knownSkillNames = new Set<string>();

  // ---------------------------------------------------------------------------
  // Events: session_start — init writer
  // ---------------------------------------------------------------------------
  pi.on("session_start", async (event, ctx) => {
    // Generate session ID from session file or timestamp
    const sessionFile = ctx.sessionManager.getSessionFile();
    const sessionId = sessionFile
      ? path.basename(sessionFile, ".jsonl")
      : `session-${Date.now()}`;

    writer.init(sessionId);
    writer.write("session_start", {
      reason: event.reason,
      sessionFile: sessionFile ?? "ephemeral",
    });
  });

  // ---------------------------------------------------------------------------
  // Events: tool_call — skill tracking + command detection
  // ---------------------------------------------------------------------------
  pi.on("tool_call", async (event, _ctx) => {
    writer.incrementTurn();

    // --- Skill load tracking (read tool, SKILL.md path) ---
    if (event.toolName === "read") {
      const filePath: string = (event.input as any).path ?? "";
      if (filePath.endsWith("SKILL.md") || filePath.includes("/SKILL.md")) {
        const skillInfo = extractSkillFromPath(filePath);
        if (skillInfo) {
          // Determine source
          let source = "autonomous";
          if (knownInvokeTargets.has(skillInfo.skill)) {
            source = "phase_context_invoke";
          } else if (loadedSkills.size === 0) {
            // First skill in session likely from user prompt or startup
            source = "user_prompt";
          }

          loadedSkills.add(skillInfo.skill);
          knownSkillNames.add(skillInfo.skill);
          // Also add the short name (last segment) for reference matching
          const shortName = skillInfo.skill.split("/").pop()!;
          if (shortName !== skillInfo.skill) knownSkillNames.add(shortName);

          writer.write("skill_load", {
            skill: skillInfo.skill,
            namespace: skillInfo.namespace,
            path: filePath,
            source,
          });

          // Check if this resolves an invoke target
          if (knownInvokeTargets.has(skillInfo.skill)) {
            writer.write("invoke_resolved", {
              skill: skillInfo.skill,
              loaded: true,
            });
            knownInvokeTargets.delete(skillInfo.skill);
          }
        }
      }

      // Check if this read matches a known reference
      for (const [key, refData] of knownReferences.entries()) {
        if (
          refData.type === "file" &&
          matchReference(filePath, refData.ref)
        ) {
          writer.write("reference_followed", {
            ref: refData.ref,
            type: refData.type,
            read: true,
          });
          knownReferences.delete(key);
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

          writer.write("context_injection_begin", {
            phase,
            command,
          });
        }
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Events: tool_result — parse phase context output
  // ---------------------------------------------------------------------------
  pi.on("tool_result", async (event, _ctx) => {
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

    // Record invoke targets for cross-reference
    for (const target of invokeTargets) {
      const skillInfo = extractSkillFromPath(target);
      const skillName = skillInfo ? skillInfo.skill : target;
      knownInvokeTargets.set(skillName, {
        skill: skillName,
        source: "phase_context_invoke",
        originTurn: writer.getTurn(),
      });
    }

    // Record references for tracking
    for (const ref of references) {
      knownReferences.set(ref.ref, ref);
    }

    writer.write("context_injection_parsed", {
      phase: pending.phase,
      injectedFiles,
      modeMap,
      invokeTargets,
      boundChange,
      referenceCount: references.length,
    });

    writer.write("context_injection_references", {
      phase: pending.phase,
      references,
    });
  });

  // ---------------------------------------------------------------------------
  // Events: turn_end — check unresolved invokes
  // ---------------------------------------------------------------------------
  pi.on("turn_end", async (_event, _ctx) => {
    // Check for invoke targets that have exceeded the 10-turn timeout
    const currentTurn = writer.getTurn();
    for (const [skillName, data] of knownInvokeTargets.entries()) {
      if (currentTurn - data.originTurn >= INVOKE_TIMEOUT_TURNS) {
        writer.write("invoke_resolved", {
          skill: skillName,
          loaded: false,
          note: `unresolved_after_${INVOKE_TIMEOUT_TURNS}_turns`,
        });
        knownInvokeTargets.delete(skillName);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Events: session_shutdown — cleanup
  // ---------------------------------------------------------------------------
  pi.on("session_shutdown", async (_event, _ctx) => {
    // Log any unresolved invoke targets
    for (const [skillName, data] of knownInvokeTargets.entries()) {
      writer.write("invoke_resolved", {
        skill: skillName,
        loaded: false,
        note: "unresolved_at_shutdown",
      });
    }

    writer.write("session_shutdown", {});
    writer.close();
  });

  // ---------------------------------------------------------------------------
  // Tool: trellis_analytics
  // ---------------------------------------------------------------------------
  pi.registerTool({
    name: "trellis_analytics",
    label: "Trellis Analytics",
    description:
      "Query Trellis analytics data. Actions: summary, context-consumption, timeline, list-sessions, task-detail.",
    parameters: Type.Object({
      action: StringEnum([
        "summary",
        "context-consumption",
        "timeline",
        "list-sessions",
        "task-detail",
      ] as const),
      task_slug: Type.Optional(
        Type.String({ description: "Filter by task slug" })
      ),
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
        task_slug?: string;
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
          case "task-detail":
            return handleTaskDetail(analyticsDir, params, limit);
          default:
            return {
              content: [
                {
                  type: "text",
                  text: `Unknown action: ${params.action}. Use: summary, context-consumption, timeline, list-sessions, task-detail`,
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

  function findAllJsonlFiles(
    analyticsDir: string
  ): { filePath: string; taskSlug: string | null; sessionId: string | null }[] {
    const results: { filePath: string; taskSlug: string | null; sessionId: string | null }[] = [];

    // Task-based files
    const tasksDir = path.join(analyticsDir, "tasks");
    if (fs.existsSync(tasksDir)) {
      for (const taskDir of fs.readdirSync(tasksDir)) {
        const eventsFile = path.join(tasksDir, taskDir, "events.jsonl");
        if (fs.existsSync(eventsFile)) {
          results.push({
            filePath: eventsFile,
            taskSlug: taskDir,
            sessionId: null,
          });
        }
      }
    }

    // Orphan files
    const orphanDir = path.join(analyticsDir, "orphans");
    if (fs.existsSync(orphanDir)) {
      for (const file of fs.readdirSync(orphanDir)) {
        if (file.endsWith(".jsonl")) {
          results.push({
            filePath: path.join(orphanDir, file),
            taskSlug: null,
            sessionId: file.replace(".jsonl", ""),
          });
        }
      }
    }

    return results;
  }

  function handleSummary(
    analyticsDir: string,
    params: { task_slug?: string },
    _limit: number
  ) {
    const files = findAllJsonlFiles(analyticsDir);

    if (params.task_slug) {
      const file = files.find((f) => f.taskSlug === params.task_slug);
      if (!file) {
        return {
          content: [
            {
              type: "text",
              text: `No analytics data found for task: ${params.task_slug}`,
            },
          ],
        };
      }

      const events = readJsonlLines(file.filePath);
      const sessions = new Set(events.map((e) => e.session));
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

      let text = `## Task Summary: ${params.task_slug}\n\n`;
      text += `- **Task slug:** ${params.task_slug}\n`;
      text += `- **Sessions:** ${sessions.size}\n`;
      text += `- **Total events:** ${events.length}\n`;

      // Workflows detected (phases with context injection)
      const phases = [...new Set(injections.map((e) => e.data.phase as string))];
      text += `- **Workflows detected:** ${phases.length > 0 ? phases.join(", ") : "none"}\n`;

      // Inject files count
      const totalInjectedFiles = injections.reduce(
        (acc, e) => acc + ((e.data.injectedFiles as string[]) ?? []).length,
        0
      );
      text += `- **Injected files:** ${totalInjectedFiles}\n`;

      // Invoke resolution rate
      const invokeResolved = events.filter(
        (e) => e.event === "invoke_resolved" && e.data.loaded === true
      );
      const totalInvokeTargets = injections.reduce(
        (acc, e) => acc + ((e.data.invokeTargets as string[]) ?? []).length,
        0
      );
      const invokeRate =
        totalInvokeTargets > 0
          ? `${invokeResolved.length}/${totalInvokeTargets} (${Math.round((invokeResolved.length / totalInvokeTargets) * 100)}%)`
          : "N/A";
      text += `- **Invoke resolution rate:** ${invokeRate}\n`;

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
        if (e.event === "context_injection_begin") {
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
    params: { task_slug?: string },
    _limit: number
  ) {
    if (!params.task_slug) {
      return {
        content: [
          {
            type: "text",
            text: "task_slug is required for context-consumption action.",
          },
        ],
      };
    }

    const filePath = path.join(
      analyticsDir, "tasks", params.task_slug, "events.jsonl"
    );
    const events = readJsonlLines(filePath);

    const injections = events.filter(
      (e) => e.event === "context_injection_parsed"
    );
    const resolved = events.filter(
      (e) => e.event === "invoke_resolved" && e.data.loaded === true
    );
    const allInvokes = events.filter(
      (e) => e.event === "invoke_resolved"
    );
    const followedRefs = events.filter(
      (e) => e.event === "reference_followed" && e.data.read === true
    );
    const allRefs = events.filter(
      (e) => e.event === "context_injection_references"
    );

    let totalInvokes = 0;
    for (const inj of injections) {
      totalInvokes += ((inj.data.invokeTargets as string[]) ?? []).length;
    }

    let text = `## Context Consumption: ${params.task_slug}\n\n`;

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
      for (const inv of invokes) {
        const wasLoaded = resolved.some(
          (r) => r.data.skill === extractSkillFromPath(inv)?.skill
        );
        text += `  - ${inv}: ${wasLoaded ? "✅ loaded" : "❌ not loaded"}\n`;
      }
      text += `\n`;
    }

    const rate =
      totalInvokes > 0
        ? `${resolved.length}/${totalInvokes} (${Math.round(
            (resolved.length / totalInvokes) * 100
          )}%)`
        : "N/A";

    text += `### Consumption Rate\n`;
    text += `- **Invoke resolution:** ${rate}\n`;
    text += `- **References followed:** ${followedRefs.length}\n`;
    text += `- **Total references extracted:** ${allRefs.reduce(
      (acc, r) => acc + ((r.data.referenceCount as number) ?? 0),
      0
    )}\n`;

    return { content: [{ type: "text", text }] };
  }

  function handleTimeline(
    analyticsDir: string,
    params: { session_id?: string; task_slug?: string; limit?: number },
    limit: number
  ) {
    const files = findAllJsonlFiles(analyticsDir);
    let targetFile: string | null = null;

    if (params.session_id) {
      targetFile =
        files.find((f) => f.sessionId === params.session_id)?.filePath ??
        null;
      if (!targetFile) {
        // Check task-based files for session_id match
        for (const file of files) {
          const events = readJsonlLines(file.filePath);
          if (events.some((e) => e.session === params.session_id)) {
            targetFile = file.filePath;
            break;
          }
        }
      }
    } else if (params.task_slug) {
      targetFile =
        files.find((f) => f.taskSlug === params.task_slug)?.filePath ?? null;
    }

    if (!targetFile) {
      // Default to the writer's current file
      targetFile = writer.getFilePath();
    }

    const events = readJsonlLines(targetFile, limit);

    let text = `## Timeline\n\n`;
    text += `Source: ${path.basename(targetFile)}\n\n`;

    for (const e of events) {
      const time = new Date(e.ts).toLocaleTimeString();
      let summary = "";
      switch (e.event) {
        case "session_start":
          summary = `Session started (${e.data.reason ?? ""})`;
          break;
        case "skill_load":
          summary = `Skill loaded: ${e.data.skill} (${e.data.source ?? ""})`;
          break;
        case "context_injection_begin":
          summary = `Phase context injection started: ${e.data.phase}`;
          break;
        case "context_injection_parsed":
          summary = `Phase context parsed: ${e.data.phase} (${(e.data.injectedFiles as string[])?.length ?? 0} files)`;
          break;
        case "invoke_resolved":
          summary = `Invoke ${e.data.loaded ? "resolved" : "unresolved"}: ${e.data.skill}`;
          break;
        case "reference_followed":
          summary = `Reference followed: ${e.data.ref}`;
          break;
        case "session_shutdown":
          summary = "Session ended";
          break;
        default:
          summary = `${e.event}`;
      }
      text += `- **${time}** (turn ${e.turn}): ${summary}\n`;
    }

    return { content: [{ type: "text", text }] };
  }

  function handleListSessions(analyticsDir: string) {
    const files = findAllJsonlFiles(analyticsDir);

    let text = `## Tracked Sessions\n\n`;
    text += `| # | Type | Slug/ID | Sessions | Events |\n`;
    text += `|---|------|---------|----------|--------|\n`;

    files.forEach((file, idx) => {
      const events = readJsonlLines(file.filePath);
      const sessions = new Set(events.map((e) => e.session));
      const type = file.taskSlug ? "task" : "orphan";
      const id = file.taskSlug ?? file.sessionId ?? "unknown";
      text += `| ${idx + 1} | ${type} | ${id} | ${sessions.size} | ${events.length} |\n`;
    });

    return { content: [{ type: "text", text }] };
  }

  function handleTaskDetail(
    analyticsDir: string,
    params: { task_slug?: string },
    _limit: number
  ) {
    if (!params.task_slug) {
      return {
        content: [
          {
            type: "text",
            text: "task_slug is required for task-detail action.",
          },
        ],
      };
    }

    const filePath = path.join(
      analyticsDir, "tasks", params.task_slug, "events.jsonl"
    );
    const events = readJsonlLines(filePath);

    const sessions = new Map<
      string,
      { start: string; end: string; events: number }
    >();
    for (const e of events) {
      if (!sessions.has(e.session)) {
        sessions.set(e.session, {
          start: e.ts,
          end: e.ts,
          events: 0,
        });
      }
      const s = sessions.get(e.session)!;
      s.end = e.ts;
      s.events++;
    }

    let text = `## Task Detail: ${params.task_slug}\n\n`;
    text += `- **Total events:** ${events.length}\n`;
    text += `- **Sessions:** ${sessions.size}\n\n`;

    text += `### Sessions\n`;
    for (const [sid, info] of sessions.entries()) {
      text += `- **${sid.substring(0, 16)}...**\n`;
      text += `  - Start: ${new Date(info.start).toLocaleString()}\n`;
      text += `  - End: ${new Date(info.end).toLocaleString()}\n`;
      text += `  - Events: ${info.events}\n`;
    }

    return { content: [{ type: "text", text }] };
  }
}
