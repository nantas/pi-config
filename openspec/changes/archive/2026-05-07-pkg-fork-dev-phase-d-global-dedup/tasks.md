# Tasks

## 1. 参考文档

- [x] 1.1 创建 `docs/reference/pi-package-loading.md`，内容涵盖：
  - Pi 包加载完整链路（`resolve()` → `dedupePackages()` → `resolvePackageSources()` → 加载）
  - `getPackageIdentity()` 三种源类型的 identity 计算规则与示例
  - `dedupePackages()` 的 scope 覆盖规则（project > user）
  - `mergePaths()` 的 canonicalizePath 去重（扩展级别，与包级别去重区分）
  - `detectExtensionConflicts()` 报错模式与常见原因
  - 冲突诊断 checklist
  - 与 `pi-tool-api-dependency.md` 的关系说明
- [x] 1.2 确认文档不含敏感或过时信息，源码引用注明 Pi 版本/commit 范围

## 2. pkg-fork-dev SKILL.md 更新

### Phase D — 新增全局去重门禁

- [x] 2.1 在 D1 之后新增 D1a 步骤：
  - 读取 `~/.pi/agent/settings.json` 的 packages 数组
  - 对比即将切换到本地路径的包名与全局中 git/npm 条目的包名部分
  - 若存在匹配：从全局 settings 移除该条目，使用原子写入
  - 将被移除的条目记录到持久化位置
- [x] 2.2 定义持久化记录的两种格式：
  - OpenSpec change 场景：写入 `writeback.md` 的 `## Phase D Global Override State` section
  - 独立 fork 修改场景：写入 `<dev-clone>/.pi-dev-state.json`
- [x] 2.3 在 D5 之后新增 D5a 步骤：确认持久化记录已正确写入

### Phase E — 扩展全局恢复

- [x] 2.4 扩展 E4 步骤：恢复项目源后，从持久化记录读取被移除的全局条目，重新写入 `~/.pi/agent/settings.json`
- [x] 2.5 E4 恢复后清理持久化记录（删除 `.pi-dev-state.json` 或清除 writeback.md 中的 override section）
- [x] 2.6 扩展 E5a 验证步骤：确认全局 settings 不含本地路径条目，确认项目源已恢复为 git URL

### 通用 — Session 丢失恢复引导

- [x] 2.7 新增附录"Session 丢失恢复"：描述三种发现异常状态的路径（OpenSpec change 状态、`.pi-dev-state.json` 存在性、全局/项目 settings 对比）

## 3. 验证与回写收敛

- [x] 3.1 生成 verification.md
- [x] 3.2 生成 writeback.md
- [x] 3.3 执行 writeback 回写（更新 `docs/reference/` 索引、确认 SKILL.md 变更）
