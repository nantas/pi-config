# Design

## Context

当前 `pkg-research` 技能只有一条路径：`pi install -l` → 分析 → 决策。这无法处理纯 `.ts` 文件分发的 raw extension（如 `disler/pi-vs-claude-code`）。同时，原三选项语义在 `capability-manifest-decouple` 引入 global/catalog 分层后已过时：

- 原 Option A (Global) 混用了"本地安装"和"全局同步"两个维度
- 原 Option B (Backlog) 同时做 catalog 注册 + 回滚，语义不清
- 原 backlog 条目缺少 raw extension 的必要元数据字段

本 change 在 `pkg-research` 技能中新增 raw extension 分支路径，并重写决策选项以对齐 global/catalog 模型。

四个 capability 的关系：

```
pkg-security-review (modified)
  └─ clone 保留到 Phase 3，不复用创建

pkg-install-research (modified)
  ├─ 新增源类型检测分支
  └─ raw extension 分支：test-first，零 .pi/ 修改

pkg-raw-extension-research (new)
  ├─ 扩展列表展示
  ├─ npm 依赖检测 (package.json 存在性)
  ├─ pi -e 测试命令输出
  └─ 等待用户测试反馈

pkg-decision-backlog (modified)
  ├─ 新三选项：A (install+子选 global/catalog) / B (backlog纯记录) / C (放弃)
  ├─ backlog schema 扩展
  └─ catalog 决策不回滚本地安装
```

## Goals / Non-Goals

**Goals:**
- pkg-research Phase 2 支持 raw extension 源类型的检测与 test-first 流程
- pkg-research Phase 3 三选项语义重构，对齐 global/catalog 分层
- Backlog entry schema 扩展，支持 raw extension 元数据
- Clone 生命周期优化（Phase 1 保留到 Phase 3）
- npm 依赖检测基于 `package.json` 存在性（不分析 import 语句）
- Option C 保留可选拒绝记录

**Non-Goals:**
- 不修改 `scripts/sync-pi-agent.sh`（保持 capability-manifest-decouple 的行为）
- 不修改 `install-from-pi-config` 技能
- 不修改 `pi-extension-dev` 技能
- 不实现 AST 级代码分析（依赖检测只走 `package.json`）
- 不实现 collection-level backlog 条目（每个资源独立记录）
- 不处理非 extension 类型的 raw 资源（prompts、themes 等）

## Decisions

### Decision 1: Phase 2 源类型检测信号

**决策**：使用两个检查信号来判断源类型：
1. 根目录 `package.json` 是否存在 → package 源
2. `extensions/` 目录下是否有 `.ts` 文件 → raw extension 源
3. 两者都不匹配 → 报告未识别类型，询问用户

**理由**：`package.json` 是 npm package 的唯一标识。`.ts` 文件在 `extensions/` 下是 Pi 扩展的约定目录。不需要解析 `package.json` 内容来判断是否为 Pi 包（有 `pi` manifest 字段的才是 Pi 包，但 raw extension 没有 `package.json` 所以这步自然跳过）。

### Decision 2: 测试阶段使用 `pi -e` 而非复制到 `.pi/extensions/`

**决策**：Phase 2 raw extension 分支只提供 `pi -e <tmp path>` 临时加载命令，不修改 `.pi/` 目录。

**理由**：
- `pi -e` 是 Pi 的 ephemeral 扩展加载机制，不产生副作用
- 将实际安装延迟到 Phase 3 用户确认后，避免先斩后奏
- 临时 clone 路径在 Phase 2 全程可用

### Decision 3: 依赖检测基于 package.json 而非 import 分析

**决策**：检测 `extensions/<name>/package.json` 存在性。如果存在，在该目录下执行 `npm install`；如果不存在，跳过依赖处理。

**理由**：
- 用户明确指定不要分析 import 语句
- `package.json` 的存在性是 npm 依赖的唯一可靠信号
- `npm install` 是 Pi 扩展的标准依赖安装机制

### Decision 4: 三选项重构采用"先安装后分发"模式

**决策**：Option A 执行本地安装后，再选择分发范围（global vs catalog）。Option B 只记录 backlog，不安装也不写 manifest。

```
               Phase 3 入口
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
          A         B         C
          │         │         │
          ▼         ▼         ▼
    安装到 .pi/   纯记录    可选拒绝记录
          │
          ▼
    ┌─────┴─────┐
    ▼           ▼
  Global      Catalog
  (manifest:  (manifest:
   global.*)   catalog.*)
```

**理由**：
- 逻辑清晰：先 decide "要不要用这个能力"，再 decide "让谁也能用"
- 与 capability-manifest-decouple 的 global/catalog 模型一致
- B 选项回归 backlog 本质——研究日志而非分发渠道

### Decision 5: Clone 集中生命周期

**决策**：从 Phase 1 到 Phase 3 使用同一个临时 clone。Phase 1 审查后不清理，Phase 2 测试复用，Phase 3 决策执行后清理。

```
Phase 1: git clone → 审查报告 → 告知用户保留
Phase 2: 复用同一 clone → pi -e 测试
Phase 3: 执行决策 → rm -rf /tmp/<clone>
```

**理由**：避免重复 clone，节省网络和磁盘。原始 repository 在 Phase 1 已审查通过，复用没有安全风险。

### Decision 6: Backlog 保持条目级粒度

**决策**：来自同一源仓库的多个 extension 各自独立记录，不合并为 collection-level 条目。

**理由**：用户明确要求拆成单条。每个 extension 可能有不同的决策（A global / A catalog / B backlog）、不同的依赖情况、不同的使用方式。

## Risks / Migration

### Risk 1: 已有 backlog 条目不兼容新 schema

- **影响**：现有条目缺少 `Source Type`、`Source Repo`、`Install Method`、`Has Dependencies` 字段
- **缓解**：新 schema 字段对已有条目保持向后兼容（可选字段，系统不要求补完）。新写入的条目使用完整 schema

### Risk 2: Raw extension 的 future package.json 升级

- **影响**：raw extension 如果未来增加了 `package.json`，从 "零依赖" 变为 "有依赖"
- **缓解**：每次调研时实时检测，不缓存依赖信息。backlog 记录的 `Has Dependencies` 只是历史状态

### Risk 3: pi -e 测试用 clone 路径带绝对路径

- **影响**：如果用户在不同目录重启 pi session，`pi -e /tmp/<clone>/...` 路径可能失效
- **缓解**：用户的测试窗口在同一个 Phase 2 session 内，clone 路径在 session 生命周期内保持有效。Phase 2 提示用户"在当前 session 内测试"

### Risk 4: 已有 Option A (Global) 的用户习惯迁移

- **影响**：原有 Option A 一步到位（本地+全局），现在需要 A → A1 两步
- **缓解**：对于 package 源（原有流程），Phase 3 提示中清晰说明两步操作。sub-decision 默认预选 A1 (Global) 以匹配原有行为预期
