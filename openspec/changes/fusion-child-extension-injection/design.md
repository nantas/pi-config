# Design

## Context

fusion-harness 的 `runChild`（`fusion-harness.ts:466-484`）组装子进程 args 时硬编码 `--no-extensions`，目的是防止 fusion-harness 递归加载自身。但 pi 没有原生"排除特定扩展"flag——`--no-extensions` 关闭自动发现，`-e <path>` 仍可显式加载。

grok-build provider 不是 pi-ai 内置（内置 OAuth 只有 anthropic/github-copilot/openai-codex），它是 pi-xai 扩展通过 `api.registerProvider("grok-build", {...})` 运行时注册的（`xai-provider.ts:125`）。`--no-extensions` 把 pi-xai 排除后，grok-build 在子进程不存在。

对照实验已验证：`--no-extensions -e <pi-xai>` 组合下 grok-build 复活（session 正常启动，provider 正确解析）。pi 的 `-e` flag 接受扩展入口文件的绝对路径。

## Goals / Non-Goals

**Goals:**
- `runChild` spawn 时按 `fusionHarness.childExtensions` 配置追加 `-e <entry-path>`
- 路径解析从项目级 + 全局 settings.json 的 packages 匹配，读 package.json 入口
- 缺失扩展静默跳过，不阻断 spawn
- 默认值安全（fork 内置 `[]`，capabilities.yaml 全局默认 `["pi-xai"]`）

**Non-Goals:**
- 不改 `--no-extensions` 防递归语义
- 不改 pi-xai
- 不做扩展加载的沙箱/隔离
- 不给 merge-existing / gate 做改动

## Decisions

### D1 — 配置位置：`fusionHarness.childExtensions`（string[]）

**决策**：settings.json 的 `fusionHarness` 块新增 `childExtensions` 字段。

**理由**：与 architect/builder/thinking 同块，用户配置单一入口；fork 代码已有 `fusionSettings()` 读这个块，扩展类型即可。

**默认值分层**：
- fork 内置默认：`[]`（无 childExtensions 键时 → 空列表 → 不注入）
- capabilities.yaml 全局默认：`["pi-xai"]`（grok-build 开箱即用，但仅在用户装了 pi-xai 时生效——未安装则静默跳过）

### D2 — 包名匹配规则

**决策**：`childExtensions` 存**包名**（如 `"pi-xai"`），匹配 packages 里的条目时取 source 的最后一段。

匹配逻辑：
- `git:github.com/nantas/pi-xai` → 取 `pi-xai`（`/` 分割最后一段）
- `npm:@scope/pkg` → 取 `pkg`（`/` 分割最后一段）
- `npm:pkg` → 取 `pkg`

**理由**：精确匹配避免 `"pi-xai"` 误中 `"someone/pi-xai-fork"`。取最后一段是 repo 名/npm 包名的稳定提取方式。

### D3 — 安装目录解析

**决策**：按 pi 的安装约定解析：
- `git:github.com/owner/repo` → `<agentHome>/git/github.com/owner/repo`
- `npm:@scope/pkg` → `<agentHome>/npm/node_modules/@scope/pkg`
- `npm:pkg` → `<agentHome>/npm/node_modules/pkg`

`agentHome` = `~/.pi/agent`（pi 的约定 agent home）。

packages 来源：合并读项目级 `.pi/settings.json` + 全局 `~/.pi/agent/settings.json` 的 packages 数组。

### D4 — 入口文件发现

**决策**：读扩展目录的 `package.json`，优先 `pi.extensions[0]`（pi 扩展标准），fallback `main`。拼成绝对路径，校验 existsSync 后传给 `-e`。

**理由**：`pi.extensions` 是 pi 扩展的正式入口声明（pi-xai/package.json `"pi": {"extensions": ["./index.ts"]}`）。`main` 是 Node 标准 fallback。

### D5 — 注入点：runChild args 组装后

**决策**：在 runChild 的 args 数组组装段（`--no-extensions` 之后、`--thinking` 之前或之后均可），遍历解析出的 entry paths 追加 `args.push("-e", entryPath)`。

**理由**：pi 的 `-e` 与 `--no-extensions` 共存已验证（对照实验通过）。注入对所有 role 统一（provider 注册对任何 role 都需要）。

### D6 — 缓存策略

**决策**：解析结果进程级缓存（首次解析后存内存），不每次 spawn 重算。settings 变更时 `/reload` 会重启扩展进程，缓存自然失效。

**理由**：packages 列表和扩展入口在 session 内不变；每次 spawn 读文件浪费。

## Risks / Migration

### R1 — 注入扩展的副作用（低）
注入的扩展（pi-xai）在子进程会注册工具/命令/事件钩子。这是预期行为——子进程本就该有完整工具集。但若注入扩展有重量级启动逻辑（如网络请求），可能增加 spawn 延迟。
**缓解**：childExtensions 是用户显式声明，用户知道自己注入了什么。pi-xai 启动是毫秒级（读 OAuth token 文件）。

### R2 — agent home 路径假设（低）
硬编码 `~/.pi/agent` 可能在非标准安装下失效。
**缓解**：pi 的 agent home 是稳定约定（`PI_AGENT_HOME` 环境变量若存在则优先，否则 `~/.pi/agent`）。本次用 `os.homedir() + "/.pi/agent"`，覆盖 99% 场景。

### R3 — 与 merge-existing 同改 spawn 区域
两个 change 都改 runChild 附近代码。需在同一分支累积，commit 顺序协调。
**缓解**：两处改动物理隔离（merge-only 在 registerCommand handler 内提前 return；childExtensions 在 runChild 函数内 args 组装），不冲突。

### Migration
- 无 breaking change：childExtensions 默认 `[]`，不配置时行为不变
- 无数据迁移：纯 spawn 参数增强
