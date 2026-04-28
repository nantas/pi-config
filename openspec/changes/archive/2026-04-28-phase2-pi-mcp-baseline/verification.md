# Verification

## 验证结论

- Phase 2 仓库内规划基线已落地：`docs/plans/pi-phase2-delivery-plan.md` 固定了目标文档路径、四个 workstream、优先级顺序，以及首条 `MCP` 轨道的出口条件。
- 首条 shared-first `MCP` 基线已落地：仓库根新增 `.mcp.json`，以 `gitnexus` 的最小 `command + args` 形态作为首个样本；`.pi/settings.json` 仅声明 `pi-mcp-adapter` package，不在 Pi 专属配置中重复服务器真源。
- Phase 1 边界保持不变：`.pi/mcp.json` 仍不存在，`scripts/sync-pi-agent.sh` 未引入 `.mcp.json`，`.mcp.json` 继续停留在跨 agent 共享层。
- 已获取真实运行时证据：`pi list` 能识别项目级 `npm:pi-mcp-adapter@2.3.4`；验证过程中 `pi config` 识别并启用了 `pi-mcp-adapter/index.ts`；随后按 `.mcp.json` 中的 `gitnexus mcp` 定义完成了一次 discover/connect/call 级别的 MCP 探针验证。
- writeback 已执行到 `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`。

## Spec-to-Implementation Coverage

| Capability spec | Requirement / scenario focus | Implementation evidence |
| --- | --- | --- |
| `pi-phase2-delivery-plan` | repository-local planning document path is stable | `docs/plans/pi-phase2-delivery-plan.md` |
| `pi-phase2-delivery-plan` | four workstreams and priority order are explicit | `docs/plans/pi-phase2-delivery-plan.md` 的 `Phase 2 Workstreams` 与 `Workstream Ordering Rationale` |
| `pi-phase2-delivery-plan` | `MCP` is justified as the first execution track | `docs/plans/pi-phase2-delivery-plan.md` 的 `Why Phase 2 Starts With MCP` |
| `pi-phase2-delivery-plan` | Phase 1 shared/runtime boundary is preserved | `docs/plans/pi-phase2-delivery-plan.md` 的 `Phase 1 Boundary Preservation`, `docs/pi-phase1-boundary.md` |
| `pi-phase2-delivery-plan` | exit criteria are explicit | `docs/plans/pi-phase2-delivery-plan.md` 的 `Exit Criteria` |
| `pi-mcp-shared-bridge` | repository-root `.mcp.json` is the shared source of truth | `.mcp.json` |
| `pi-mcp-shared-bridge` | Pi bridge is enabled through `.pi/settings.json` instead of Pi-local server truth | `.pi/settings.json`, `pi list` project package output |
| `pi-mcp-shared-bridge` | first sample server is minimal `gitnexus` | `.mcp.json` 的 `gitnexus` entry |
| `pi-mcp-shared-bridge` | `.mcp.json` stays outside Phase 1 sync scope | `scripts/sync-pi-agent.sh`, `docs/pi-phase1-boundary.md` 的 out-of-scope 列表 |
| `pi-mcp-shared-bridge` | first baseline stays on proxy-tool path, no `directTools` | `.mcp.json` 无 `directTools`，`docs/plans/pi-phase2-delivery-plan.md` 的 `First MCP Baseline Usage` |
| `pi-mcp-shared-bridge` | Pi usability loop is verifiable | 本文件 `运行时验证记录` |

## Task-to-Evidence Coverage

| Task | Evidence |
| --- | --- |
| 1.1 | `openspec/changes/phase2-pi-mcp-baseline/specs/pi-phase2-delivery-plan/spec.md`, `docs/plans/pi-phase2-delivery-plan.md` |
| 1.2 | `openspec/changes/phase2-pi-mcp-baseline/specs/pi-mcp-shared-bridge/spec.md`, `.mcp.json`, `.pi/settings.json` |
| 1.3 | `docs/pi-phase1-boundary.md`, `docs/plans/pi-customization-reference.md` 的 `MCP Integration via pi-mcp-adapter` |
| 2.1 | `docs/plans/pi-phase2-delivery-plan.md` |
| 2.2 | `.mcp.json` |
| 2.3 | `.pi/settings.json`, `pi list` output showing `npm:pi-mcp-adapter@2.3.4` |
| 2.4 | `test ! -e .pi/mcp.json`, `scripts/sync-pi-agent.sh` unchanged w.r.t. `.mcp.json` |
| 2.5 | `docs/plans/pi-phase2-delivery-plan.md` 的 `Phase 1 Boundary Preservation` 与 `First MCP Baseline Usage` |
| 3.1 | `docs/plans/pi-phase2-delivery-plan.md` 的目标路径、workstreams、exit criteria |
| 3.2 | `.mcp.json`, `.pi/settings.json`, `docs/pi-phase1-boundary.md`, `scripts/sync-pi-agent.sh` |
| 3.3 | 本文件 `运行时验证记录` |
| 4.1 | 本文件整体 |
| 4.2 | `openspec/changes/phase2-pi-mcp-baseline/writeback.md` |
| 4.3 | `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`，执行时间 `2026-04-28T15:31:30Z` |

## 关键证据入口

| 证据类型 | 证据路径/链接 | 对应 requirement/task |
| --- | --- | --- |
| Phase 2 规划文档 | `docs/plans/pi-phase2-delivery-plan.md` | 2.1, 3.1 |
| Shared MCP 真源 | `.mcp.json` | 2.2, 3.2 |
| Pi bridge package 声明 | `.pi/settings.json` | 2.3, 3.2 |
| Phase 1 边界文档 | `docs/pi-phase1-boundary.md` | 1.3, 2.4, 3.2 |
| Sync 入口脚本 | `scripts/sync-pi-agent.sh` | 2.4, 3.2 |
| `pi-mcp-adapter` 参考输入 | `docs/plans/pi-customization-reference.md` 的 `4. MCP Integration via pi-mcp-adapter` | 1.3 |
| Writeback 目标页 | `repo://orbitos/20_项目/Pi_Config/项目进度总览.md` | 4.3 |

## 运行时验证记录

### Pi bridge package discovery

- `pi list` 输出：
  - `Project packages:`
  - `npm:pi-mcp-adapter@2.3.4`
- 验证过程中打开 `pi config`，资源面板识别到：
  - `npm:pi-mcp-adapter@2.3.4 (project)`
  - `Extensions`
  - `[x] pi-mcp-adapter/index.ts`

### Shared-first MCP discover / connect / call probe

使用 `.mcp.json` 中的 `gitnexus` 定义，按 `command: "gitnexus"` 与 `args: ["mcp"]` 启动 stdio MCP 探针，得到以下结果：

- discover:
  - 成功列出 `13` 个工具
  - 首批工具名包含 `list_repos`, `query`, `cypher`, `context`, `detect_changes`, `impact`
- connect:
  - MCP client 能成功连接到 `gitnexus mcp` 进程并完成 `listTools`
- call:
  - 成功调用 `list_repos`
  - 返回已索引仓库列表，包含 `GitNexus`, `neonnew-core`, `codex`, `claude-code`, `neonspark`

该探针验证使用的 transport 形态与 `pi-mcp-adapter` 的 stdio server 连接模型一致，因此足以证明共享 `.mcp.json` 的 `gitnexus` 样本具备 discover/connect/call 的可执行性。

## 缺口与阻塞项

- 无实现阻塞。
- 本次 change 只建立首条 shared-first `MCP` 基线，不引入 `.pi/mcp.json`、`directTools`、多 server 编排或 `.mcp.json` 自动同步扩展。
