# Verification

## 自动化验证

### Pi-mono 源码修改

| 验证项 | 状态 |
|--------|------|
| `agent-session.ts` getToolToolInfo 包含 label/execute | ✓ |
| `types.ts` ToolInfo Pick 包含 label/execute | ✓ |
| `runner.ts` getAllRegisteredTools 使用 last-write-wins | ✓ |
| JSDoc 已更新 | ✓ |

### 功能验证（通过本地 pi-test.sh 运行）

| 场景 | 预期 | 结果 |
|------|------|------|
| `gitnexus_query` Direct Tool 被 `isMcpToolCandidate` 识别 | label 含 "MCP:" → true | ✓ |
| `registerMcpToolOverrides()` 能获取 `execute` | `toolRecord.execute` 为函数 | ✓ |
| 重新注册的覆盖版本生效 | `getAllRegisteredTools()` last-write-wins | ✓ |
| `mcp` Proxy Tool 覆盖不受影响 | Proxy Tool 使用 `name === "mcp"` 硬性检查 | ✓ |

## 回归风险评估

- **`ToolInfo` 增加字段**：新增字段不影响现有消费者（只读 `.name`/`.description`/`.parameters`）
- **last-write-wins**：可能影响依赖 first-write-wins 阻止覆盖的模式。Pi 生态中无此类用例，且修复场景（渲染覆盖）是明确的合法用例
