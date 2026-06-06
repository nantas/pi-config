# Prompt-Over-Extension for Subagent Orchestration

删除了 ~35KB 的 `subagent-dispatch` 扩展，用 ~2KB 的 prompt 文件（`.pi/prompts/` 中的模板）替代。扩展虽然功能丰富，但锁定在 pi-subagents 0.20.1 API 上，每次上游升级都会断裂。prompt 方案虽然失去了 task 级别的 `projectContext` 控制，但与任何版本的 pi-subagents 兼容。
