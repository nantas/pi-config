# 新手上路

> 本指南面向首次使用 pi-config 的初学者。请按照以下六个步骤完成基础配置。

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

使用 Magpie 时，在 Magpie 中为 Pi 选择模型并设置可见范围。Pi 的 `/model` 和 Ctrl+P 会使用本机配置。也可以独立配置 Pi 的模型供应商。

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

更多配置参考：[Pi 供应商与模型配置指南](reference/pi-provider-model.md)。TeamoRouter 模板：[teamorouter-provider.md](reference/teamorouter-provider.md)

---

## 第二步：查看本仓库的能力清单

在确认全局同步前，先了解本仓库包含哪些能力。以下清单来自 [`.pi/capabilities.yaml`](../.pi/capabilities.yaml)（以该文件为准）：

### 全局同步能力（同步到 `~/.pi/agent/`）

| 类型 | 数量 | 项目 |
|------|------|------|
| **扩展** | 4 | `dollar-skill-invoke`、`tool-counter-widget`、`init-command`、`bash-search-guard` |
| **Agent** | 3 | `worker`（`magpie/group/grunt`）、`reviewer`（`magpie/group/grunt`）、`researcher`（`magpie/group/workhorse`） |
| **技能** | 4 | `install-from-pi-config`、`notion`、`x-reach`、`worktrunk-isolation` |
| **共享层技能** | 1 | `agent-reach`（经 `global.shared_skills` 同步到 `~/.agents/skills/`，跨 harness 共用） |
| **hc 模板** | 3 | `peer`、`grunt`、`workhorse`（经 `global.hc_templates` 同步到 `~/.config/herdr-core/templates/`，只增不删） |
| **Prompts** | 10 | `opsx-apply`、`opsx-archive`、`opsx-bulk-archive`、`opsx-continue`、`opsx-explore`、`opsx-ff`、`opsx-new`、`opsx-propose`、`opsx-sync`、`opsx-verify` |
| **外部包** | 6 | `pi-subagents`（子代理系统）、`pi-powerline`（powerline 状态栏）、`pi-tool-display`（工具调用可视化）、`pi-ask`（交互提问）、`pi-webfetch`（网页抓取）、`pi-fff`（模糊文件查找） |

### 按需安装能力（Catalog）

其他仓库可以通过 `$install <capability>` 从本仓库 catalog 安装以下能力：

| 类型 | 项目 | 说明 |
|------|------|------|
| **技能** | `obsidian-search` | Obsidian 仓库智能检索 |
| **技能** | `pi-extension-dev` | Pi 扩展开发完整生命周期指导 |
| **技能** | `pkg-research` | 第三方 Pi 包研究评估工作流 |
| **技能** | `pkg-fork-dev` | Fork 并修改已有第三方 Pi 包的完整生命周期 |
| **扩展** | `obsidian-tools` | Obsidian 集成工具 |
| **扩展** | `wikilink-batch-replace` | 批量将裸文本引用替换为 Obsidian wikilink |
| **包** | （无） | `catalog.packages` 当前为空 |

---

## 第三步：确认同步范围

运行同步脚本前，请确认以下内容：

1. **是否确认同步上述所有全局能力到 `~/.pi/agent/`？**
2. **是否需要删减某些项目？**
   - 例如不需要 `pi-powerline` 的 Nerd Font 依赖 → 从 `capabilities.yaml` 中移除对应包
   - 例如不需要某些扩展 → 从 `capabilities.yaml` 的同步列表中排除
3. **是否需要修改 `settings.json` 中的默认值？**
   - 仓库预设 `defaultThinkingLevel: high`。默认供应商和模型由本机配置决定。

4. **环境变量（与 `pi-fff` 包相关）**
   - `pi-fff` 需要 `FFF_FRECENCY_DB`、`FFF_HISTORY_DB`（LMDB 数据库路径）与 `PI_FFF_MODE=override`
   - **说明**：`PI_FFF_MODE=override` 与 `pi-powerline` 共存机制见 `capabilities.yaml` 的 `global.env.pi-fff`

如需调整，请修改 `.pi/capabilities.yaml` 或 `.pi/settings.json`，然后继续下一步。

---

## 第四步：执行全局同步

```bash
./scripts/sync-pi-agent.sh
```

同步内容（基于 `capabilities.yaml`）：
- `.pi/capabilities.yaml` 的 `global.settings` → `~/.pi/agent/settings.json`，本机的模型设置随未托管键一起保留
- `.pi/extensions/` → `~/.pi/agent/extensions/`（`global.external_extensions` 声明的扩展由外部工具管理，同步完全忽略：不复制、不覆盖、不清理）
- `.pi/agents/` → `~/.pi/agent/agents/`
- `.pi/skills/` → `~/.pi/agent/skills/`
- `.pi/prompts/` → `~/.pi/agent/prompts/`

> ⚠️ **注意**：这是**单向覆盖式同步**。运行时（`~/.pi/agent/`）的独立编辑不会在同步时回写仓库。

---

## 第五步：验证 Pi 环境

启动 Pi，验证以下功能正常：

```bash
pi
```

验证清单：
- [ ] `/model` 能列出预期的模型
- [ ] Ctrl+P 能在预期的模型范围内切换
- [ ] `$skill-name` 能触发技能补全（如同步了 `dollar-skill-invoke`）
- [ ] `/login` 能查看已配置的供应商

---

## 补充：配置 Subagent 模型

Agent 的模型写在 `.pi/agents/<name>.md` 的 frontmatter `model:` 字段。当前 subagent 扩展不支持 `settings.json` 的 `subagents.agentOverrides`，写在那里不生效。

本仓库的 agent 使用 Magpie 路由分组，由 Magpie 决定分组里用哪个具体模型：

| Agent | model |
|-------|-------|
| `worker` | `magpie/group/grunt` |
| `reviewer` | `magpie/group/grunt` |
| `researcher` | `magpie/group/workhorse` |

不经 Magpie 时，把 `model` 换成 `provider/model` 形式（如 `anthropic/claude-sonnet-4-6`），并确保该 provider 已在 `models.json` 或登录凭据中可用。

---

## 后续扩展：可用工作流

完成基础配置后，可通过以下工作流继续扩展能力（含 `pkg-research`、`pkg-fork-dev`、`pi-extension-dev` 等）：

| 场景 | 工作流 | 使用位置 |
|------|--------|----------|
| **安装新的第三方 Pi 包** | `pkg-research` | 本仓库（研究评估后可能加入全局配置） |
| **开发新的 Pi 扩展** | `pi-extension-dev` | 本仓库（开发扩展并加入 pi-config） |
| **Fork 并修改已有的第三方 Pi 包** | `pkg-fork-dev` | 本仓库（fork 上游包并本地修改） |
| **从本仓库 catalog 安装能力到其他仓库** | `install-from-pi-config` | **其他仓库**（运行 `$install <capability>` 安装 catalog 中的能力） |
| **管理 OpenSpec 变更生命周期** | OpenSpec 10 步工作流 | 任意仓库（通过 `.pi/prompts/` 安装的 prompt 命令，如 `/opsx-new`、`/opsx-apply`） |
| **更新全局 Agent 指导规则** | 编辑 `.pi/agent/AGENTS.md` | 本仓库（修改后执行 `sync-pi-agent.sh`） |
