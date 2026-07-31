# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `models-manifest-governance` spec 的 5 个 requirement（manifest-declares-shared-models / sync-renders-models-json / deepseek-flash-uses-responses-api / readme-reflects-models-governance）实现范围与边界（proposal + design 已定）

## 2. Manifest 声明

- [x] 2.1 在 `.pi/capabilities.yaml` `global` 下新增 `models:` 段，声明 `deepseek` provider：
  - `deepseek-v4-flash`：`api: openai-responses`、`baseUrl: https://api.deepseek.com`、`reasoning: true`、`input: [text]`、`contextWindow: 1048576`、`maxTokens: 384000`、cost（0.14/0.28/0.0028/0）、`thinkingLevelMap`（minimal/medium/xhigh → null，low/high/max → 对应档位）
  - provider 级 `apiKey: "$DEEPSEEK_API_KEY"`（env 引用，无明文）
  - 不声明 `deepseek-v4-pro`（内置保留）
- [x] 2.2 验证 YAML 合法（`python3 -c "import yaml; yaml.safe_load(...)"`），null 值经 JSON 序列化后仍为 `null`

## 3. Sync 脚本渲染

- [x] 3.1 `scripts/sync-pi-agent.sh` 新增 `render_models_file()`：
  - 解析 manifest `global.models`（复用内嵌 python + yaml.safe_load，env 传参沿用 `MANIFEST_PATH`/`TARGET_PATH`）
  - merge 语义：manifest provider 整体替换目标端同名 provider；目标端未声明 provider 及顶层非 `providers` key 保留；目标缺失/损坏时仅输出 manifest provider
  - atomic write（temp + rename）
- [x] 3.2 挂入主流程：在 `render_settings_file` 后调用，输出 `--- Syncing models.json ---` 日志

## 4. 本机同步与验证

- [x] 4.1 运行 `scripts/sync-pi-agent.sh`（已确认），检查 `~/.pi/agent/models.json`：
  - `providers.deepseek` 由 manifest 渲染（apiKey = `$DEEPSEEK_API_KEY`）
  - `providers.zhipuai-coding-plan` 等未声明 provider 原样保留
  - settings.json 渲染不受影响
- [x] 4.2 `pi --list-models` 确认 `deepseek/deepseek-v4-flash`（1.0M）与 `deepseek/deepseek-v4-pro`（内置）均可见
- [x] 4.3 实跑一次 `pi -p '测试' --provider deepseek --model deepseek-v4-flash`，确认 Responses API 通讯流仍正常（对照 spec `deepseek-flash-uses-responses-api`）

## 5. 文档治理

- [x] 5.1 `README.md`：新增/更新 `global.models` 段说明（名称、功能、解决的问题、源文件相对路径、OpenSpec spec 链接），与 capabilities.yaml 对应 section 一致
- [x] 5.2 `docs/getting-started.md`：更新第三步能力数量统计与 models.json 治理说明（如适用）

## 6. 收尾

- [x] 6.1 `openspec validate --change models-manifest-governance` 通过
- [x] 6.2 git status 检查：仅本次 change 相关文件变更
