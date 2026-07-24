# Design

## Context

规范真源：
- `specs/capability-manifest/spec.md` — 无 pin 的 global package 条目 + `global.settings.fusionHarness`
- `specs/fusion-harness-integration/spec.md` — 全局交付形态；sync 延后仍算 apply 完成

现状：
- 项目 `.pi/settings.json` 已有 `git:github.com/nantas/fusion-harness#v0.1.3` 与 `fusionHarness` 块
- `.pi/capabilities.yaml` `global.settings.packages` 无 fusion-harness；无 `fusionHarness` 键
- `scripts/sync-pi-agent.sh` 只从 manifest `global.settings` 生成 `~/.pi/agent/settings.json`；未列入则不同步
- fork 源码 / housekeep ship 在其他 session，不阻塞本 change

## Goals / Non-Goals

**Goals:**
- 在能力表声明 fusion-harness 全局 package 源（无 `#` pin）
- 在能力表声明全局 `fusionHarness` 四字段默认值（与当前项目 settings 对齐）
- 可选对齐项目 package 源字符串为无 pin，避免日后 dedupe/语义分叉
- OpenSpec delta 把「仅项目注册」修正为「global 能力表注册」

**Non-Goals:**
- 运行 `scripts/sync-pi-agent.sh` 或编辑 `~/.pi/agent/`
- fork 代码、tag、push
- catalog 分发
- `global.extensions` 本地扩展登记
- env / skills / agents / prompts
- 改变 extension 内 CLI > settings > built-in 覆盖顺序

## Decisions

1. **分发层：global.settings.packages，不是 catalog / extensions**  
   fusion-harness 是 git package（`package.json` `pi.extensions`），与 pi-xai 等同路径。跨仓默认可用 → global，不是 `catalog.packages`。

2. **源字符串：无 pin**  
   使用 `git:github.com/nantas/fusion-harness`。不跟随项目现状的 `#v0.1.3`。日后其他 session ship 后，无 pin 源按 Pi 包解析策略取最新，无需本 change 再 bump 能力表。

3. **配置字段：写进 global.settings.fusionHarness**  
   取值（与当前项目一致）：
   ```yaml
   fusionHarness:
     architect: kimi-coding/k3
     builder: grok-build/grok-4.5
     architectThinking: high
     builderThinking: high
   ```
   放在 `global.settings` 下，使 sync 的 manifest-authoritative 合并会写入全局 `settings.json`（当日后执行 sync 时）。

4. **项目 settings：package 源对齐为可选但推荐；fusionHarness 可留**  
   - packages 项：建议去 pin，与 global 一致  
   - `fusionHarness`：可保留作项目覆盖面；本 change 不要求删除  
   - 不在本 change 触发 dedupe（dedupe 绑在 sync）

5. **sync 延后**  
   apply 完成定义 = 仓内能力表（+ 可选项目对齐）落地并通过结构检查。  
   全局生效路径单独记录为后续操作：用户确认 → `scripts/sync-pi-agent.sh` → 必要时全局 `pi install` / 重启。

6. **实现编辑面最小化**  
   主 diff 预期仅 `.pi/capabilities.yaml`；次 diff 最多 `.pi/settings.json` package 字符串。无脚本改动。

## Risks / Migration

| 风险 | 处理 |
|------|------|
| 无 pin 源解析到未验证 commit | 接受用户选择；fork 治理在其他 session；manifest `changes_summary` 仍可记录版本故事 |
| 全局模型默认不适配其他机的 provider | 已知代价；可日后改能力表默认或仅靠 CLI/项目覆盖 |
| apply 后用户以为已全局生效 | verification / writeback 明确写「sync deferred」 |
| 日后 sync 从项目 settings dedupe 掉 fusion package 行 | 预期行为；保留 `fusionHarness` 项目块不受 packages dedupe 影响 |
| housekeep 未进 remote 时全局先 sync | 全局会装到无 pin 源当前解析结果；与本 change 无关，不阻塞能力表写入 |

**迁移顺序（本 change 内）：**  
编辑 capabilities.yaml →（可选）去 pin 项目 package → 结构自检 → 不 sync。

**迁移顺序（其他 session / 操作员）：**  
fork ship（如需）→ 用户确认 → `scripts/sync-pi-agent.sh` → 确认 `~/.pi/agent/settings.json` 含 package + fusionHarness → 安装/重启验证 slash 命令。
