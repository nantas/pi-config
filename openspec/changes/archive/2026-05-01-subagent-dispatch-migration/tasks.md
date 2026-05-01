# Tasks

## 1. 目录迁移

- [x] 1.1 将 `.pi/packages/subagent-dispatch/` 移至 `.pi/extensions/subagent-dispatch/`
  - **Spec 覆盖**: `capability-manifest` — "Global Extension Follows Directory Pattern"
  - **实现路径**: `mv .pi/packages/subagent-dispatch/ .pi/extensions/subagent-dispatch/`
  - **验证**: `ls -d .pi/extensions/subagent-dispatch/` 返回目录；`ls .pi/extensions/subagent-dispatch/index.ts` 返回文件

- [x] 1.2 在 `.pi/packages/` 保留 `.gitkeep` 占位
  - **Design 覆盖**: Decision 3
  - **实现路径**: `touch .pi/packages/.gitkeep`
  - **验证**: `.pi/packages/.gitkeep` 存在

## 2. Manifest 声明更新

- [x] 2.1 从 `.pi/settings.json` → `packages` 数组移除 `./packages/subagent-dispatch`
  - **Spec 覆盖**: `capability-manifest` — "Manifest packages list excludes subagent-dispatch"
  - **实现路径**: 编辑 `.pi/settings.json`，从 `packages` 数组中删除 `"./packages/subagent-dispatch"` 行
  - **验证**: `node -e "const s=JSON.parse(require('fs').readFileSync('.pi/settings.json','utf8')); console.log(s.packages.includes('./packages/subagent-dispatch') ? 'FAIL' : 'OK')"` 返回 `OK`

- [x] 2.2 更新 `.pi/capabilities.yaml`：从 `global.settings.packages` 移除，追加到 `global.extensions`
  - **Spec 覆盖**: `capability-manifest` — ALL MODIFIED Requirements
  - **实现路径**: 在 `capabilities.yaml` 中删除 `global.settings.packages` 下的 `./packages/subagent-dispatch` 行；在 `global.extensions` 下追加 `subagent-dispatch`
  - **验证**: `yq eval .global.extensions .pi/capabilities.yaml` 包含 `subagent-dispatch`；`yq eval .global.settings.packages .pi/capabilities.yaml` 不包含 `./packages/subagent-dispatch`；`yq eval .global.settings.packages | length` 返回 3（比之前的 4 项少 1）

## 3. Sync 脚本调整

- [x] 3.1 移除 settings 渲染 node 脚本中的 `./packages/subagent-dispatch` → 绝对路径转换逻辑
  - **Spec 覆盖**: `pi-runtime-bootstrap-sync` — "Legacy local package path rendering is removed"
  - **实现路径**: 在 `scripts/sync-pi-agent.sh` 的 node 嵌入式脚本中，移除 `LOCAL_PACKAGE_SOURCE` 和 `LOCAL_PACKAGE_ROOT` 环境变量的传递，移除 packages 数组 map 中的 `entry === localPackageSource → localPackageRoot` 转换
  - **验证**: sync 后 `~/.pi/agent/settings.json` packages 中不再有 `/Users/nantas-agent/projects/pi-config/.pi/packages/subagent-dispatch`

- [x] 3.2 将 `ensure_local_package_dependencies` 改造为通用 extension npm install
  - **Spec 覆盖**: `pi-runtime-bootstrap-sync` — "Extension npm install triggers correctly"
  - **实现路径**: 将 `ensure_local_package_dependencies` 函数改为 `ensure_extension_dependencies`，扫描 `.pi/extensions/*/package.json`，对缺少 `node_modules/<key-dep>` 的目录执行 `npm install --no-package-lock --ignore-scripts`
  - **验证**: sync 时输出包含 "Installing dependencies for: obsidian-tools" 和 "Installing dependencies for: subagent-dispatch"（若 node_modules 缺失）；不缺失时跳过

- [x] 3.3 移除 `LOCAL_PACKAGE_SOURCE` / `LOCAL_PACKAGE_ROOT` / `LOCAL_PACKAGE_REL` 等不再需要的变量
  - **Design 覆盖**: Decision 4
  - **实现路径**: 删除脚本头部的 `LOCAL_PACKAGE_REL`、`LOCAL_PACKAGE_SOURCE`、`LOCAL_PACKAGE_ROOT` 变量定义；删除对应的环境变量 export
  - **验证**: `bash -n scripts/sync-pi-agent.sh` 返回语法 OK；sync 脚本正常运行

## 4. 收敛与验证

- [x] 4.1 验证目录移动完整性
  - 所有文件已移至新路径：`ls .pi/extensions/subagent-dispatch/` 包含 `package.json`、`index.ts`、`core.js`、`node_modules/`
  - 旧路径已清空：`ls .pi/packages/subagent-dispatch/` 返回 `No such file`（或仅 `.gitkeep`）
  - `node_modules/pi-subagents` 在新路径中可访问

- [x] 4.2 执行 sync 并验证全局状态
  - `~/.pi/agent/extensions/` 从 3 个变为 4 个（新增 `subagent-dispatch/`）
  - `~/.pi/agent/settings.json` packages 从 4 项减为 3 项（移除 `./packages/subagent-dispatch` 的绝对路径）
  - 验证：`pi -e .pi/extensions/subagent-dispatch/index.ts` 无加载错误
  - 验证：在 Pi 会话中 `/reload` 后 `dispatch` tool 和 `/dispatch` 命令正常工作

- [x] 4.3 验证 capabilities.yaml 声明与现状一致
  - `global.extensions` 列表长度为 4（含 `subagent-dispatch`）
  - `global.settings.packages` 列表长度为 3（不含 `./packages/subagent-dispatch`）

## 5. 验证与回写收敛

- [x] 5.1 基于真实实现结果生成或更新 verification.md
- [x] 5.2 基于 verification.md 结论生成或更新 writeback.md
- [x] 5.3 执行 writeback 回写目标
