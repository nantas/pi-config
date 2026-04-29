# Proposal

## 问题定义

当前 pi-config 仓库缺乏对第三方 Pi packages（npm/git 安装的扩展包）的结构化调研、测试和管理工作流。用户发现一个待研究的 package 时，没有标准化流程来：

1. 在安装前对源码进行安全性审查
2. 在隔离的项目环境下安装并测试功能
3. 做出加入全局配置、记录到 backlog 或丢弃的决策
4. 将全局配置变更通过 sync 脚本同步到 `~/.pi/agent/`

缺少此工作流导致：未经审查的包可能被直接全局安装带来安全风险；好的包可能被遗忘而非被系统化跟踪；全局配置变更缺乏追溯。

## 范围边界

### 范围内
- 用户通过自然语言 prompt 提供 package URL 或包名，LLM agent 自行解析定位
- 安装前的安全性审查（临时 clone 只读检查可疑代码、网络请求、命令执行、混淆代码等）
- 项目级隔离安装（`pi install -l`），不污染全局环境
- 功能调研：包结构分析、依赖检查、功能测试、冲突检查
- 三选一决策：加入全局配置 / 记录到 backlog / 丢弃
- 加入全局配置时更新 `.pi/settings.json` 并可通过 `scripts/sync-pi-agent.sh` 同步
- Backlog 以 Markdown 文件持久化记录
- 决策完全由用户驱动，不确定时暂停并请求用户确认

### 范围外
- 不自动创建新的 Pi packages（已有 `pi-extension-dev` skill 覆盖）
- 不修改 pi-mono 核心代码
- 不实现 web-based package gallery 搜索
- 不自动更新已安装的 packages（使用原生 `pi update` 命令）

## Capabilities

### New Capabilities
- `pkg-security-review`: 在安装前对第三方 Pi package 源码进行安全性审查，检查网络请求、命令执行、文件越界写入、动态代码执行、混淆代码等风险点，输出审查摘要供用户决策
- `pkg-install-research`: 在项目隔离环境下安装并调研 Pi package 的功能结构，包括资源类型识别、依赖分析、功能测试与冲突检查
- `pkg-decision-backlog`: 提供三选一决策框架（加入全局配置 / backlog / 丢弃），用户驱动决策，并以 Markdown 文件持久化 backlog 索引
- `pkg-global-sync`: 将已确认加入全局配置的 package 写入 `.pi/settings.json`，并通过 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/`

### Modified Capabilities
（无）

## Capabilities 待确认项

- [x] 能力清单已与用户确认：用户确认 workfow 选 C（skill + AGENTS.md 规范）、backlog 用 md 文件、决策完全用户驱动、安全审查在安装前执行

## Impact

- **新增文件**：
  - `.pi/skills/pkg-research/SKILL.md` — 引导 LLM agent 执行完整调研流程的 skill 定义
  - `openspec/pkg-backlog.md` — packages 调研 backlog 索引文件
- **修改文件**：
  - `AGENTS.md` — 新增 package 管理工作流规则
- **运行时影响**：
  - 新增 `/pkg:research` 或其他 skill 命令（取决于 skill name 定义）
  - 项目级包安装产生 `.pi/npm/` 或 `.pi/git/` 临时目录（决策后清理）
  - 加入全局配置的包会修改 `.pi/settings.json` 的 `packages` 数组

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：`repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md` / `repo://orbitos/20_项目/Pi_Config/Pi_Config.md` / `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
