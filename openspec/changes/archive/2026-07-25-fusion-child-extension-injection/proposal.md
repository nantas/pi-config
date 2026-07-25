# Proposal

## 问题定义

fusion-harness 子进程（ARCHITECT/BUILDER/FUSION/VALIDATOR）通过 `pi --mode json -p --no-extensions ...` 启动，`--no-extensions` 的设计意图是防止 fusion-harness 递归加载自身。但它一刀切排除了**所有**扩展——包括负责 provider 动态注册的扩展（pi-xai 注册 grok-build provider）。

后果：任何**非内置 provider**（即由扩展运行时通过 `api.registerProvider()` 注册的 provider）在 fusion-harness 子进程里不可用。当前最突出的受害者是 `grok-build`——它是 pi-xai 扩展注册的（`xai-provider.ts:125`），不是 pi-ai 内置。用户配置 `builder = grok-build/grok-4.5` 后，opinion/fusion/auto-validate 的 builder 子进程报 `Model "grok-build/grok-4.5" not found`。

对照实验铁证：
- `pi -p --no-extensions --model grok-build/grok-4.5` → ❌ Model not found
- `pi -p --model grok-build/grok-4.5` → ✅ 正常（扩展加载，provider 注册）
- `pi -p --no-extensions -e <pi-xai> --model grok-build/grok-4.5` → ✅ 正常（显式注入）
- `pi -p --no-extensions --model openai-codex/gpt-5.6-sol` → ✅ 正常（codex 是内置 OAuth provider）

根因：pi 没有原生"排除特定扩展"flag。`--no-extensions` 关闭自动发现，但 `-e <path>` 仍可显式加载。fusion-harness 需利用这一点，在 spawn 子进程时有选择地注入"provider 注册型"扩展。

## 范围边界

**在范围内**：
- fusion-harness fork 新增"子进程扩展注入"机制：spawn 时根据 `fusionHarness.childExtensions` 配置，在 `--no-extensions` 之后追加 `-e <entry-path>` 显式加载指定扩展
- 新增 `fusionHarness.childExtensions` 配置项（string[]，默认 `[]`），用户声明哪些扩展需要在子进程可见（当前典型值 `["pi-xai"]`）
- 扩展路径解析：从项目级 + 全局 settings.json 的 packages 列表匹配包名 → 解析 git/npm 安装目录 → 读 package.json 入口（`pi.extensions[0]` 或 `main`）→ 拼成 `-e <abs-path>`
- pi-config 配置回写：capabilities.yaml `global.settings.fusionHarness.childExtensions` + 项目 settings.json
- 异常处理：配置的扩展未安装/路径不存在/package.json 不可读 → 静默跳过（不报错、不阻断 spawn），最多打一行 warning

**不在范围内**：
- 不改 `--no-extensions` 本身（防递归意图保留）
- 不改 pi-xai（它运行时注册的设计正确，不该退化成静态 models.json）
- 不改 pi 核心（不要求 pi 原生支持"排除特定扩展"flag——这超出 fork scope）
- 不给 auto-validate gate / merge-existing 做任何改动（独立 change）
- 不做扩展加载的副作用隔离（注入的扩展若注册工具/命令，子进程会看到——这是预期行为，子进程本来就该有完整工具集）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `fusion-harness-integration`: 子进程 spawn 支持选择性扩展注入——`--no-extensions` 后按 `fusionHarness.childExtensions` 配置追加 `-e` 显式加载声明的扩展，使扩展注册的 provider（如 grok-build）在子进程可用

## Capabilities 待确认项

- [x] 能力清单已与用户确认（grilling 收敛：单一 modified capability，A2 方案，配置存 `fusionHarness.childExtensions`）

## Impact

- **fork 代码**：`repo://fusion-harness extensions/fusion-harness/fusion-harness.ts`——runChild args 组装段 + 新增扩展路径解析函数
- **配置**：capabilities.yaml `global.settings.fusionHarness` 追加 `childExtensions`；项目 + 全局 settings.json 同步
- **无 breaking change**：`childExtensions` 默认 `[]`，不配置时 spawn 行为与之前完全一致
- **性能**：注入扩展的加载开销（毫秒级，pi-xai 启动时读 OAuth token），可接受

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：upstream disler/fusion-harness + fork repo://fusion-harness + pi-xai/pi-mono 证据
  - 项目页：merge-existing design（同期 spawn 改动协调）、manifest
  - 回写目标：fork 代码 + manifest + capabilities.yaml + settings.json
