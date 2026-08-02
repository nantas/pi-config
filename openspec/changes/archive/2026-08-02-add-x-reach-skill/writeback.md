# Writeback

## 目标

- **目标页**：`CONTEXT.md`（本仓 OpenSpec 索引）
- **writeback 类型**：OpenSpec 索引追加新 spec slug

## 字段映射

| 位置 | 变更 | 内容 |
|------|------|------|
| `CONTEXT.md` → 「扩展」能力域组（skill 类，含 obsidian-search/notion 等） | 新增一行 | `X 检索、Twitter 检索、twscrape \| x-reach-skill` |

> 归入「扩展」组而非新建「互联网检索」组：x-reach 是 skill，与同组 obsidian-search/notion 性质一致；保持最小变更，不为单项新建分组。

## 前置条件

- [x] verification.md 结论 = 通过
- [ ] **change 已 archive**（`openspec/specs/x-reach-skill/spec.md` 由 delta 晋升为主 spec）
  - 依 AGENTS.md 规则：「执行 /opsx-archive 后，如果产生了新的主 spec，必须在归档摘要之后追加一步：更新 CONTEXT.md 的 OpenSpec 索引」

## 执行时机

**archive 阶段**（不在本 apply 阶段执行）：
1. `/opsx-archive` 将 `changes/add-x-reach-skill/specs/x-reach-skill/` 晋升为 `openspec/specs/x-reach-skill/`
2. 归档摘要后，edit `CONTEXT.md`「扩展」组追加该行
3. 提交，记录可审计证据（commit 链接、时间）

## 不做的事

- 不在 apply 阶段提前 edit CONTEXT.md（顺序依治理规则）
- 不回写 `.pi/capabilities.yaml`（已在 task 2.8 直接落地，非 writeback 范畴）
- 不回写 SKILL.md（实现产物，非页面回写）
- 不跨仓 writeback（binding 声明 writeback 目标本仓内）
