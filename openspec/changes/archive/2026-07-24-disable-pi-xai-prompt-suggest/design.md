# Design

## Context

规范真源：`specs/pi-xai-prompt-suggest/spec.md`。

`repo://pi-xai`（nantas fork）当前在 `index.ts` 无条件调用：

```ts
registerXaiPromptSuggest(api);
```

该注册会挂上 `/xai-suggest`、`agent_end` 预测与 `setEditorText(asGhostText(...))`。半删 ANSI ghost 导致编辑器状态损坏。本 change 按 spec 从入口切断注册。

工作流遵循 `pkg-fork-dev`：fork 与 registry 已存在；开发时切 `file:` 源，验证后 ship 回 `git:`。

## Goals / Non-Goals

**Goals:**
- 入口不注册 prompt-suggest（满足「Package loads without prompt-suggest hooks」）
- 任务结束后不预填 ghost（满足「Agent turn ends without ghost prefill」）
- 文档与 `forks/manifest.yaml` 记录策略
- 最短 diff，不扰动其他 pi-xai 能力

**Non-Goals:**
- 重写 ghost 为真浮层 / 修复半删清理逻辑
- 删除 `xai-prompt-suggest.ts` 或改其内部 `enabled` 默认
- 仅靠 `XAI_PROMPT_SUGGESTIONS=0` 而不改源码
- 改 pi-powerline / pi-tui

## Decisions

1. **Disable mechanism = skip registration**  
   在 `index.ts` 移除或注释掉 `registerXaiPromptSuggest(api)`（推荐删除调用行；import 一并去掉以免 unused）。  
   理由：比 `enabled=false` 更彻底——命令、handler、API 调用全不挂载，符合用户选定方案。

2. **Keep source file**  
   保留 `xai-prompt-suggest.ts` + 现有 unit tests（filter/transcript/ghost helpers）。不注册即满足 spec；删文件无额外收益。

3. **Version**  
   建议 patch `0.17.0` → `0.17.1`，CHANGELOG 记 fork 变更。

4. **pkg-fork-dev source switch**  
   - Dev：`.pi/settings.json`（及必要时全局）packages 中将 `git:github.com/nantas/pi-xai` 换为绝对 `file:/Users/nantasmac/projects/forks/pi-xai`  
   - Ship：push 后改回 `git:github.com/nantas/pi-xai`，`pi install`，防 double-load

5. **Manifest**  
   `forks/manifest.yaml` 的 `pi-xai.changes_summary` 追加：unregister prompt-suggest at entry（ghost disabled）。

## Risks / Migration

| 风险 | 缓解 |
|------|------|
| 用户仍想用 ghost | 需另开 change 恢复注册或做真浮层；本次明确 breaking 关闭 |
| 全局/项目 packages 同时指 git 与 file | 验证前全局 dedup 门禁；只保留一条源 |
| 缓存的旧 package 副本仍带注册 | `pi install` / 清 package cache 后 `/reload` |
| 上游 sync 可能再次引入注册调用 | Phase F 合并 upstream 时检查 `index.ts` 不重挂 |

**Migration：** 依赖 `/xai-suggest` 或默认 ghost 的工作流改为手动输入下一步。
