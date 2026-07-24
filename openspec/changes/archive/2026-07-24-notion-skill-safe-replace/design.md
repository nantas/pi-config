# Design

## Context

`specs/notion/spec.md` 要求在既有 `ntn-write` 上增加 `--safe-replace`，并修正 SKILL.md 对 `--replace` 的误导。根因是 Notion `replace_content` 会删整棵块树，挂有子页面/子数据库时 API 硬拒绝；安全路径已是 `update_content`（`ntn-edit`），但大段替换门槛高。

参考实现已存在于融合交付：
- `.scratch/fusion-harness/fusion-harness-o9p9QA/ntn-write-fused-deepseek-v4-pro-glm-5.2`
- `.scratch/fusion-harness/fusion-harness-o9p9QA/SKILL-patches-fused-deepseek-v4-pro-glm-5.2.md`

## Goals / Non-Goals

**Goals:**
- 实现 `ntn-write --safe-replace`：读 → difflib 行 diff → 前缀锚点 `content_updates` → `update_content`
- 覆盖边界：空页 append、相同 0 changes、>100 hunks 结构化拒绝
- SKILL.md 三处补丁（ntn-edit / ntn-write / Workflow）
- 保留 `--replace`；stdlib only；属性路径无无关改动

**Non-Goals:**
- 独立 `ntn-safe-replace` 脚本
- `--replace` 子页面预检拦截
- `ntn-resolve` URL 正则增强
- 改 `ntn-edit` / `capabilities.yaml` / 自动全局 sync

## Decisions

1. **载体扩展 `ntn-write`，不新建命令**  
   写入入口统一；与 fusion 裁决一致。实现参考 fusion 脚本：新增 `build_content_updates` + `safe_replace_content` + argparse flag。

2. **API 路径只走 `update_content`**  
   与 `ntn-edit` 同族，满足「不删块 / 保留子页面」。不调用 `replace_content`。

3. **diff 算法：`difflib.SequenceMatcher` + 前一 equal 行锚点**  
   - insert：`old_str=anchor`，`new_str=anchor+"\n"+chunk`  
   - delete：`old_str=anchor+"\n"+chunk`，`new_str=anchor`  
   - replace：两侧均带 anchor  
   - 无 anchor 的文首/空页由调用方降级  
   对齐 Notion first-match 语义；零依赖。

4. **hunk 上限 100**  
   与 `ntn-edit` ops 上限一致，避免单次 payload 过大。

5. **文档优先于预检**  
   P0 文档把 agent 从 `--replace` 导走；`--safe-replace` 为默认大替换工具。`--replace` 预检列为后续可选，不进本 change。

6. **落地方式**  
   优先 `cp` fusion 版脚本覆盖 `scripts/ntn-write`（已还原 phone_number 无关改动），再按补丁文件改 SKILL.md；语法检查 + 本地 diff 单测（无网络）验证 `build_content_updates`。

7. **全局同步**  
   仓库内改完后，sync 到 `~/.pi/agent/` 需用户确认再跑 `scripts/sync-pi-agent.sh`。

## Risks / Migration

| 风险 | 缓解 |
|------|------|
| Notion 返回 markdown 与 agent 预期格式不一致导致 diff 误匹配 | `--safe-replace` 以 API 读回的实际 markdown 为 baseline；失败时 stderr 透传 API 错误 |
| 超大页 >100 hunks | 结构化 `diff_too_large` + 降级建议；不静默截断 |
| Agent 仍误用 `--replace` | SKILL 三处警告；可选后续加预检 |
| fusion 脚本与当前仓库脚本漂移 | apply 时 diff 核对后整文件替换或最小补丁；不改属性映射 |
| 全局 skill 未同步 | verification 记录 repo 已改 / sync 待确认 |

**Migration:** 无 breaking change。已有调用方继续用 `--replace`/`--append`/`--set`。推荐路径改为有子页面时用 `--safe-replace`。
