# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认三个 capability spec 的实现范围与边界：`dollar-skill-autocomplete`（移除 auto-trigger）、`dollar-skill-invoke`（input handler 提到顶层）、`editor-conflict-reference`（新增参考文档）
- [x] 1.2 确认依赖前置条件：不新增 npm 依赖；`@mariozechner/pi-coding-agent` 的 `ExtensionAPI` 和 `@mariozechner/pi-tui` 的 `AutocompleteProvider` 等类型已可用

## 2. 核心实现任务

### 2.1 修改 dollar-skill-invoke.ts

- [ ] 2.1.1 移除 `CustomEditor` import 和 `DollarSkillEditor extends CustomEditor` 类定义
  - 覆盖 spec: `dollar-skill-autocomplete` REMOVED "Editor Auto-Trigger on $"
  - 验证: 文件中无 `CustomEditor` 引用、无 `DollarSkillEditor` 类

- [ ] 2.1.2 移除 `ctx.ui.setEditorComponent(...)` 调用
  - 覆盖 spec: `dollar-skill-autocomplete` REMOVED "Editor Auto-Trigger on $"
  - 验证: 文件中无 `setEditorComponent` 调用

- [ ] 2.1.3 将 `pi.on("input", handler)` 从 `session_start` 回调内**提到顶层**（`export default function` 中），确保 handler 只注册一次
  - 覆盖 spec: `dollar-skill-invoke` ADDED "Input Handler Single Registration"
  - 验证: 代码审查确认 `pi.on("input", ...)` 在 `globalThis` dedup 之后、`session_start` 之外

- [ ] 2.1.4 保持 `ctx.ui.addAutocompleteProvider(...)` 包装和 `session_start` handler 不变
  - 覆盖 spec: `dollar-skill-autocomplete` MODIFIED "Dollar-Prefixed Skill Completion (via Tab)"
  - 验证: `addAutocompleteProvider` 调用和 `session_start` handler 仍在

### 2.2 更新 main spec

- [ ] 2.2.1 更新 `openspec/specs/dollar-skill-autocomplete/spec.md`：移除 `Editor Auto-Trigger on $` requirement block，替换 `Dollar-Prefixed Skill Completion` 的 WHEN/THEN 改为 Tab 触发语义
  - 覆盖 spec: `dollar-skill-autocomplete`（同步 delta → main）
  - 验证: main spec 中无 `Auto-Trigger`，`Dollar-Prefixed Skill Completion` 的场景都包含 Tab 触发

- [ ] 2.2.2 更新 `openspec/specs/dollar-skill-invoke/spec.md`：新增 `Input Handler Single Registration` requirement
  - 覆盖 spec: `dollar-skill-invoke`（同步 delta → main）
  - 验证: main spec 中包含 handler 注册约束的 requirement

### 2.3 新增参考文档

- [ ] 2.3.1 创建 `docs/reference/pi-extension-editor-conflict.md`，包含：
  - `setEditorComponent` 独占替换原理解释
  - 冲突诊断线索（症状 + 排查方法）
  - 兼容策略矩阵（addAutocompleteProvider vs 加载顺序 vs 移除）
  - 推荐的扩展开发模式代码示例（`addAutocompleteProvider` + 顶层 `input` handler）
  - 覆盖 spec: `editor-conflict-reference` ADDED "Reference Document Created"
  - 验证: 文件存在且包含以上四个章节

### 2.4 全局同步

- [ ] 2.4.1 运行 `scripts/sync-pi-agent.sh` 同步修改到 `~/.pi/agent/extensions/dollar-skill-invoke.ts`
  - 验证: 文件同步后，启动 Pi session 确认无加载错误

## 3. 收敛与验证准备

- [ ] 3.1 功能验证检查点：
  - [ ] `pi -e .pi/extensions/dollar-skill-invoke.ts` 启动无错误
  - [ ] 输入 `$` 按 Tab 显示 skill 自动补全
  - [ ] 提交 `$skill-name` text 展开为 `<skill>` block
  - [ ] `/` 自动补全无 `skill:xxx` 条目
  - [ ] `/new` 后 `$` Tab 补全正常工作（验证 handler 不累积）
  - [ ] `/new` 后 `$skill-name` 展开正常工作
- [ ] 3.2 热重载验证：`/reload` 后功能正常
- [ ] 3.3 冲突恢复验证：在启用 `pi-powerline-footer` 的情况下，`$` Tab 补全和 `$skill-name` 展开均正常工作

## 4. 验证与回写收敛

- [ ] 4.1 基于真实实现结果生成或更新 `verification.md`
- [ ] 4.2 基于 `verification.md` 结论生成或更新 `writeback.md`
- [ ] 4.3 执行 `writeback.md` 中定义的回写目标，并记录可审计证据
