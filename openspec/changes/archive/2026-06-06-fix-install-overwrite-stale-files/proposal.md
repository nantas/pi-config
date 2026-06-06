# Proposal

## 问题定义

`install-from-pi-config` skill 在覆盖安装目录型 skill/extension 时，使用 `cp -R` 命令执行合并拷贝。`cp -R` 不会删除目标目录中源端已不存在的文件，导致上次安装后源仓库中已删除的文件在目标目录中残留。这些残留文件可能被 Pi runtime 扫描并执行，影响 extension 正常运行。

## 范围边界

- **修改范围**：`.pi/skills/install-from-pi-config/SKILL.md` 中 Phase 4 的目录覆盖安装逻辑
- **涉及场景**：skills 目录覆盖安装、extensions 目录覆盖安装
- **不涉及**：单文件扩展（`.ts`）的覆盖安装（直接 `cp` 覆盖无此问题）、settings-entry 类型安装（Phase 4b）
- **不涉及**：新增安装（目标目录不存在时无需清理）

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `install-from-pi-config-overwrite`: 修复覆盖安装时先删除目标目录再拷贝，确保安装结果与源端完全一致

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

- **低风险**：仅修改 skill 文件中的 shell 指令，不改变安装流程的整体结构
- **影响用户**：所有使用 `$install-from-pi-config` 覆盖安装 pi-config 仓库 skill/extension 的用户
- **向后兼容**：完全兼容，新安装（无已有目录）行为不变

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：无跨仓标准页，修改仅限 `.pi/skills/install-from-pi-config/SKILL.md`
