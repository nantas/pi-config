# Pi 自定义供应商与模型配置

本文档简述 Pi 中自定义模型供应商和模型范围配置的两种常见方式。详细配置参考见文末外部链接。

---

## 1. 通过 models.json 添加自定义供应商/模型

用于接入本地模型（Ollama、vLLM、LM Studio）、企业代理网关或第三方兼容 API。

### 文件位置

```
~/.pi/agent/models.json
```

文件修改后无需重启 Pi，`/model` 或 `--list-models` 会自动重新加载。

### 最小示例（Ollama）

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [
        { "id": "llama3.1:8b" },
        { "id": "qwen2.5-coder:7b" }
      ]
    }
  }
}
```

### 支持的 API 类型

| API | 说明 |
|-----|------|
| `openai-completions` | OpenAI Chat Completions（兼容性最广） |
| `openai-responses` | OpenAI Responses API |
| `anthropic-messages` | Anthropic Messages API |
| `google-generative-ai` | Google Generative AI |

### apiKey / headers 的值解析方式

- **环境变量**： `"ANTHROPIC_API_KEY"`
- **字面量**： `"sk-..."`
- **Shell 命令**： `"!op read 'op://vault/item/credential'"`（请求时执行 stdout 作为值）

### 覆盖内置供应商

仅修改 `baseUrl` 即可将内置供应商流量路由到代理，保留原有模型列表：

```json
{
  "providers": {
    "anthropic": {
      "baseUrl": "https://my-proxy.example.com/v1"
    }
  }
}
```

---

## 2. enabledModels：控制模型轮询范围

在 `~/.pi/agent/settings.json` 中配置，限制 Ctrl+P (`/model`) 可切换的模型列表。

### 示例

```json
{
  "enabledModels": ["claude-*", "gpt-4o", "gemini-2*"]
}
```

- 支持 glob 模式（如 `github-copilot/*`、`\*sonnet\*`）
- 与 `--models` CLI 标志使用相同的匹配格式
- 作用域内的模型会记住上次选中的模型，跨会话保持

---

## 外部参考

| 主题 | 链接 |
|------|------|
| `models.json` 完整配置（含 `compat`、`thinkingLevelMap`、`modelOverrides` 等） | https://pi.dev/docs/latest/models |
| Extension 方式注册自定义供应商（`pi.registerProvider()`、OAuth、自定义流） | https://pi.dev/docs/latest/custom-provider |
| Pi 完整设置项文档（`settings.json` 所有字段） | https://pi.dev/docs/latest/settings |
