# Design

## Context

`trellis-analytics.ts` 是一个 Pi 扩展，在 Pi session 中被动追踪 Trellis 框架的 skill 加载、phase context 注入、invoke 解析和 reference 消费。当前实现在 `export default function(pi)` 入口无条件注册所有事件处理器和 `trellis_analytics` 工具，导致在任何仓库（包括非 Trellis 项目）都会创建 `.trellis/.analytics/` 目录。

修改目标文件：`.pi/extensions/trellis-analytics.ts`，入口函数约 20 行处。

## Goals / Non-Goals

**Goals:**
- 在扩展入口添加 `.trellis/config.yaml` 存在性检查，非 Trellis 仓库静默退出
- 确保哨兵检查在 dedup guard 之前执行
- 保持 Trellis 仓库中的现有行为完全不变

**Non-Goals:**
- 不实现向上遍历查找 `.trellis/` 的逻辑（Pi 总是从仓库根启动）
- 不自动清理已存在的遗留 `.trellis/.analytics/` 目录
- 不修改 Trellis 框架本身

## Decisions

| 决策 | 选项 | 结论 | 理由 |
|------|------|------|------|
| 哨兵文件 | `.version` vs `config.yaml` vs 目录存在 | `config.yaml` | 用户明确指定；`config.yaml` 是 Trellis init 创建的配置文件，语义更明确 |
| 退出策略 | 静默 return vs 注册降级工具 | 静默 return | 非 Trellis 仓库无需任何 analytics 功能，完全退出最干净 |
| 检查位置 | dedup guard 之前 vs 之后 | 之前 | 非 Trellis 仓库不应设置任何 globalThis 状态 |
| 路径解析 | `process.cwd()` vs 向上遍历 | `process.cwd()` | Pi 扩展从仓库根启动，无需向上查找 |

## Risks / Migration

- **风险极低**: 仅添加一个 `fs.existsSync` 检查，一行提前返回
- **无迁移**: Trellis 仓库中 `config.yaml` 始终存在，行为不变
- **遗留清理**: 用户需手动删除非 Trellis 仓库中已存在的 `.trellis/.analytics/` 目录（本 change 不处理）
