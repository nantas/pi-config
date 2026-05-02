# Design

## Context

当前 pi-config 仓库中三种资源类型（extensions/agents/skills）通过 `capabilities.yaml` 的 `global.*` 白名单管理同步，由 `sync_from_manifest()` 中的 node 脚本统一处理。prompts 是唯一仍在使用全量目录覆盖的资源类型（`sync_prompts_and_themes()`），导致了 manifest 管理缺失、过期文件无法自动清理、以及全局/项目优先级无声明等治理空白。

本 change 将 prompts 的同步方式改造为与其他类型一致的 manifest 驱动模式，并在 AGENTS.md 中明确全局优先的治理规则。

## Goals / Non-Goals

**Goals:**
- `capabilities.yaml` 新增 `global.prompts` 段，列出需要全局同步的 prompt 模板
- `scripts/sync-pi-agent.sh` 中 prompts 同步从全量目录覆盖改为 manifest 白名单驱动 + 过期清理
- 同步摘要中 prompts 归入 "Managed by manifest" 段
- `AGENTS.md` 的 Capability Manifest Governance 表新增 Prompts 行，补充 Precedence Rule 小节
- 保留 themes 的全量同步模式不变

**Non-Goals:**
- 不改 `capabilities.yaml` 的 `sync_from_manifest()` node 脚本外部接口签名
- 不改 `sync_prompts_and_themes()` 的函数签名（只移除 prompts 处理，保留 themes 处理）
- 不改 pi-core 层面 prompts 加载的碰撞检测
- 不涉及 catalog 级别 prompts 分发

## Decisions

### Decision 1: manifest 同步用 extractItems() 扩展而非新增独立函数

`sync_from_manifest()` 中的 node 脚本已通过 `extractItems("global", "<keyword>")` 模式统一处理 extensions/agents/skills。prompts 遵循相同模式：新增 `const globalPrompts = extractItems("global", "prompts");`，然后在其后添加 prompts sync 和 stale cleanup 块。

**理由**: 保持代码一致性，复用已有的 YAML 解析函数。无需新增函数。

### Decision 2: prompts 同步采用单文件副本模式（与 agents 一致）

prompts 是 `.md` 单文件（与 agents 同），而非目录（skills）或混合（extensions）。同步逻辑可直接复用 agents 的模式：

```
source_file = join(sourceRoot, "prompts", promptName + ".md")
target_file = join(targetRoot, "prompts", promptName + ".md")
```

**理由**: agents 的模式已验证可用，无需增加复杂度。

### Decision 3: sync_prompts_and_themes() 缩简为仅 themes

`sync_prompts_and_themes()` 函数保留但移除 prompts 部分。后续考虑在独立 change 中将 themes 也纳入 manifest 管理。

**理由**: themes 不在本 change 范围内；保留函数可最小化 diff，也便于后续添加。

### Decision 4: AGENTS.md Precedence Rule 放在 Capability Manifest Governance 段末尾

Precedence Rule 作为 governance 段的最后一个小节，紧随 Workflow Guidance 表。这样既与 governance 主题紧密关联，又不会破坏现有表的布局。

**理由**: 优先级规则是 manifest governance 的自然延伸，放在同一段内形成完整的治理上下文。

## Risks / Migration

### 风险：首次 sync 后 `~/.pi/agent/prompts/` 中非白名单文件被清理

当前 `~/.pi/agent/prompts/` 为空（前面已验证），所以没有实际影响。但如果有用户独立添加了提示模板，首次 manifest sync 后会被自动删除。

**缓解措施**: AGENTS.md 的 Precedence Rule 和 Workflow Guidance 表明确提示 templates 应通过 `global.prompts` 管理。

### 兼容性：`sync_prompts_and_themes()` 签名不变

外部调用者（main 流程）不受影响。函数内部的代码变更不影响调用方。

### 同步顺序

prompts 同步在 settings 同步之后，保持与当前 main 流程顺序一致（manifest → settings → prompts+themes → AGENTS.md）。
