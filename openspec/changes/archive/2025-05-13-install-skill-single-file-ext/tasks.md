# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `specs/install-skill-single-file/spec.md` 中 3 个 requirement 的实现范围 — `extension-source-type-detection`、`single-file-overwrite-handling`、`single-file-verification`
- [x] 1.2 确认修改目标仅为 `.pi/skills/install-from-pi-config/SKILL.md`，无新增依赖

## 2. 核心实现任务

- [x] 2.1 修改 SKILL.md Phase 4 扩展安装逻辑：在复制前检测 `{{source_repo_path}}/.pi/extensions/{{name}}.ts` 是否存在（文件），存在则用 `cp` 安装单文件；否则检测目录并用 `cp -R`；两者都不存在则报错 — 覆盖 `extension-source-type-detection`
- [x] 2.2 为单文件安装路径添加 overwrite 检查：目标文件已存在时提示确认 — 覆盖 `single-file-overwrite-handling`
- [x] 2.3 修改 SKILL.md Phase 6 验证逻辑：扩展验证增加 `[[ -f ".pi/extensions/{{name}}.ts" ]]` 路径 — 覆盖 `single-file-verification`

## 3. 包依赖解析实现

- [x] 3.1 确认 `specs/install-skill-single-file/spec.md` 中 `post-install-dep-resolution` requirement 的场景覆盖 — 扫描 import、跳过 core modules、批量安装、scoped package 支持
- [x] 3.2 扩展现有 Phase 5 npm Dependencies：新增单文件扩展的依赖检测逻辑，用 `grep -oP 'from\s+["\'](@?[^"\']+)["\']'` 提取 import 包名，排除 `node:` 前缀
- [x] 3.3 Phase 5 安装步骤：在目标仓库的 `.pi/npm/` 中执行 `npm install pkg1 pkg2 ...`（批量），覆盖 `post-install-dep-resolution`、`scoped-package-install`、`batch-install-efficiency`

## 4. 收敛与验证准备

- [x] 4.1 代码审查确认 SKILL.md 中所有修改正确且文档自洽
- [x] 4.2 标记 verification.md 检查点：Phase 4 支持文件/目录自动检测、Phase 5 支持单文件依赖解析、Phase 6 支持单文件验证

## 5. 验证与回写收敛

- [x] 5.1 生成 verification.md
- [x] 5.2 生成 writeback.md（无外部回写目标，记录完成状态）
