# Design

## Context

`.pi/skills/install-from-pi-config/SKILL.md` 中 Phase 4 的目录覆盖安装逻辑使用 `cp -R` 合并拷贝。当源仓库删除了某些文件后再次覆盖安装时，目标目录中会残留已删除的旧文件。这些残留文件可能被 Pi runtime 扫描执行，导致意外的运行时行为。

参考规范：`specs/install-from-pi-config-overwrite/spec.md`

## Goals / Non-Goals

**Goals:**

- 覆盖安装目录型 skill/extension 时，确保目标目录内容与源端完全一致
- 保持用户确认流程不变（覆盖前仍需确认）
- 保持首次安装行为不变（目标目录不存在时不执行删除）

**Non-Goals:**

- 不改变单文件扩展的安装逻辑
- 不改变 settings-entry 类型安装逻辑（Phase 4b）
- 不添加目录差异对比或增量同步功能
- 不改变 Phase 3（依赖解析）或 Phase 5/6（npm 安装/验证）

## Decisions

1. **删除策略：覆盖确认后先 `rm -rf` 再 `cp -R`**
   - 在用户确认 `overwrite=yes` 之后、执行 `cp -R` 之前，插入 `rm -rf "$TARGET"`
   - 这是最简单且可靠的方案，确保目标目录内容与源端完全一致
   - 替代方案（`rsync --delete`）引入额外依赖，不符合 skill 的 shell-only 定位

2. **修改位置：SKILL.md 中 Phase 4 的两个分支**
   - Skills 目录覆盖分支：在 `cp -R "$SOURCE" "$TARGET"` 前插入 `rm -rf "$TARGET"`
   - Extensions 目录覆盖分支：在 `cp -R "$SOURCE" "$TARGET"` 前插入 `rm -rf "$TARGET"`
   - 单文件扩展分支和首次安装路径不做修改

## Risks / Migration

- **风险极低**：修改仅在用户明确确认覆盖后执行，不改变安装流程结构
- **无迁移需求**：此修改仅影响未来的覆盖安装行为，已安装的 skill/extension 不受影响
- **唯一注意点**：如果用户在目标目录中有自定义修改（未同步回源仓库），覆盖安装会丢失这些修改——但这是覆盖安装的预期行为，用户已在 Phase 4 确认环节被告知
