# Proposal

## 问题定义

`trellis-analytics` 扩展在所有 Pi session 中无条件注册全部事件处理器和 `trellis_analytics` 工具，并在 `session_start` 时创建 `.trellis/.analytics/` 目录写入 JSONL 日志。这导致非 Trellis 仓库（如 `pi-config`）也会产生 `.trellis/.analytics/orphans/` 遗留数据，造成仓库污染和资源浪费。

根本原因：扩展入口函数 `export default function(pi)` 缺少仓库类型前置判断，不区分 Trellis 项目仓库与普通仓库。

## 范围边界

- **In scope**: 在扩展入口添加哨兵检测，非 Trellis 仓库提前退出，不注册任何处理器/工具/写入
- **Out of scope**: 不修改 Trellis 框架本身；不清理已存在的遗留 `.trellis/.analytics/` 目录（用户手动处理）；不实现向上遍历查找 `.trellis/` 的逻辑
- **哨兵文件选择**: `.trellis/config.yaml` —— Trellis 框架初始化时创建的配置文件，是 Trellis 项目仓库的明确标识

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `trellis-repo-guard`: 为 trellis-analytics 扩展添加基于 `.trellis/config.yaml` 哨兵文件的前置检测，非 Trellis 仓库静默跳过全部注册与写入

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

- **低风险**: 仅在扩展入口添加一个文件存在性检查，不影响 Trellis 仓库中已有的任何行为
- **正向影响**: 非 Trellis 仓库不再产生无意义的 `.trellis/.analytics/` 目录和文件
- **无破坏性**: Trellis 仓库中 `.trellis/config.yaml` 始终存在，行为完全不变

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：无外部标准页，修改目标为 `.pi/extensions/trellis-analytics.ts`，无外部回写目标
