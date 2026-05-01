# Proposal

## 问题定义

当前 `pkg-research` 技能只支持通过 `pi install -l` 安装的 npm/git package 源。大量 Pi 扩展以原始 `.ts` 文件形式分发（如 `github.com/disler/pi-vs-claude-code` 的 `tool-counter-widget`、`session-replay`），无法进入标准化调研流程。

同时，原有三选项 (Global / Backlog / Discard) 在 `2026-05-02-capability-manifest-decouple` 引入 global/catalog 分层后语义过时：

1. **Phase 2 安装裸奔**：`pi install -l` 直接修改 `.pi/settings.json`，先斩后奏
2. **Backlog 与 Catalog 混淆**：原有 Option B 将 backlog 记录和 catalog 注册耦合在一起
3. **Backlog schema 缺少 raw extension 字段**：Source Type、Source Repo、Install Method 等信息无法记录
4. **Clone 生命周期低效**：Phase 1 清理后 Phase 2 重新 clone，浪费网络和磁盘

## 范围边界

### 在范围内
- pkg-research Phase 2 新增 raw extension 分支检测与测试流程
- pkg-research Phase 3 三选项语义重构（A: 加入本仓库能力 → 子选 global/catalog；B: backlog 纯记录；C: 放弃）
- pkg-research Clone 生命周期优化（Phase 1 保留到 Phase 3 执行后清理）
- Backlog entry schema 扩展（新增 Source Type、Source Repo、Install Method、Has Dependencies）
- Phase 2 raw extension 分支的 npm 依赖检测（基于 `package.json` 存在性）
- Option C 可选拒绝记录
- 单个 backlog 条目记录单个资源（不 group）

### 不在范围内
- 修改 `scripts/sync-pi-agent.sh`（保持与 capability-manifest-decouple 一致的行为）
- 修改 `pi-extension-dev` 技能（其工作流不受本 change 影响）
- 修改 `install-from-pi-config` 技能
- 非 Pi 扩展类型（prompts、themes 等）的类似调研支持
- AST 级代码分析（保持基于 `package.json` 的依赖检测，不分析 import 语句）

## Capabilities

### New Capabilities
- `pkg-raw-extension-research`: 支持从外部 git 仓库调研 raw extension（非 package）—— Phase 2 分支检测、clone 复用、`pi -e` 测试命令输出、npm 依赖检测

### Modified Capabilities
- `pkg-decision-backlog`: 三选项语义重构为 "加入本仓库能力（子选 global/catalog）/ backlog 纯记录 / 放弃"；backlog entry schema 扩展；backlog 回归纯记录定位，不再与 catalog 混淆
- `pkg-security-review`: Phase 1 clone 保留到 Phase 3 清理（不立即清理），支持 raw extension Phase 2 复用
- `pkg-install-research`: Phase 2 新增 raw extension 分支——跳过 `pi install -l`，改为检测扩展列表、检查 package.json 依赖、输出 `pi -e` 测试命令并等待用户确认

## Capabilities 待确认项

- [x] 能力清单已与用户确认（用户已指定 single entry 模式、Option C 保留可选记录、npm 依赖基于 package.json 检测）

## Impact

### 对 pkg-research skill
- **SKILL.md Phase 2**：新增源类型分支判断、raw extension 检测/测试流程、clone 复用逻辑
- **SKILL.md Phase 3**：三选项语义重写、A 选项子决策流程（global/catalog）、backlog entry 写入使用新 schema
- **SKILL.md Phase 4**：A1 (global) 路径不变；A2 (catalog) 只需要写 manifest，不需要 Phase 4 sync
- **新增依赖**：`openspec/pkg-backlog.md` schema 文档更新

### 对 backlog 文件
- `openspec/pkg-backlog.md` schema header 更新
- 已有 backlog 条目不变（新 schema 字段在现有条目上可选）

### 对 capabilities.yaml
- 不改变 `global` 和 `catalog` 的结构
- 仅通过 catalog 写入标准化路径（`catalog.extensions` 用于 raw extension，`catalog.packages` 用于 package）

### 向后兼容
- 已有 package 调研流程不受影响（原有 `pi install -l` 路径保持）—— 本 change 新增分支，不修改现有流程
- 已有 backlog 条目无需迁移（新 schema 字段为可选扩展）
- 已有 Option A (Global) 行为不变（只是内部增加了从 A 到 A1 的子选择步骤）

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：`repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - 项目页：`repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
  - 回写目标：`repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
