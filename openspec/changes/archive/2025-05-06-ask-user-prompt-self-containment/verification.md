# Verification

## 验证结论

实现满足 specs 中全部 requirement，无缺口。

## Spec-to-Implementation Coverage

| Requirement | Spec 来源 | 实现文件 | 覆盖状态 |
|-------------|-----------|----------|----------|
| prompt-self-containment | specs/ask-user-guidance/spec.md | `.pi/agent/AGENTS.d/tool-ask-user.md` "核心规则" + "反模式" + "正确做法" 三个章节 | ✅ 完整 |
| anti-pattern-documentation | specs/ask-user-guidance/spec.md | `.pi/agent/AGENTS.d/tool-ask-user.md` "反模式（禁止）" + "检查清单" 章节 | ✅ 完整 |
| agents-md-reference | specs/ask-user-guidance/spec.md | `.pi/agent/AGENTS.md` `### ask_user Tool` 小节 | ✅ 完整 |
| agents-md-tool-call-guidelines | specs/global-agent-guidance/spec.md | `.pi/agent/AGENTS.md` `### ask_user Tool` 小节（位于 MCP Tool / Dispatch 之后、Markdown Output Quality 之前） | ✅ 完整 |

## Task-to-Evidence Coverage

| Task | 状态 | 证据 |
|------|------|------|
| 1.1 确认 ask-user-guidance specs | ✅ | specs/ask-user-guidance/spec.md 包含 3 个 requirement |
| 1.2 确认 global-agent-guidance specs | ✅ | specs/global-agent-guidance/spec.md 包含 1 个 requirement |
| 1.3 确认无外部依赖 | ✅ | 纯本地文件变更，无上游依赖 |
| 2.1 创建 tool-ask-user.md | ✅ | 文件存在：`.pi/agent/AGENTS.d/tool-ask-user.md`（85 行，含四部分） |
| 2.2 修改 AGENTS.md | ✅ | `### ask_user Tool` 小节存在于第 40 行，位置正确（MCP 34→ask_user 40→Markdown 46） |
| 2.3 提示用户同步 | ✅ | 将在 closeout 时提示 |
| 3.1 检查点 tool-ask-user.md 内容 | ✅ | grep 确认四部分均存在 |
| 3.2 检查点 AGENTS.md section 位置 | ✅ | grep -n 确认 MCP→ask_user→Markdown 顺序 |
| 3.3 检查点链接可解析 | ✅ | 6 个 AGENTS.d 链接目标均存在 |

## 关键证据入口

| 证据类型 | 证据路径/链接 | 对应 requirement/task |
|----------|--------------|----------------------|
| 新增指导文件 | `.pi/agent/AGENTS.d/tool-ask-user.md` | prompt-self-containment, anti-pattern-documentation |
| AGENTS.md 引用节 | `.pi/agent/AGENTS.md` L40-44 | agents-md-reference, agents-md-tool-call-guidelines |
| section 位置验证 | `grep -n` 输出：MCP(34)→ask_user(40)→Markdown(46) | agents-md-tool-call-guidelines scenario: section-order |
| 链接可解析验证 | 所有 6 个 AGENTS.d 文件 `test -f` 通过 | agents-md-reference |

## 缺口与阻塞项

无缺口。所有 spec requirement 和 task 均已覆盖。
