# Proposal

## 问题定义

`subagent-dispatch` 是一个注册 `dispatch` tool 和 `/dispatch` command 的 Pi extension 功能模块，但它当前存储于 `.pi/packages/subagent-dispatch/` 路径下，通过 `.pi/settings.json` → `packages` 数组加载。其功能本质、文件结构（`package.json` + `index.ts` + `core.js` + `node_modules/`）与 `obsidian-tools` 完全一致，而 `obsidian-tools` 已在 `.pi/extensions/obsidian-tools/` 路径下作为 extension 正常工作。

具体问题：
1. **路径与语义不一致**：功能是 extension（注册 tool + command），存储却在 `packages/` 下，使仓库布局混乱
2. **settings.json 冗余注册**：Extension 通过 `.pi/extensions/` 自动发现，无需在 `packages` 数组中声明；当前做法增加了维护负担
3. **capabilities.yaml 声明不直观**：`global.settings.packages` 中出现 `./packages/subagent-dispatch` 本地路径，与其 extension 本质不符；应移至 `global.extensions`
4. **sync 脚本额外逻辑**：`scripts/sync-pi-agent.sh` 需要特殊处理 `./packages/subagent-dispatch` → 绝对路径的渲染，而 extension 只需 manifest 声明即可
5. **obsidian-tools 有成熟先例**：同一个仓库内已有将「有 npm 依赖的 extension」放在 `.pi/extensions/<name>/` 的工作模式

## 范围边界

### 在范围内
- 将 `.pi/packages/subagent-dispatch/` 目录移至 `.pi/extensions/subagent-dispatch/`
- 从 `.pi/settings.json` → `packages` 数组中移除 `./packages/subagent-dispatch`
- 更新 `.pi/capabilities.yaml`：从 `global.settings.packages` 移除，追加到 `global.extensions`
- 调整 `scripts/sync-pi-agent.sh`：移除 `./packages/subagent-dispatch` 特殊渲染逻辑，改为 extension 子目录的 npm install 支持
- 更新 `AGENTS.md` 中 Done Definition 章节（若 migration 流程改变关闭标准）
- 更新 `~/.pi/agent/settings.json` 验证标准
- 验证：sync 后 `~/.pi/agent/settings.json` packages 从 4 项减为 3 项；`~/.pi/agent/extensions/` 从 3 个变为 4 个

### 不在范围内
- 不修改 `subagent-dispatch` 的代码逻辑（`index.ts`、`core.js`、`package.json`、`node_modules/` 内容不变）
- 不升级 `pi-subagents` 版本或其他依赖
- 不改动 `obsidian-tools` 或已有 extensions 的模式
- 不创建新的 capability spec（本 change 是纯结构性迁移，无行为规范变化）
- 不涉及其他仓库（仅 pi-config 仓库内操作）

## Capabilities

### New Capabilities
（无 — 本 change 是结构性迁移，不引入新能力）

### Modified Capabilities
- `pi-runtime-bootstrap-sync`: Sync 脚本的 `ensure_local_package_dependencies` 需调整：移除 package 路径的 npm install，为 extension 子目录添加 npm install 支持；移除 settings 渲染中的 `./packages/subagent-dispatch` → 绝对路径转换
- `capability-manifest`: 将 subagent-dispatch 的 manifest 声明从 `global.settings.packages` 移至 `global.extensions`，反映其 extension 本质

## Capabilities 待确认项

- [x] 能力清单已与用户确认——纯结构性迁移，无新能力

## Impact

### 对 pi-config 仓库
- **目录移动**：`.pi/packages/subagent-dispatch/` → `.pi/extensions/subagent-dispatch/`
- **修改文件**：
  - `.pi/settings.json` — 从 `packages` 数组移除 `./packages/subagent-dispatch`
  - `.pi/capabilities.yaml` — 从 `global.settings.packages` 移除，追加到 `global.extensions`
  - `scripts/sync-pi-agent.sh` — 移除 package 本地路径渲染逻辑，调整 npm install 逻辑到 extension 路径
  - `AGENTS.md` — 可选：更新 Done Definition 中的仓库设置状态描述
- **删除文件**：无需删除，整体目录移动
- **全局运行时变化**：
  - `~/.pi/agent/extensions/` 新增 `subagent-dispatch/`（含 `index.ts` 入口）
  - `~/.pi/agent/settings.json` packages 数组减少 1 项（从 4 项变为 3 项）

### 对其他仓库
- 无影响。subagent-dispatch 是 pi-config 仓库的 dispatch 工具，对其它仓库不可见（不在 catalog 中）

### 向后兼容
- 功能完全不变：`dispatch` tool 和 `/dispatch` command 继续工作
- 只需重启 Pi 或 `/reload` 使 extension 从新路径加载
- `~/.pi/agent/settings.json` 中已同步的 `./packages/subagent-dispatch` 绝对路径条目会在下次 sync 后移除

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页：`repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
- 已确认项目页：`repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
- 已确认回写目标：`repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
