# Proposal

## 问题定义

使用 pi 时，任务结束后输入框常被 ghost text 预填。按 Enter 会直接提交该建议；按 Backspace 删除/修改后，后续输入显示异常，需 Ctrl+C 才能恢复。

根因在 fork 包 `pi-xai` 的 next-prompt ghost：`xai-prompt-suggest.ts` 在 `agent_end` 后调用 `setEditorText(asGhostText(...))`，把带 ANSI dim 的字符串写入真实编辑器缓冲区。半删状态清理不完整，叠加 `pi-powerline` 二次 render 放大错乱。

先前 fork 已移除 Tab 快捷键覆盖，但 ghost 默认仍注册并启用。需要从包入口彻底停止该功能的运行时挂载。

## 范围边界

**In scope**
- 在 `repo://pi-xai` 入口不再注册 prompt suggest（不调用 `registerXaiPromptSuggest`）
- 文档与 CHANGELOG 标明该能力在本 fork 中默认关闭 / 不加载
- 更新 `forks/manifest.yaml` 的 `changes_summary`
- 按 pkg-fork-dev：本地验证 → commit/tag/push → 恢复 production `git:` 源

**Out of scope**
- 修复 ghost ANSI 半删 UX（目标是关掉，不是修好）
- 删除 `xai-prompt-suggest.ts` 文件本体（保留代码便于上游对照或未来 opt-in 恢复）
- 改动 pi-tui / pi-powerline
- 用环境变量 alone 作为唯一方案（本次以源码不注册为准）
- 其他 pi-xai 功能（imagine、vision、oauth、agentic 等）

## Capabilities

### New Capabilities
- `pi-xai-prompt-suggest`: 约束 pi-xai fork 中 next-prompt ghost 的加载策略——默认不注册、不预填编辑器。

### Modified Capabilities
- （无）

## Capabilities 待确认项

- [x] 能力清单已与用户确认：采用「直接不注册」方案，而非仅 `enabled = false`

## Impact

- **Runtime**：加载 `git:github.com/nantas/pi-xai` 后，任务结束不再出现 ghost 预填；`/xai-suggest` 命令不可用（因未 register）
- **API 成本**：不再发起 Composer 建议请求
- **Fork 仓库**：`index.ts` 一行级改动 + 文档；版本建议 bump `0.17.1`
- **pi-config**：`forks/manifest.yaml` 摘要更新；settings 源在 dev/prod 间切换
- **Breaking**：依赖 `/xai-suggest` 或默认 ghost 的用户失去该能力（本环境主动选择关闭）

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准：`.pi/skills/pkg-fork-dev/SKILL.md`
  - 项目：`repo://pi-xai`、`forks/manifest.yaml`
  - 回写：`repo://pi-xai` 源码与文档；`forks/manifest.yaml`
