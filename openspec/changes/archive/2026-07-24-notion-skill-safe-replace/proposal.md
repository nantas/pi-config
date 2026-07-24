# Proposal

## 问题定义

Notion skill 的 `ntn-write --replace` 走 `replace_content` API，语义是删除整棵块树后重建。页面若挂有子页面或子数据库，Notion API 直接返回：

```
400 validation_error: This operation would delete N child page(s) or database(s)
```

这是 API 硬限制，不是脚本 bug。安全路径 `ntn-edit`（`update_content` 块级查找替换）已存在且不删块，但 SKILL.md 把「大内容替换」误导向 `--replace`，且 `ntn-edit --ops` 需手写 JSON，门槛高。

外部仓库使用时已踩坑并产出 handoff（`docs/plans/notion-skill-replace-childpage-trap-handoff.md`）。融合裁决（`.scratch/fusion-harness/fusion-harness-o9p9QA/`）确认：

1. **文档缺口**：agent 被引到危险路径
2. **工具缺口**：缺少「一键全量替换但保留子页面」的命令

## 范围边界

### 在范围内
- `ntn-write` 新增 `--safe-replace <markdown>`：读旧内容 → difflib 行级 diff → 前缀锚点映射 → `update_content`（永不删块）
- 边界降级：空页 → append；相同 → `changes: 0`；hunks > 100 → 结构化 error + 降级建议
- SKILL.md 三处补丁：ntn-edit 段修正、ntn-write 陷阱警告、Workflow Guide 指引
- 既有 notion 主 spec 增量：`ntn-write` 增加 safe-replace 场景；保留 `--replace` 作为无子页面逃生口
- 以 fusion 版 `ntn-write` 为参考实现落地（stdlib only，零新依赖）

### 不在范围内
- 新建独立脚本 `ntn-safe-replace`（拒绝碎片化；统一进 `ntn-write`）
- `--replace` 预检拦截（防御纵深，后续可选；本次靠文档 + `--safe-replace` 引导）
- `ntn-resolve` slug 前缀 URL 正则增强（独立 friction，另开 change）
- 修改 `ntn-edit` 行为
- 修改 `capabilities.yaml` / 其他 skill 脚本
- 自动执行全局 sync（需用户确认后另跑 `scripts/sync-pi-agent.sh`）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities
- `notion`: 扩展 `ntn-write` 支持 `--safe-replace`（子页面安全的内容替换），并修正 SKILL.md 对 `--replace` / `update_content` 的误导与决策路径

## Capabilities 待确认项

- [x] 能力清单已与用户确认（用户指定：按融合方案创建 change；fusion 已裁决载体/范围）

## Impact

### 对 notion skill
- **scripts/ntn-write**：新增 `--safe-replace`、`build_content_updates`、`safe_replace_content`；保留 `--set` / `--append` / `--replace`
- **SKILL.md**：三处文档补丁，引导 agent 在有子页面时优先 `--safe-replace` / `ntn-edit --ops`
- **全局 runtime**：需用户确认后 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/skills/notion/`

### 对主 spec
- `openspec/specs/notion/spec.md`：`ntn-write-props-and-content` 增加 `--safe-replace` 场景；可补充 child-page 安全约束

### 向后兼容
- `--replace` 保留，行为不变
- `ntn-edit` 不变
- 无新依赖（stdlib `difflib`）

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：`repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - 项目页：`repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
  - 回写目标：`repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
