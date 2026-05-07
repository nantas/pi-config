# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认三个 capability specs（pkg-fork-dev, fork-manifest, fork-integration）的实现范围覆盖所有 requirements
- [x] 1.2 确认 `repo-registry` skill 可用（`python3 scripts/repo-registry.py list` 可执行）

## 2. 核心实现任务

### 2.1 fork-manifest — 创建 forks/manifest.yaml

- [x] 2.1.1 创建 `forks/manifest.yaml`，包含 YAML 头部注释（schema 说明）和空的 `forks: []` 列表
  - **Spec 覆盖:** fork-manifest — Manifest file location and format, Fork entry schema
  - **验证:** `forks/manifest.yaml` 文件存在，是合法 YAML，包含 `forks` 顶层键

### 2.2 pkg-fork-dev — 创建 skill 文件

- [x] 2.2.1 创建 `.pi/skills/pkg-fork-dev/SKILL.md`，包含 YAML frontmatter（name、description、use when / do NOT use for）
  - **Spec 覆盖:** pkg-fork-dev — Skill file structure
  - **验证:** 文件存在，frontmatter 格式正确

- [x] 2.2.2 编写 Workflow Overview 表格（Phase A-F + name + exit criteria）
  - **Spec 覆盖:** pkg-fork-dev — 所有 6 个 Phase requirements
  - **验证:** 表格列出 A-F 共 6 个阶段

- [x] 2.2.3 编写 Phase A — Fork & Setup（A1-A9 步骤，覆盖 npm→git 和 git→git 两种场景）
  - **Spec 覆盖:** pkg-fork-dev — Phase A requirement + 3 scenarios
  - **验证:** Phase A 包含上游类型检测、ask_user clone 路径、repo-registry 注册、manifest 写入、settings.json 更新、capabilities.yaml 更新、pi install、baseline 验证

- [x] 2.2.4 编写 Phase B — Modification Planning（B1-B5 步骤，含 OpenSpec 可选指引）
  - **Spec 覆盖:** pkg-fork-dev — Phase B requirement + 2 scenarios
  - **验证:** Phase B 包含代码阅读、目标识别、设计决策、OpenSpec 可选、用户确认

- [x] 2.2.5 编写 Phase C — Implementation（C1-C4 步骤）
  - **Spec 覆盖:** pkg-fork-dev — Phase C requirement
  - **验证:** Phase C 包含代码修改、测试运行、文档更新、diff review

- [x] 2.2.6 编写 Phase D — Local Testing（D1-D5 步骤，file: install + 迭代）
  - **Spec 覆盖:** pkg-fork-dev — Phase D requirement + 2 scenarios
  - **验证:** Phase D 包含 settings.json 切换、pi install -l file:、启动验证、迭代修复

- [x] 2.2.7 编写 Phase E — Commit & Ship（E1-E7 步骤）
  - **Spec 覆盖:** pkg-fork-dev — Phase E requirement
  - **验证:** Phase E 包含 commit、tag、push、settings.json 恢复、remote reinstall、manifest 更新、backlog 记录

- [x] 2.2.8 编写 Phase F — Maintenance（F1-F6 步骤，含 merge 决策矩阵）
  - **Spec 覆盖:** pkg-fork-dev — Phase F requirement + 2 scenarios
  - **验证:** Phase F 包含 fetch、diff、merge 决策、manifest 更新、回归检测

- [x] 2.2.9 编写 Appendix（Skill 路径表、与 pkg-research/pi-extension-dev 的边界说明）
  - **Spec 覆盖:** pkg-fork-dev — Skill file structure
  - **验证:** Appendix 包含关键路径引用和边界说明

### 2.3 fork-integration — 更新 capabilities.yaml

- [x] 2.3.1 在 `.pi/capabilities.yaml` 的 `catalog.skills` 中追加 `pkg-fork-dev` 条目（name、source、description）
  - **Spec 覆盖:** fork-integration — Capabilities.yaml source update（本 change 自身的 skill 注册）
  - **验证:** `catalog.skills` 包含 `pkg-fork-dev`，字段完整

## 3. Pilot 验证

- [x] 3.1 Pilot 1 — pi-tool-display：执行 Phase A（git→git fork），验证 skill 工作流可用
  - **Spec 覆盖:** pkg-fork-dev — Phase A / fork-integration — Settings.json source update
  - **验证:** `forks/manifest.yaml` 包含 pi-tool-display 条目，settings.json 来源已更新

- [x] 3.2 Pilot 2 — pi-mcp-adapter：执行 Phase A（npm→git fork），验证 npm→git 切换路径
  - **Spec 覆盖:** pkg-fork-dev — Phase A (npm scenario) / fork-integration — Capabilities.yaml source update
  - **验证:** `forks/manifest.yaml` 包含 pi-mcp-adapter 条目，settings.json + capabilities.yaml 来源已更新，`.pi/npm/package.json` 无残留

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 verification.md（覆盖 spec-to-implementation 与 task-to-evidence）
- [x] 4.2 基于 verification.md 结论生成或更新 writeback.md（目标、字段映射、前置条件）
- [x] 4.3 执行 writeback.md 中定义的回写目标，并记录可审计证据
