# Design

## Context

Pi 的包管理器通过 `getPackageIdentity()` 为每个包源计算 identity key：

| 源类型 | Identity 格式 | 示例 |
|--------|--------------|------|
| npm | `npm:<name>` | `npm:pi-tool-display` |
| git | `git:<host>/<path>` | `git:github.com/nantas/pi-tool-display` |
| local | `local:<resolved-path>` | `local:/Users/.../forks/pi-tool-display` |

`dedupePackages()` 使用 identity 去重：project scope 覆盖 user scope。但 **不同源类型指向同一包时 identity 不匹配**，导致双重加载。

`pkg-fork-dev` Phase D 将项目 `.pi/settings.json` 中的 `git:` 源切换为本地路径。此时项目产生 `local:` identity，全局仍是 `git:` identity → 去重失败 → 双重加载 → 工具冲突。

Phase E 将项目源恢复为 `git:` URL。此时项目与全局的 identity 匹配 → 去重正常 → 无冲突。

## Goals / Non-Goals

**Goals:**
- Phase D 切换到本地路径前，自动检测并移除全局 settings 中 identity 不匹配的同名包条目
- 持久化记录被移除的条目，确保 session 丢失后可恢复
- Phase E 恢复项目源后，自动恢复全局 settings 中被移除的条目并清理记录
- 新增 `docs/reference/pi-package-loading.md` 参考文档

**Non-Goals:**
- 不修改 Pi 运行时的去重机制
- 不修改 `capabilities.yaml` 或全局同步策略
- 不处理非 `pkg-fork-dev` 场景下的全局/项目冲突

## Decisions

**1. 全局去重检测方式**

对比项目 settings 中即将切换的本地路径包名与全局 settings 中所有 git/npm 包的名称部分。匹配逻辑：从全局条目中提取包名（如 `git:github.com/nantas/pi-tool-display` → `pi-tool-display`），与本地路径的目录名对比。

**2. 持久化记录位置**

两种场景使用不同位置：

- **有 OpenSpec change**：记录在 `writeback.md` 的 `## Phase D Global Override State` section。理由：writeback.md 本身是 change 状态追踪文件，随 change 归档自动清理。
- **无 OpenSpec change（简单 fork 修改）**：记录在 `<dev-clone>/.pi-dev-state.json`。理由：dev clone 在 repo-registry 中注册，任何 session 可通过 `repo://<name>` 定位。

**3. 恢复触发点**

- Phase E4（restore source）：恢复全局 settings + 清理记录
- 手动恢复兜底：新 session 发现持久化记录后提示用户

**4. 参考文档结构**

`docs/reference/pi-package-loading.md` 覆盖：
- Pi 包加载完整链路（`resolve()` → `dedupePackages()` → `resolvePackageSources()` → 加载）
- `getPackageIdentity()` 三种源类型的 identity 计算
- `dedupePackages()` 的 scope 覆盖规则
- 冲突诊断 checklist（含 `detectExtensionConflicts()` 报错模式）
- 与 `pi-tool-api-dependency.md` 的关系：后者聚焦 `ExtensionAPI` 接口边界，本文档聚焦包管理器的加载与去重

## Risks / Migration

- **全局 settings 损坏风险**：操作 `~/.pi/agent/settings.json` 时使用原子写入（temp file + rename），并在修改前读取现有内容保留所有其他条目
- **记录丢失风险**：如果 dev clone 被删除且无 OpenSpec change，`.pi-dev-state.json` 随之丢失。此时需要用户手动检查全局 settings 是否有多余条目。风险可接受，因为 dev clone 删除意味着 fork 开发终止
- **跨机器差异**：不同机器的全局 settings 内容不同，D1a 在每次 Phase D 执行时检查当前机器的实际全局 settings，不依赖缓存
