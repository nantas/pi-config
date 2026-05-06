# 新手上路

> 本指南面向首次使用 pi-config 的初学者。请按照以下七个步骤完成基础配置。

pi-config 是一个集中式 Pi 编码代理配置仓库。在开始前，请确保你的环境中已安装 Pi CLI。

---

## 第零步：安装 Pi CLI

首先确认当前环境是否已安装 Pi：

```bash
pi --version
```

如果命令不存在，请安装 Pi CLI：

```bash
npm install -g @mariozechner/pi-coding-agent
```

安装完成后，验证 Pi 可以正常启动：

```bash
pi --version
```

更多安装细节参考：[Pi Quickstart](https://pi.dev/docs/latest/quickstart)

---

## 第一步：配置模型供应商

Pi 需要至少一个 LLM 供应商才能正常工作。有两种配置方式：

### A. 内置供应商 Login（推荐新手）

Pi 内置支持 OpenAI、Anthropic、Google 等主流供应商。运行以下命令登录：

```bash
pi login <provider>
```

支持的 provider：`openai`、`anthropic`、`google`、`azure`、`mistral`、`github-copilot` 等。按提示输入 API Key 或完成 OAuth 流程即可。

### B. 自定义供应商（企业代理 / API 网关 / 第三方兼容 API）

如果你需要通过企业代理网关或第三方兼容 API 接入模型，创建 `~/.pi/agent/models.json`：

```json
{
  "providers": {
    "my-proxy": {
      "baseUrl": "https://ai-gateway.corp.com/v1",
      "api": "openai-completions",
      "apiKey": "CORP_AI_API_KEY",
      "models": [
        {
          "id": "gpt-4o",
          "name": "GPT-4o (Corp Gateway)",
          "reasoning": false,
          "input": ["text", "image"],
          "contextWindow": 128000,
          "maxTokens": 16384
        }
      ]
    }
  }
}
```

- `apiKey` 可以是环境变量名、字面量或 shell 命令（前缀 `!`）
- `api` 可选值：`openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai`
- 文件修改后无需重启，`/model` 自动重新加载

更多配置参考：[Pi 供应商与模型配置指南](.pi/agent/AGENTS.d/pi-provider-model.md)

---

## 第二步：配置常用模型范围（enabledModels）

在 `~/.pi/agent/settings.json` 中设置 `enabledModels`，限制 Ctrl+P 切换时可用的模型列表：

```json
{
  "enabledModels": ["claude-*", "gpt-4o", "gemini-2*"]
}
```

- 支持 glob 模式（如 `github-copilot/*`、`\*sonnet\*`）
- 与 `--models` CLI 标志格式一致
- 修改后立即生效，无需重启
- 作用域内的模型会记住上次选中的模型，跨会话保持

---

## 第三步：查看本仓库的能力清单

在确认全局同步前，先了解本仓库包含哪些能力。以下清单来自 [`.pi/capabilities.yaml`](.pi/capabilities.yaml)（以该文件为准）：

### 全局同步能力（同步到 `~/.pi/agent/`）

| 类型 | 数量 | 项目 |
|------|------|------|
| **扩展** | 7 | `dollar-skill-invoke`、`planner-toggle`、`output-scroll-viewer`、`subagent-dispatch`、`init-command`、`tool-counter-widget`、`add-provider` |
| **Agent** | 1 | `dispatch-planner` |
| **技能** | 1 | `install-from-pi-config` |
| **Prompts** | 10 | `opsx-apply`、`opsx-archive`、`opsx-bulk-archive`、`opsx-continue`、`opsx-explore`、`opsx-ff`、`opsx-new`、`opsx-propose`、`opsx-sync`、`opsx-verify` |
| **外部包** | 5 | `pi-ask`（交互提问）、`pi-tab-status`（tab 状态图标）、`pi-powerline`（powerline 状态栏）、`pi-terminal-signals`（终端信号）、`pi-tool-display`（工具调用可视化） |

### 按需安装能力（Catalog）

其他仓库可以通过 `$install <capability>` 从本仓库 catalog 安装以下能力：

| 类型 | 项目 | 说明 |
|------|------|------|
| **技能** | `obsidian-search` | Obsidian 仓库智能检索 |
| **技能** | `pi-extension-dev` | Pi 扩展开发完整生命周期指导 |
| **技能** | `pkg-research` | 第三方 Pi 包研究评估工作流 |
| **扩展** | `obsidian-tools` | Obsidian 集成工具 |
| **包** | `pi-mcp-adapter` | MCP 适配器 |
| **包** | `lsp-pi` | LSP 集成 |

---

## 第四步：确认同步范围

运行同步脚本前，请确认以下内容：

1. **是否确认同步上述所有全局能力到 `~/.pi/agent/`？**
2. **是否需要删减某些项目？**
   - 例如不需要 `pi-powerline` 的 Nerd Font 依赖 → 从 `capabilities.yaml` 中移除对应包
   - 例如不需要某些扩展 → 从 `capabilities.yaml` 的同步列表中排除
3. **是否需要修改 `settings.json` 中的默认值？**
   - `defaultProvider` / `defaultModel`
   - `defaultThinkingLevel`
   - `subagents.agentOverrides`

如需调整，请修改 `.pi/capabilities.yaml` 或 `.pi/settings.json`，然后继续下一步。

---

## 第五步：执行全局同步

```bash
./scripts/sync-pi-agent.sh
```

同步内容（基于 `capabilities.yaml`）：
- `.pi/settings.json` → `~/.pi/agent/settings.json`
- `.pi/extensions/` → `~/.pi/agent/extensions/`
- `.pi/agents/` → `~/.pi/agent/agents/`
- `.pi/skills/` → `~/.pi/agent/skills/`
- `.pi/prompts/` → `~/.pi/agent/prompts/`

> ⚠️ **注意**：这是**单向覆盖式同步**。运行时（`~/.pi/agent/`）的独立编辑不会在同步时回写仓库。

---

## 第六步：验证 Pi 环境

启动 Pi，验证以下功能正常：

```bash
pi
```

验证清单：
- [ ] `/model` 能列出预期的模型
- [ ] Ctrl+P 能在 `enabledModels` 范围内切换模型
- [ ] `/planner` 能进入规划模式（如同步了 `planner-toggle`）
- [ ] `$skill-name` 能触发技能补全（如同步了 `dollar-skill-invoke`）
- [ ] `/login` 能查看已配置的供应商

---

## 补充：配置 Subagent 模型重载

Pi 内置的 subagent/dispatch 系统（包括 `dispatch` 扩展和 `/agents` 列表中的内置 agent）会读取 `settings.json` 中的 `subagents.agentOverrides` 来决定每个 agent 使用的模型。如果你使用自定义供应商而非 Anthropic/OpenAI 默认供应商，**必须**为每个 agent 显式指定模型，否则子 agent 会回退到默认模型（通常是 `anthropic/claude-*`），导致 "no api key found" 错误。

在 `~/.pi/agent/settings.json`（或本仓库 `.pi/settings.json`，同步后生效）中添加：

```json
{
  "subagents": {
    "agentOverrides": {
      "context-builder": {
        "model": "your-provider/your-model",
        "thinking": "high"
      },
      "oracle": {
        "model": "your-provider/your-model",
        "thinking": "medium"
      },
      "planner": {
        "model": "your-provider/your-model",
        "thinking": "high"
      },
      "scout": {
        "model": "your-provider/your-model",
        "thinking": "minimal"
      },
      "researcher": {
        "model": "your-provider/your-model",
        "thinking": "high"
      },
      "reviewer": {
        "model": "your-provider/your-model",
        "thinking": "high"
      },
      "worker": {
        "model": "your-provider/your-model",
        "thinking": "low"
      }
    }
  }
}
```

将 `your-provider/your-model` 替换为你在第一步配置的供应商和模型（如 `deepseek/deepseek-v4-flash`、`kimi-coding/k2p6`）。可用的 agent 名称可通过 `/agents` 命令查看。

> **注意**：第三方 subagent 扩展（如 pi-interactive-subagents）可能不读取此配置，而是在 agent 定义文件中硬编码模型。使用前需确认该扩展是否支持 `agentOverrides`。

---

## 后续扩展：可用工作流

完成基础配置后，可通过以下工作流继续扩展能力：

| 场景 | 工作流 | 使用位置 |
|------|--------|----------|
| **安装新的第三方 Pi 包** | `pkg-research` | 本仓库（研究评估后可能加入全局配置） |
| **开发新的 Pi 扩展** | `pi-extension-dev` | 本仓库（开发扩展并加入 pi-config） |
| **从本仓库 catalog 安装能力到其他仓库** | `install-from-pi-config` | **其他仓库**（运行 `$install <capability>` 安装 catalog 中的能力） |
| **管理 OpenSpec 变更生命周期** | OpenSpec 10 步工作流 | 任意仓库（通过 `.pi/prompts/` 安装的 prompt 命令，如 `/opsx-new`、`/opsx-apply`） |
| **更新全局 Agent 指导规则** | 编辑 `.pi/agent/AGENTS.md` | 本仓库（修改后执行 `sync-pi-agent.sh`） |
