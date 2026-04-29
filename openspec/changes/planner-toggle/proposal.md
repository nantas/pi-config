# Proposal

## 问题定义

日常使用 Pi 时，经常需要先做代码分析和规划，再进入实现执行。当前缺少一种便捷方式将 Agent 切换为"只读规划模式"：以特定模型（deepseek/deepseek-v4-pro）进行代码探索与分析，同时确保不会误操作修改仓库文件。用户需要一个快速、无需离开交互界面的切换机制。

## 范围边界

**In scope:**
- 通过键盘快捷键 `Ctrl+Alt+P` 在 default 模式和 planner 模式间切换
- 通过命令 `/planner` 作为快捷键的备用入口
- Planner 模式下自动切换模型为 `deepseek/deepseek-v4-pro`
- Planner 模式下限制工具集为只读（拦截 write / edit；bash 白名单限制）
- 退出 planner 时恢复进入前的模型
- 状态栏显示当前模式标识
- 模式切换时的 toast 通知
- Planner 模式状态的 session 持久化（resume 时恢复）

**Out of scope:**
- CLI flag（`--planner`）：不需要
- 规划步骤提取 / 进度追踪（属于 plan-mode 参考扩展的功能，本扩展不做）
- 自定义系统提示词注入（planner 模式只需注入最小化指令，不引入复杂的 persona 系统）
- 多模型配置（planner 模型固定为 deepseek/deepseek-v4-pro）

## Capabilities

### New Capabilities

- `planner-toggle`: 通过快捷键（`Ctrl+Alt+P`）或命令（`/planner`）在 default 模式与 planner 模式之间切换。Planner 模式使用 deepseek/deepseek-v4-pro 模型，限制工具为只读集合，阻止文件修改。退出时恢复原模型。支持状态栏指示、通知反馈和 session 持久化。

### Modified Capabilities

（无）

## Capabilities 待确认项

- [x] 能力清单已与用户确认（快捷键 Ctrl+Alt+P，附加 /planner 命令，无 CLI flag）

## Impact

- **新增文件**: `.pi/extensions/planner-toggle.ts` — 单文件扩展，无 npm 依赖
- **无需修改**: `.pi/settings.json`（扩展自动发现），`.pi/` 下其他配置文件
- **部署**: 通过 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/extensions/`
- **冲突检查**: `Ctrl+Alt+P` 未被 pi-config 现有扩展占用（当前项目无安装此键位的扩展）

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页: `repo://orbitos`
  - 项目页: `openspec/pkg-backlog.md`
  - 回写目标: `repo://pi-config` → `openspec/pkg-backlog.md`
