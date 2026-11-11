# TeamoRouter provider 模板

把 TeamoRouter 接到本机 Pi 的 `~/.pi/agent/models.json`。这是本机模板，不写入 `global.models`。`scripts/sync-pi-agent.sh` 只整体替换 manifest 里声明的 provider，未声明的 `teamorouter` 与 `teamorouter-claude` 会原样保留。

密钥只用 `$TEAMOROUTER_API_KEY`。不要把明文 key 提交进仓库。

## 两个 provider

TeamoRouter 的 Claude 必须走 Anthropic Messages，prompt cache 和 thinking 才按原生协议工作。GPT、Gemini、DeepSeek、GLM、Grok、Kimi 走 OpenAI Chat Completions。两条链路共用同一把 key 和余额。

Pi 的 Anthropic SDK 会在 `baseUrl` 后面追加 `/v1/messages`。Claude provider 的地址因此是 `https://api.teamorouter.com`，不要照抄 OpenCode 文档里的 `https://api.teamorouter.com/v1`，否则会打到 `/v1/v1/messages`。OpenAI 兼容地址是 `https://api.teamorouter.com/v1`。

OpenAI 兼容 provider 关闭了 `store`、`developer` role 和 `strict`，并把输出上限字段设为 `max_tokens`。这些模型没有打开 Pi 的 reasoning 参数：一个 provider 里混着多家模型时，默认 reasoning 字段容易被网关拒绝。Claude 按 Pi 内置 Claude 4.6+ 的方式打开 adaptive thinking。

## 接入

1. 在启动 Pi 的 shell 里设置 `TEAMOROUTER_API_KEY`。变量缺失时，Pi 把这些模型当成未鉴权，Ctrl+P 里不会出现。
2. 把下面的两个 provider 合并进 `~/.pi/agent/models.json` 的 `providers`。不要覆盖已有的 `deepseek` 等 provider。
3. 要在 Ctrl+P 里出现，把 `provider/id` 写进 `.pi/capabilities.yaml` 的 `global.settings.enabledModels`，再运行 `scripts/sync-pi-agent.sh`。只改本机 `settings.json` 会被下次同步覆盖。白名单以 `capabilities.yaml` 为准，本模板不代表当前启用范围。
4. 新开一个 Pi。`/model` 会重新读取 `models.json`，但 `enabledModels` 要重启才生效。

模型 ID 来自 [TeamoRouter OpenCode 安装文档](https://teamorouter.com/docs/install-opencode) 的聊天目录，不含图像模型。目录会变，以带 key 的 `GET https://api.teamorouter.com/v1/models` 为准。

## 模板

```json
{
  "providers": {
    "teamorouter-claude": {
      "name": "TeamoRouter (Claude)",
      "baseUrl": "https://api.teamorouter.com",
      "api": "anthropic-messages",
      "apiKey": "$TEAMOROUTER_API_KEY",
      "models": [
        {
          "id": "claude-opus-5-5",
          "name": "Claude Opus 5.5",
          "reasoning": true,
          "input": [
            "text",
            "image"
          ],
          "contextWindow": 1000000,
          "maxTokens": 128000,
          "compat": {
            "forceAdaptiveThinking": true,
            "supportsTemperature": false
          }
        },
        {
          "id": "claude-sonnet-5-5",
          "name": "Claude Sonnet 5.5",
          "reasoning": true,
          "input": [
            "text",
            "image"
          ],
          "contextWindow": 1000000,
          "maxTokens": 128000,
          "compat": {
            "forceAdaptiveThinking": true
          }
        },
        {
          "id": "claude-haiku-5-5",
          "name": "Claude Haiku 5.5",
          "reasoning": true,
          "input": [
            "text",
            "image"
          ],
          "contextWindow": 1000000,
          "maxTokens": 64000,
          "compat": {
            "forceAdaptiveThinking": true
          }
        },
        {
          "id": "claude-fable-5-2",
          "name": "Claude Fable 5.2",
          "reasoning": true,
          "input": [
            "text",
            "image"
          ],
          "contextWindow": 1000000,
          "maxTokens": 128000,
          "compat": {
            "forceAdaptiveThinking": true
          }
        },
        {
          "id": "claude-fable-5-1",
          "name": "Claude Fable 5.1",
          "reasoning": true,
          "input": [
            "text",
            "image"
          ],
          "contextWindow": 1000000,
          "maxTokens": 128000,
          "compat": {
            "forceAdaptiveThinking": true
          }
        },
        {
          "id": "claude-opus-5",
          "name": "Claude Opus 5",
          "reasoning": true,
          "input": [
            "text",
            "image"
          ],
          "contextWindow": 1000000,
          "maxTokens": 128000,
          "compat": {
            "forceAdaptiveThinking": true,
            "supportsTemperature": false
          }
        },
        {
          "id": "claude-fable-5",
          "name": "Claude Fable 5",
          "reasoning": true,
          "input": [
            "text",
            "image"
          ],
          "contextWindow": 1000000,
          "maxTokens": 128000,
          "compat": {
            "forceAdaptiveThinking": true
          }
        },
        {
          "id": "claude-sonnet-5",
          "name": "Claude Sonnet 5",
          "reasoning": true,
          "input": [
            "text",
            "image"
          ],
          "contextWindow": 1000000,
          "maxTokens": 128000,
          "compat": {
            "forceAdaptiveThinking": true
          }
        },
        {
          "id": "claude-opus-4-8",
          "name": "Claude Opus 4.8",
          "reasoning": true,
          "input": [
            "text",
            "image"
          ],
          "contextWindow": 1000000,
          "maxTokens": 128000,
          "compat": {
            "forceAdaptiveThinking": true,
            "supportsTemperature": false
          },
          "thinkingLevelMap": {
            "xhigh": "xhigh"
          }
        },
        {
          "id": "claude-opus-4-7",
          "name": "Claude Opus 4.7",
          "reasoning": true,
          "input": [
            "text",
            "image"
          ],
          "contextWindow": 1000000,
          "maxTokens": 128000,
          "compat": {
            "forceAdaptiveThinking": true,
            "supportsTemperature": false
          },
          "thinkingLevelMap": {
            "xhigh": "xhigh"
          }
        },
        {
          "id": "claude-opus-4-6",
          "name": "Claude Opus 4.6",
          "reasoning": true,
          "input": [
            "text",
            "image"
          ],
          "contextWindow": 1000000,
          "maxTokens": 128000,
          "compat": {
            "forceAdaptiveThinking": true
          },
          "thinkingLevelMap": {
            "xhigh": "max"
          }
        },
        {
          "id": "claude-sonnet-4-6",
          "name": "Claude Sonnet 4.6",
          "reasoning": true,
          "input": [
            "text",
            "image"
          ],
          "contextWindow": 1000000,
          "maxTokens": 64000,
          "compat": {
            "forceAdaptiveThinking": true
          }
        },
        {
          "id": "claude-haiku-4-5",
          "name": "Claude Haiku 4.5",
          "reasoning": true,
          "input": [
            "text",
            "image"
          ],
          "contextWindow": 200000,
          "maxTokens": 64000
        }
      ]
    },
    "teamorouter": {
      "name": "TeamoRouter",
      "baseUrl": "https://api.teamorouter.com/v1",
      "api": "openai-completions",
      "apiKey": "$TEAMOROUTER_API_KEY",
      "compat": {
        "supportsStore": false,
        "supportsDeveloperRole": false,
        "supportsStrictMode": false,
        "maxTokensField": "max_tokens"
      },
      "models": [
        {
          "id": "gpt-6.1-sol",
          "name": "GPT 6.1 Sol",
          "input": [
            "text",
            "image"
          ]
        },
        {
          "id": "gpt-6-astra",
          "name": "GPT 6 Astra",
          "input": [
            "text",
            "image"
          ]
        },
        {
          "id": "gpt-6-sol",
          "name": "GPT 6 Sol",
          "input": [
            "text",
            "image"
          ]
        },
        {
          "id": "gpt-6-luna",
          "name": "GPT 6 Luna",
          "input": [
            "text",
            "image"
          ]
        },
        {
          "id": "gpt-5.6-sol",
          "name": "GPT 5.6 Sol",
          "input": [
            "text",
            "image"
          ]
        },
        {
          "id": "gpt-5.6-terra",
          "name": "GPT 5.6 Terra",
          "input": [
            "text",
            "image"
          ]
        },
        {
          "id": "gpt-5.6-luna",
          "name": "GPT 5.6 Luna",
          "input": [
            "text",
            "image"
          ]
        },
        {
          "id": "gpt-5.5",
          "name": "GPT 5.5",
          "input": [
            "text",
            "image"
          ]
        },
        {
          "id": "gpt-5.4",
          "name": "GPT 5.4",
          "input": [
            "text",
            "image"
          ]
        },
        {
          "id": "gemini-4-argon",
          "name": "Gemini 4 Argon",
          "input": [
            "text",
            "image"
          ]
        },
        {
          "id": "gemini-3.8-flash",
          "name": "Gemini 3.8 Flash",
          "input": [
            "text",
            "image"
          ]
        },
        {
          "id": "gemini-3.7-flash",
          "name": "Gemini 3.7 Flash",
          "input": [
            "text",
            "image"
          ]
        },
        {
          "id": "gemini-3.6-flash",
          "name": "Gemini 3.6 Flash",
          "input": [
            "text",
            "image"
          ]
        },
        {
          "id": "gemini-3.5-flash-lite",
          "name": "Gemini 3.5 Flash Lite",
          "input": [
            "text",
            "image"
          ]
        },
        {
          "id": "gemini-3.1-pro-preview",
          "name": "Gemini 3.1 Pro Preview",
          "input": [
            "text",
            "image"
          ]
        },
        {
          "id": "deepseek-flash",
          "name": "DeepSeek Flash",
          "input": [
            "text"
          ]
        },
        {
          "id": "deepseek-flash-free",
          "name": "DeepSeek Flash Free",
          "input": [
            "text"
          ]
        },
        {
          "id": "deepseek-v4-flash-vision-exp",
          "name": "DeepSeek V4 Flash Vision",
          "input": [
            "text",
            "image"
          ]
        },
        {
          "id": "deepseek-v4-pro",
          "name": "DeepSeek V4 Pro",
          "input": [
            "text"
          ],
          "contextWindow": 1048576,
          "maxTokens": 384000
        },
        {
          "id": "deepseek-v4-flash",
          "name": "DeepSeek V4 Flash",
          "input": [
            "text"
          ],
          "contextWindow": 1048576,
          "maxTokens": 384000
        },
        {
          "id": "deepseek-v4-flash-free",
          "name": "DeepSeek V4 Flash Free",
          "input": [
            "text"
          ]
        },
        {
          "id": "glm-5.3-flash",
          "name": "GLM 5.3 Flash",
          "input": [
            "text"
          ]
        },
        {
          "id": "glm-5.3-flash-free",
          "name": "GLM 5.3 Flash Free",
          "input": [
            "text"
          ]
        },
        {
          "id": "glm-5.3",
          "name": "GLM 5.3",
          "input": [
            "text"
          ]
        },
        {
          "id": "glm-5.2",
          "name": "GLM 5.2",
          "input": [
            "text"
          ]
        },
        {
          "id": "grok-4.6",
          "name": "Grok 4.6",
          "input": [
            "text",
            "image"
          ]
        },
        {
          "id": "kimi-k3.1-pro",
          "name": "Kimi K3.1 Pro",
          "input": [
            "text"
          ]
        }
      ]
    }
  }
}
```
