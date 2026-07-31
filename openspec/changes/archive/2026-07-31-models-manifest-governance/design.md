# Design

## Context

`~/.pi/agent/models.json` 承载自定义 provider 声明，但不在 `sync-pi-agent.sh` 管理范围（`add-provider.ts` 注释明确标注）。deepseek-v4-flash 走 Responses API 的配置目前仅存在于本机，无法跨设备共享。spec 要求（`models-manifest-governance`）：capabilities.yaml 新增 `global.models` 段声明共享 provider，sync 渲染 models.json（manifest 权威 + preserve 未声明 provider），deepseek Responses 配置作为首个托管 provider，apiKey 仅允许 env 引用。

## Goals / Non-Goals

**Goals:**
- `global.models` 段成为跨设备共享 provider 的声明式来源（结构对齐 pi 的 models.json provider schema）
- sync 脚本复用 `render_settings_file` 的 merge-preserve + atomic-write 模式渲染 models.json
- deepseek-v4-flash 走 Responses API 的配置随 sync 跨设备生效，v4-pro 不受影响（保留内置 Chat Completions）
- README / getting-started 反映新治理能力

**Non-Goals:**
- 不改变 pi 运行时对 models.json 的 merge 语义（由 pi 侧负责）
- 不迁移 zhipuai 等本机私有 provider 进 manifest（preserve 机制维持现状）
- 不为 models 引入 OAuth、多级继承等复杂 schema
- 不修改 `add-provider.ts` 本机交互工具

## Decisions

**D1: manifest schema 对齐 models.json provider 结构。**
`global.models.<provider>` 直接采用 pi models.json 的 provider 配置形状（`models` 数组 + 可选 `apiKey`/`baseUrl`/`api`/`headers`/`compat`），渲染时按 provider 名整体写入 `providers`，零转换，避免 schema 双份维护。

**D2: provider 级 preserve 语义（对齐 settings.json）。**
渲染逻辑：manifest 声明的 provider 整体替换目标端同名 provider；目标端未声明 provider 原样保留。顶层非 `providers` key 同样保留。缺失/损坏目标文件时仅输出 manifest provider，不报错。写入用 temp + rename 原子替换。

**D3: apiKey 仅允许 env 引用。**
manifest 中 `apiKey` 值必须以 `$` 开头引用环境变量（如 `$DEEPSEEK_API_KEY`）。pi 的 models.json 原生支持 env 插值，运行期解析，仓库零密钥。不引入明文校验逻辑（由 review 把关 + README 文档约束）。

**D4: 首个托管 provider = deepseek（Responses）。**
`global.models.deepseek` 定义 deepseek-v4-flash：`api: openai-responses`、`baseUrl: https://api.deepseek.com`、`reasoning: true`、`contextWindow: 1048576`、`maxTokens: 384000`、cost 与内置目录一致、`thinkingLevelMap` 暴露 low/high/max（对应 DeepSeek 官方档位）。不声明 v4-pro（内置保留）。本机迁移：目标端已有 deepseek 段将被 manifest 渲染结果替换（apiKey 变为 `$DEEPSEEK_API_KEY` 引用）。

**D5: sync 脚本按现有渲染模式扩展。**
新增 `render_models_file()`，挂在 `render_settings_file` 之后；manifest 解析复用内嵌 python + `yaml.safe_load`。环境变量传参沿用 `MANIFEST_PATH`/`TARGET_PATH` 模式。

## Risks / Migration

- **迁移影响**：首次 sync 后本机 models.json 的 deepseek.apiKey 从明文变为 `$DEEPSEEK_API_KEY` 引用。若环境变量缺失，pi 运行期 key 解析失败 → 需确认 `DEEPSEEK_API_KEY` 已设置或 auth.json 有 deepseek 条目（auth.json 优先级更高，实际不受影响）。
- **yaml null 语义**：`thinkingLevelMap` 的 `null` 值经 yaml → python None → JSON null，需在渲染后断言序列化正确。
- **脚本回归**：render 逻辑新增于既有 sync 主流程，需跑一次完整 sync 验证 settings.json 渲染不受影响（保留机制独立）。
- **回滚**：删除 `global.models` 段 + 恢复 sync 脚本即可；目标文件可手工还原（preserve 机制保证未声明 provider 不丢失）。
