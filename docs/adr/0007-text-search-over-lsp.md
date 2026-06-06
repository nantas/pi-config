# Text Search over LSP for Agent Code Intelligence

移除了 serena MCP（提供 LSP 语义搜索、跨文件重命名、代码诊断），用 fff（`ffgrep`/`fffind`）的 frecency 排序文本搜索替代。代码重命名从 `rename_symbol` 回退到 `bash sed`。选择效率优先：LSP 进程启动慢、配置脆弱、需要维护语言服务器；fff 毫秒级响应、零外部依赖、frecency 排序在实际使用中足够精准。
