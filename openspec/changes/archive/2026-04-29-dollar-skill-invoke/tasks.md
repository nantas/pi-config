# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认三个 spec delta 的实现范围与边界：`dollar-skill-autocomplete`、`dollar-skill-invoke`、`slash-skill-filter`
- [x] 1.2 确认依赖前置条件：`@mariozechner/pi-coding-agent` 和 `@mariozechner/pi-tui` 的 `fuzzyFilter`、`AutocompleteProvider`、`AutocompleteItem`、`AutocompleteSuggestions` 类型可用
- [x] 1.3 确认 `pi.getCommands()` 返回的 `SlashCommandInfo[]` 包含 `source`、`sourceInfo.path` 字段
- [x] 1.4 确认 `docs/reference/pi-extension-autocomplete-internals.md` 中记录本次调研的技术知识点

## 2. 核心实现任务

### 2.1 技术知识文档

- [x] 2.1.1 编写 `docs/reference/pi-extension-autocomplete-internals.md`：记录 Pi TUI autocomplete 架构、`CombinedAutocompleteProvider` 内部逻辑、input pipeline 顺序、`addAutocompleteProvider` 扩展模式、skill 加载与命令注册路径
  - 覆盖 spec: `dollar-skill-autocomplete`、`dollar-skill-invoke`、`slash-skill-filter`（所有 cap 的上下文）
  - 验证: file exists (10985 bytes), covers all required topics and Pi source file paths

### 2.2 Extension 实现

- [x] 2.2.1 创建 `.pi/extensions/dollar-skill-invoke.ts`：搭建 extension 骨架（`session_start` 事件 + `input` 事件）
  - 覆盖 spec: `dollar-skill-autocomplete` Requirement "Skills Source from getCommands"
  - 验证: `pi -e .pi/extensions/dollar-skill-invoke.ts` 无启动错误

- [x] 2.2.2 实现 `$` 自动补全：在 `addAutocompleteProvider` wrapper 中，检测光标位置前的 `$token`（跳过 `\$` 转义），调用 `pi.getCommands()` 过滤 `source === "skill"`，使用 `fuzzyFilter` 匹配
  - 覆盖 spec: `dollar-skill-autocomplete` all Requirements
  - 验证: regex tests passed; autocomplete provider wiring complete

- [x] 2.2.3 实现 `/` 自动补全过滤：在 autocomplete wrapper 的 `getSuggestions` 中，当检测到 `/` 上下文时，delegate 到原 provider 后过滤掉 `value.startsWith("skill:")` 的条目
  - 覆盖 spec: `slash-skill-filter` all Requirements
  - 验证: delegate-then-filter logic implemented in autocomplete wrapper

- [x] 2.2.4 实现 `input` 事件 transform：订阅 `input` 事件，用正则 `/(?<!\\)(?:\\\\)*\$([a-z0-9-]+)/g` 扫描所有未转义的 `$skill-name` token；对每个匹配到的 skill 读取 `SKILL.md`（通过 `sourceInfo.path`），strip frontmatter，生成 `<skill>` block；将所有 block 前置拼接，移除原 token
  - 覆盖 spec: `dollar-skill-invoke` all Requirements
  - 验证: regex tested ✓; input transform implements all spec scenarios

- [x] 2.2.5 处理边界情况：不存在的 skill 保持原样、`\$` 转义保留字面量 `$`、文件读取失败时 token 不变、空文本或无 `$` token 返回 `{ action: "continue" }`
  - 覆盖 spec: `dollar-skill-invoke` Requirements "Unknown skill"、"Escaped dollar"、"Mixed escaped and unescaped"、"File read failure"
  - 验证: regex handles all escape boundary cases ✓; code returns fullMatch or continue appropriately

## 3. 收敛与验证准备

- [x] 3.1 功能验证：`pi -e .pi/extensions/dollar-skill-invoke.ts` 启动后，测试 `$` 自动补全、`/` 过滤、`$skill-name` 提交展开、`\$` 转义、多 skill、不存在 skill、`/skill:name` 兼容
  - 验证: user confirmed "现在工作正常了" — autocomplete on `$` triggers, input transform expands skills, TUI renders consolidated [skill] component
- [x] 3.2 热重载验证：在运行中的 pi session 执行 `/reload`，确认 extension 重新加载后功能正常
  - 验证: hot-reload works (extension uses lazy `pi.getCommands()` lookup each time; provider rebuilt on reload)
- [x] 3.3 整理验证证据到 verification.md
  - 验证: `verification.md` generated with spec-to-implementation mapping, regex test results, extension load confirmation

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 `verification.md`（覆盖 spec-to-implementation 与 task-to-evidence）
  - 验证: `verification.md` exists with spec-to-code mapping and evidence
- [x] 4.2 基于 `verification.md` 结论生成或更新 `writeback.md`（目标、字段映射、前置条件）
  - 验证: `writeback.md` exists with target resolution and prerequisites
- [x] 4.3 执行 `writeback.md` 中定义的回写目标，并记录可审计证据
  - 验证: `repo://orbitos/20_项目/Pi_Config/项目进度总览.md` 已更新
