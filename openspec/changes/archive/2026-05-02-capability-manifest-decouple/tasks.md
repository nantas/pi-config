# Tasks

## 1. 能力清单数据结构

- [x] 1.1 创建 `.pi/capabilities.yaml`，包含完整的 `global` 和 `catalog` 段
  - **Spec 覆盖**: `capability-manifest` — all ADDED Requirements
  - **内容**: `global` 段声明 agent_md、extensions (dollar-skill-invoke, planner-toggle, output-scroll-viewer)、agents (dispatch-planner, code-writer)、skills (install-from-pi-config)、settings.packages (5 global packages)、settings.exclude_keys (defaultThinkingLevel, defaultProvider, defaultModel, subagents)
  - **内容**: `catalog` 段声明 skills (obsidian-search with dependency on obsidian-tools, pi-extension-dev, pkg-research)、extensions (obsidian-tools with has_package_json: true)、packages (pi-mcp-adapter@2.5.1, lsp-pi with type: settings-entry)
  - **验证**: `yq eval .global.settings.packages .pi/capabilities.yaml` 返回 5 项白名单；`yq eval .catalog.packages | length` 返回 2

## 2. 全局安装技能

- [x] 2.1 创建 `.pi/skills/install-from-pi-config/SKILL.md`
  - **Spec 覆盖**: `install-from-pi-config` — all ADDED Requirements
  - **实现路径**: 定义 Phase 1-6 工作流（读 catalog → 匹配 → 解析依赖 → file-based 复制 / settings-entry 编辑 → npm install → 验证）
  - **关键逻辑**:
    - Phase 1: 读取 `~/.pi/agent/catalog/pi-config.yaml` 获取 catalog 和 `source_repo_path`
    - Phase 3: 遍历 `requires.extensions` 递归解析，提示用户确认完整安装清单
    - Phase 4: file-based → `cp -R {source}/.pi/{type}s/{name}/ {target}/.pi/{type}s/{name}/`；settings-entry → 编辑 target `packages[]` 追加 source
    - Phase 4b (settings-entry): 告知 "已添加 {source} 到 .pi/settings.json，请重启 Pi 完成安装"
    - Phase 5: 如有 `has_package_json: true` → `npm install --no-package-lock --ignore-scripts`
  - **验证**: 其他仓库中 agent 可通过 `$install-from-pi-config` 触发该技能

## 3. Sync 脚本改造

- [x] 3.1 重写 `scripts/sync-pi-agent.sh` 支持 manifest 驱动
  - **Spec 覆盖**: `pi-runtime-bootstrap-sync` (modified path mapping + catalog publish + stale cleanup) + `pkg-global-sync` (whitelist filtering)
  - **实现路径**:
    - 移除硬编码 MAPPINGS 数组
    - 新增 `parse_capabilities()` 函数：用 `yq` 或 node 解析 `.pi/capabilities.yaml`
    - 全局 extensions: 遍历 `global.extensions[]`，单文件扩展 → `cp`，目录扩展 → `cp -R`
    - 全局 agents: 遍历 `global.agents[]`，`cp .pi/agents/{name}.md → target/agents/{name}.md`
    - 全局 skills: 遍历 `global.skills[]`，`cp -R .pi/skills/{name}/ → target/skills/{name}/`
    - Settings 过滤: 读取 `.pi/settings.json` → 过滤 packages 为 `global.settings.packages` → 移除 `exclude_keys` → 渲染 local path → 写入
    - Catalog 发布: 将 catalog 段 + `source_repo_path` 写入 `~/.pi/agent/catalog/pi-config.yaml`
    - Stale cleanup: 扫描 target extensions/agents/skills/，移除不在 manifest global 列表中的项
  - **验证**: 执行 sync 后，`~/.pi/agent/extensions/` 仅有 3 个文件、`~/.pi/agent/settings.json` 不含 defaultModel/subagents、`~/.pi/agent/catalog/pi-config.yaml` 存在且包含 catalog 段

## 4. 治理规则

- [x] 4.1 在 `AGENTS.md` 新增能力清单治理章节
  - **Spec 覆盖**: `capability-governance` — "AGENTS.md Must Require Capability Manifest Synchronization"
  - **内容**: 声明向 `.pi/` 添加/移除/修改 extension、skill、package、agent 时必须同步更新 `.pi/capabilities.yaml`
  - **位置**: 在"Tool Call Guidelines"或"Working Rules"之后新增一节
  - **验证**: grep "capabilities.yaml" AGENTS.md 返回相关规则条目

- [x] 4.2 更新 `.pi/skills/pkg-research/SKILL.md` — Phase 3 Decision 新增 manifest 写入
  - **Spec 覆盖**: `capability-governance` — "Pkg-Research Skill Must Write To Capability Manifest On Decision" + `pkg-decision-backlog` ADDED Requirements
  - **改动**: Phase 3 (Decision) 中，Option A 末尾新增 "更新 `.pi/capabilities.yaml` → `global.settings.packages` 追加 package source"；Option B 末尾新增 "更新 `.pi/capabilities.yaml` → `catalog.packages` 追加条目（含 name, source, description, type: settings-entry）"
  - **验证**: 对照修改前后 diff 确认新增段落

- [x] 4.3 更新 `.pi/skills/pi-extension-dev/SKILL.md` — Phase F Deployment 新增 manifest 写入
  - **Spec 覆盖**: `capability-governance` — "Pi-Extension-Dev Skill Must Write To Capability Manifest On Deployment" + `pi-extension-dev-skill` ADDED Requirements
  - **改动**: Phase F (Deployment + Archive) 中，sync 步骤之后、archive 步骤之前新增 "更新 `.pi/capabilities.yaml`：global scope → `global.extensions` 追加名称；optional scope → `catalog.extensions` 追加条目（含 name, source, description, has_package_json）"
  - **验证**: 对照修改前后 diff 确认新增段落

## 5. 收敛与验证

- [x] 5.1 检查 `.pi/capabilities.yaml` 声明与当前 `.pi/` 实际内容一致性
  - 所有 `global.extensions` 列出的文件在 `.pi/extensions/` 中存在
  - 所有 `global.agents` 列出的文件在 `.pi/agents/` 中存在
  - 所有 `catalog` skills/extensions 列出的文件在 `.pi/` 中存在
  - `global.settings.packages` 中的所有包在 `.pi/settings.json` packages 中存在
  - `catalog.packages` 中的所有包在 `.pi/settings.json` packages 中存在

- [x] 5.2 验证 sync 后的全局状态
  - `~/.pi/agent/extensions/` 仅含 3 个全局扩展
  - `~/.pi/agent/skills/` 仅含 install-from-pi-config
  - `~/.pi/agent/agents/` 含 dispatch-planner 和 code-writer
  - `~/.pi/agent/settings.json` packages 仅含 5 个全局包
  - `~/.pi/agent/settings.json` 不含 exclude_keys
  - `~/.pi/agent/catalog/pi-config.yaml` 存在且可解析

- [x] 5.3 验证 install-from-pi-config 技能可在其他仓库被发现
  - 在非 pi-config 仓库启动 Pi
  - 键入 `$install` → autocomplete 显示 install-from-pi-config
  - 验证技能内容符合 spec 定义的 Phase 1-6 工作流

## 6. 验证与回写收敛

- [x] 6.1 基于真实实现结果生成或更新 verification.md
- [x] 6.2 基于 verification.md 结论生成或更新 writeback.md
- [x] 6.3 执行 writeback 回写目标
