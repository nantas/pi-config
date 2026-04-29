# Pi Extension Autocomplete & Input Pipeline Internals

> Research notes from `dollar-skill-invoke` extension development (2026-04-29).
> Source: `repo://pi-mono` monorepo.
> Pi version: current monorepo HEAD.

## 1. TUI Autocomplete Architecture

### 1.1 Core Types (packages/tui/src/autocomplete.ts)

Exported from `@mariozechner/pi-tui`:

```
AutocompleteItem        { value: string, label: string, description?: string }
AutocompleteSuggestions { items: AutocompleteItem[], prefix: string }
AutocompleteProvider    { getSuggestions(...), applyCompletion(...), shouldTriggerFileCompletion?(...) }
SlashCommand            { name: string, description?: string, argumentHint?: string, getArgumentCompletions?(...)? }
CombinedAutocompleteProvider implements AutocompleteProvider
```

### 1.2 CombinedAutocompleteProvider.getSuggestions() Logic

The method checks text in priority order:

```
1. @ prefix    → fuzzy file search (fd)
2. / prefix    → command autocomplete (slash commands)
3. /command arg → per-command argument completions (e.g., /model <model>)
4. path prefix → file/directory completion
```

Key `/` prefix check (line 245):
```typescript
if (!options.force && textBeforeCursor.startsWith("/")) {
  const spaceIndex = textBeforeCursor.indexOf(" ");
  if (spaceIndex === -1) {
    // Complete command name — fuzzy match all registered commands
    const prefix = textBeforeCursor.slice(1);
    const commandItems = this.commands.map(cmd => ({ name, label: name, description }));
    const filtered = fuzzyFilter(commandItems, prefix, item => item.name);
    return { items: filtered, prefix: textBeforeCursor };
  }
  // Complete command argument
  const commandName = textBeforeCursor.slice(1, spaceIndex);
  const command = this.commands.find(cmd => cmd.name === commandName);
  if (command?.getArgumentCompletions) {
    return { items: await command.getArgumentCompletions(argumentText), prefix: argumentText };
  }
}
```

### 1.3 CombinedAutocompleteProvider.applyCompletion() Logic

For slash commands (line ~370): replaces the token and inserts `/value ` with cursor positioned after the space.

For `@` file attachments: preserves trailing `/` on directories (to allow chained autocompletion).

## 2. Interactive Mode: Autocomplete Provider Assembly

### 2.1 Command Assembly (interactive-mode.ts createBaseAutocompleteProvider, line 454)

```typescript
const slashCommands = BUILTIN_SLASH_COMMANDS.map(cmd => ({ name, description }));
// Builtins: /settings, /model, /export, /import, /share, /copy, /name,
//           /session, /changelog, /hotkeys, /fork, /clone, /tree,
//           /login, /logout, /new, /compact, /resume, /reload, /quit

modelCommand.getArgumentCompletions = (prefix) => {
  // Fuzzy filter available models by id + provider
};

const templateCommands = this.session.promptTemplates.map(cmd => ({
  name: cmd.name, description, argumentHint
}));

const extensionCommands = this.session.extensionRunner
  .getRegisteredCommands()
  .filter(cmd => !builtinCommandNames.has(cmd.name))
  .map(cmd => ({ name: cmd.invocationName, description, getArgumentCompletions }));

const skillCommandList = [];
if (this.settingsManager.getEnableSkillCommands()) {
  for (const skill of this.session.resourceLoader.getSkills().skills) {
    skillCommandList.push({
      name: `skill:${skill.name}`,
      description: `... ${skill.description}`
    });
  }
}

return new CombinedAutocompleteProvider(
  [...slashCommands, ...templateCommands, ...extensionCommands, ...skillCommandList],
  cwd,
  fdPath
);
```

**Key insight**: All four command sources are flattened into a single array. Skill commands are identifiable by having `name` starting with `skill:`.

### 2.2 addAutocompleteProvider Wrapping (interactive-mode.ts, line 531)

```typescript
private setupAutocompleteProvider(): void {
  let provider = this.createBaseAutocompleteProvider();
  for (const wrapProvider of this.autocompleteProviderWrappers) {
    provider = wrapProvider(provider);  // Chain: wrapper3(wrapper2(wrapper1(base)))
  }
  this.autocompleteProvider = provider;
  this.defaultEditor.setAutocompleteProvider(provider);
}
```

Each `AutocompleteProviderFactory` receives the current (possibly wrapped) provider and returns a new one. This is a **chain pattern**: extensions stack on top of each other, with the innermost being the base `CombinedAutocompleteProvider`.

### 2.3 AutocompleteProviderFactory Type

```typescript
// packages/coding-agent/src/core/extensions/types.ts line 117
export type AutocompleteProviderFactory = (current: AutocompleteProvider) => AutocompleteProvider;
```

Exposed via `ctx.ui.addAutocompleteProvider(factory)` in the ExtensionUIContext.

## 3. Input Processing Pipeline

### 3.1 prompt() Pipeline (agent-session.ts, line 942)

```
User presses Enter
    ↓
1. text.startsWith("/") → _tryExecuteExtensionCommand(text)
    If extension command found → handler(args, ctx) → return
    ↓
2. emitInput("input" event) → extensions can:
    - { action: "handled" } → stop processing
    - { action: "transform", text } → change text
    - { action: "continue" } → pass through
    ↓
3. _expandSkillCommand(text) — expands /skill:name to <skill> block
    ↓
4. expandPromptTemplate(text, templates) — expands prompt templates
    ↓
5. If streaming → queue via steer() or followUp()
    If idle → start agent turn with expanded text
```

### 3.2 _expandSkillCommand (agent-session.ts, line 1123)

```typescript
private _expandSkillCommand(text: string): string {
  if (!text.startsWith("/skill:")) return text;  // Line-start only!
  const spaceIndex = text.indexOf(" ");
  const skillName = text.slice(7, spaceIndex === -1 ? undefined : spaceIndex);
  const args = spaceIndex === -1 ? "" : text.slice(spaceIndex + 1).trim();

  const skill = this.resourceLoader.getSkills().skills.find(s => s.name === skillName);
  if (!skill) return text;

  const content = readFileSync(skill.filePath, "utf-8");
  const body = stripFrontmatter(content).trim();
  const skillBlock = `<skill name="${skill.name}" location="${skill.filePath}">\nReferences are relative to ${skill.baseDir}.\n\n${body}\n</skill>`;
  return args ? `${skillBlock}\n\n${args}` : skillBlock;
}
```

**Key insight**: Only expands at line start. Output format:
```
<skill name="foo" location="/path/SKILL.md">
References are relative to /path/.

<body without frontmatter>
</skill>
```

### 3.3 emitInput Chain (extensions/runner.ts, line 993)

```typescript
async emitInput(text, images, source): Promise<InputEventResult> {
  let currentText = text;
  let currentImages = images;
  for (const ext of this.extensions) {
    for (const handler of ext.handlers.get("input") ?? []) {
      const event: InputEvent = { type: "input", text: currentText, images: currentImages, source };
      const result = await handler(event, ctx);
      if (result?.action === "handled") return result;
      if (result?.action === "transform") {
        currentText = result.text;
        currentImages = result.images ?? currentImages;
      }
    }
  }
  return currentText !== text || currentImages !== images
    ? { action: "transform", text: currentText, images: currentImages }
    : { action: "continue" };
}
```

Each extension handler receives the (possibly already transformed) text from the previous handler.

## 4. Skill System Reference

### 4.1 Skill Discovery Paths (skills.ts)

Priority order (highest = wins on collision):
1. `.pi/skills/` (project, settings-defined)
2. `.pi/skills/` (project, auto-discovered)
3. `~/.pi/agent/skills/` (user, settings-defined)
4. `~/.pi/agent/skills/` (user, auto-discovered)
5. `.agents/skills/` (walking up to git root)
6. `~/.agents/skills/`
7. Package-contributed (lowest)

### 4.2 Skill Command Registration

Skills appear as `/skill:<name>` commands when `enableSkillCommands` is `true` (default).
The skill's `SKILL.md` file path is stored in `skillCommands: Map<string, string>` in interactive-mode.

### 4.3 disableModelInvocation

Skills with `disable_model_invocation: true` in frontmatter are:
- Excluded from the system prompt's `<available_skills>` block
- Still listed in autocomplete (via `skill:name`)
- Still invocable via `/skill:name` or `$name`

## 5. ExtensionAPI: Key Methods for Autocomplete Extensions

### 5.1 pi.getCommands()

Returns `SlashCommandInfo[]`:
```typescript
interface SlashCommandInfo {
  name: string;        // "skill:my-skill" for skills
  description?: string;
  source: "extension" | "prompt" | "skill";
  sourceInfo: SourceInfo;  // Contains .path (SKILL.md path for skills)
}
```

### 5.2 ctx.ui.addAutocompleteProvider()

Only available in interactive mode. Takes `(current: AutocompleteProvider) => AutocompleteProvider`.

Example pattern from `github-issue-autocomplete.ts`:
```typescript
ctx.ui.addAutocompleteProvider((current) => ({
  async getSuggestions(lines, cursorLine, cursorCol, options) {
    const line = lines[cursorLine] ?? "";
    const beforeCursor = line.slice(0, cursorCol);
    // Check for custom prefix...
    const match = beforeCursor.match(/...custom regex.../);
    if (!match) {
      return current.getSuggestions(lines, cursorLine, cursorCol, options);
    }
    return { prefix, items: [...] };
  },
  applyCompletion(lines, cursorLine, cursorCol, item, prefix) {
    return current.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
  },
  shouldTriggerFileCompletion(lines, cursorLine, cursorCol) {
    return current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ?? true;
  },
}));
```

### 5.3 pi.on("input", handler)

```typescript
interface InputEvent {
  type: "input";
  text: string;
  images?: ImageContent[];
  source: "interactive" | "rpc" | "extension";
}

type InputEventResult =
  | { action: "continue" }
  | { action: "transform"; text: string; images?: ImageContent[] }
  | { action: "handled" };
```

## 6. Key File Paths Reference

| Path | Role |
|------|------|
| `packages/tui/src/autocomplete.ts` | `CombinedAutocompleteProvider`, `AutocompleteProvider`, `SlashCommand` |
| `packages/tui/src/fuzzy.ts` | `fuzzyFilter`, `fuzzyMatch` |
| `packages/coding-agent/src/modes/interactive/interactive-mode.ts` | `createBaseAutocompleteProvider()`, `setupAutocompleteProvider()`, command assembly |
| `packages/coding-agent/src/core/agent-session.ts` | `prompt()`, `_tryExecuteExtensionCommand()`, `_expandSkillCommand()`, `prompt()` pipeline |
| `packages/coding-agent/src/core/skills.ts` | `loadSkills()`, `Skill`, `formatSkillsForPrompt()` |
| `packages/coding-agent/src/core/slash-commands.ts` | `BUILTIN_SLASH_COMMANDS`, `SlashCommandInfo` |
| `packages/coding-agent/src/core/extensions/types.ts` | `ExtensionAPI`, `AutocompleteProviderFactory`, `InputEvent`, `InputEventResult` |
| `packages/coding-agent/src/core/extensions/runner.ts` | `emitInput()`, `getRegisteredCommands()`, handler dispatch |
| `packages/coding-agent/docs/extensions.md` | Official extension documentation |
