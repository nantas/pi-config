# Proposal

## 问题定义

Pi 缺少一个内置的仓库初始化命令，能够在新项目仓库中自动分析其结构、构建流程、测试配置、工具链约束和开发惯例，并产出结构化的 AGENTS.md 文件。开发者目前需要手动编写 AGENTS.md，过程繁琐且容易遗漏关键信息（如正确的测试命令、monorepo 边界、CI 工作流细节等）。

参考 OpenCode 的 `/init` 命令设计，Pi 需要一个等价的 `/init` 命令扩展，让 LLM 自主分析仓库并产出高信号的 AGENTS.md。

## 范围边界

### 在范围内

- 在 Pi 中注册 `/init` 斜杠命令
- 命令接收可选的焦点参数（如 `/init focus on testing`）
- 命令触发 LLM 对当前仓库进行结构化分析
- 分析覆盖：README、构建/测试/lint 配置、CI 工作流、已有指令文件、monorepo 结构、框架/toolchain 怪癖、测试流程
- LLM 使用 Pi 已有工具（`read`、`bash`、`write`、`edit`）自主调查
- 产出/更新仓库根目录的 `AGENTS.md`
- 处理已有 AGENTS.md：分析其结构，若与模板结构完全不同则警告用户；若类似则询问是否按现有结构更新

### 不在范围内

- 不注册独立的 `question` 工具（LLM 直接在对话中提问）
- 不修改 Pi 内置工具集
- 不修改 Pi 的 AGENTS.md 加载机制
- 不支持内嵌 shell 命令解析（OpenCode 的 `${...}` 语法）
- 不创建 catalog 入口（直接在 pi-config 中管理）

## Capabilities

### New Capabilities

- `init-command`: 在 Pi 中注册 `/init` 斜杠命令，通过 LLM 自主分析仓库结构、配置与惯例，创建或更新 AGENTS.md 文件

### Modified Capabilities

- 无

## Capabilities 待确认项

- [x] 能力清单已与用户确认（设计讨论阶段已确认）

## Impact

### 新增文件

- `.pi/extensions/init-command.ts` — 扩展主文件（注册命令 + prompt 模板）
- `.pi/capabilities.yaml` — 更新 manifest（Global 范围）

### 影响文件

- `.pi/capabilities.yaml` — 将 `init-command` 追加到 `global.extensions`

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准引用：`repo://pi-config/openspec/specs/pi-extension-lifecycle-guidance`
  - 无外部项目页回写需求
