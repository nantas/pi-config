# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 capability spec `install-from-pi-config-overwrite` 的实现范围：仅修改 SKILL.md Phase 4 中两处目录覆盖逻辑
- [x] 1.2 确认无外部依赖：修改仅涉及 shell 命令调整，无需引入新工具或依赖

## 2. 核心实现任务

- [x] 2.1 修改 SKILL.md Phase 4 — Skills 目录覆盖分支：在用户确认 `overwrite=yes` 后、`cp -R "$SOURCE" "$TARGET"` 前插入 `rm -rf "$TARGET"`
  - 完成标准：SKILL.md 中 skills 分支覆盖路径包含 `rm -rf` → `cp -R` 序列
- [x] 2.2 修改 SKILL.md Phase 4 — Extensions 目录覆盖分支：在用户确认 `overwrite=yes` 后、`cp -R "$SOURCE" "$TARGET"` 前插入 `rm -rf "$TARGET"`
  - 完成标准：SKILL.md 中 extensions 分支覆盖路径包含 `rm -rf` → `cp -R` 序列
- [x] 2.3 确认首次安装路径和单文件扩展路径未受影响
  - 验证方式：对比修改前后 diff，确认仅涉及两个覆盖分支各增加一行 `rm -rf`

## 3. 收敛与验证准备

- [x] 3.1 模拟覆盖安装场景：在目标目录预置一个源端不存在的文件，执行覆盖安装后确认该文件已被清除
- [x] 3.2 模拟首次安装场景：确认目标目录不存在时行为不变（无 `rm -rf` 执行）

## 4. 验证与回写收敛

- [x] 4.1 生成 verification.md：记录 spec-to-implementation 覆盖矩阵与 task-to-evidence 对应关系
- [x] 4.2 生成本次 change 无需跨仓回写的结论（writeback.md）
