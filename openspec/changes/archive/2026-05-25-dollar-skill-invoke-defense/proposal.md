# Proposal

## 问题定义

`dollar-skill-invoke` extension 出现间歇性注入失败：用户使用 `$skill-name` 语法发送消息时，extension 未将对应 skill 内容展开注入到 session 上下文中，导致 LLM agent 未遵循 skill 工作流指令，直接跳过流程开始执行。

### 已验证事实

通过 2026-05-25 的详细 session 调试（参见 session `019e5d3d`），确认以下事实：

1. **Extension 代码逻辑正确** — `handleContextInjection` 的 regex 匹配、skill 查找、文件读取、消息注入各环节在正常路径下均能正确执行
2. **Skill 文件存在且可读** — `.agents/skills/trellis/trellis-brainstorm/SKILL.md` 等文件系统路径完整
3. **Pi 的 `context` event 链路完整** — `transformContext` → `emitContext` → extension handler 全链路存在
4. **`pi.getCommands()` 是唯一的数据源** — extension 完全依赖 `pi.getCommands().filter(c => c.source === "skill")` 获取 skill 列表，没有任何 fallback

### 核心风险

`pi.getCommands()` 返回值与 Pi ResourceLoader 加载状态耦合。如果因竞态、缓存、多 session 切换等原因导致 `getCommands()` 返回空或不完整，injection 静默失败——用户和 agent 均无法感知，直接表现为"agent 不按 skill 工作流执行"。

## 范围边界

### In Scope

- `dollar-skill-invoke` extension 的 skill 发现链路增加独立文件系统 fallback
- `handleContextInjection` 增加多层防御：`getCommands()` → 缓存索引 → 即时扫描
- Dedup 逻辑增强：扫描用户消息后 5 条而非仅 1 条
- `session_start` 预建文件系统 skill 索引

### Out of Scope

- `pi.getCommands()` 本身的加载时序问题（属于 Pi 核心）
- 其他 extension 的类似问题
- Skill 内容的格式或解析逻辑变更

## Capabilities

### Modified Capabilities

- `dollar-skill-invoke`: 增加独立文件系统 skill 索引作为 `pi.getCommands()` 的 fallback；`handleContextInjection` 增加多层回退链路；dedup 扫描范围从 1 条扩大到 5 条消息；`session_start` 预建文件系统索引

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

- **正向**：消除 `$skill-name` 注入失败的间歇性问题，提升工作流可靠性
- **风险**：文件系统扫描增加少量启动开销（< 10ms，扫描 4 个目录共约 100 个 SKILL.md 文件），可忽略
- **回退**：删除 `_fileSystemSkillIndex` 相关代码即可回退，不影响主路径

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - spec_standard_ref: `openspec/specs/dollar-skill-invoke/spec.md`
  - writeback_targets: `repo://pi-config:.pi/extensions/dollar-skill-invoke.ts`
