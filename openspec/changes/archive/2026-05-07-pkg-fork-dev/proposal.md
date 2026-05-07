# Proposal

## 问题定义

当前 pi-config 通过 `pkg-research` skill 管理第三方 Pi package 的引入决策，通过 `pi-extension-dev` skill 管理自有扩展的完整开发周期。但当需要对已配置的第三方 package 进行功能定制或 bug 修复时，缺少结构化的 fork 开发工作流：

- **fork 后管理分散**：每个 fork 仓库独立维护，缺少统一的注册与追踪机制
- **开发闭环缺失**：从 fork 搭建 → 修改规划 → 实现 → 本地测试 → 提交推送，各环节无标准化指引
- **跨环境 clone 路径不固定**：不同机器的开发目录不同，commit 到仓库的配置不能写死本地路径
- **与现有基础设施脱节**：fork 的注册、settings.json 来源更新、capabilities.yaml 同步、upstream 追踪等操作无统一入口

## 范围边界

**本次 change 交付：**

- `pkg-fork-dev` skill：6 阶段 fork 开发闭环工作流
- `forks/manifest.yaml`：fork 注册表，记录所有 fork 的 canonical 元数据
- `forks/manifest.yaml` 与 `repo-registry` 的分工：manifest 存 canonical 信息（GitHub URL、版本、状态），本地 clone 路径由 repo-registry 的 `repo://` 映射管理

**明确排除：**

- 不修改 `pkg-research` 或 `pi-extension-dev` skill 的现有逻辑
- 不改变 Pi 的 package 安装机制
- 不创建独立的 fork CI/CD 或自动化发布流水线

## Capabilities

### New Capabilities

- `pkg-fork-dev`: 6 阶段 fork 开发闭环 skill，覆盖 Fork & Setup → Modification Planning → Implementation → Local Testing → Commit & Ship → Maintenance 全流程
- `fork-manifest`: forks/manifest.yaml 注册表，提供 fork 条目的 schema 定义与读写规范
- `fork-integration`: fork 后的 pi-config 配置更新流程（settings.json 来源切换、capabilities.yaml 条目更新、pkg-backlog 记录）

### Modified Capabilities

（无）

## Capabilities 待确认项

- [x] 能力清单已与用户确认：按 6 阶段闭环设计，覆盖首次 fork、修改已有 fork、同步上游三种入口场景

## Impact

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `.pi/skills/pkg-fork-dev/SKILL.md` | 新增 | fork 开发工作流 skill |
| `forks/manifest.yaml` | 新增 | fork 注册表 |
| `.pi/capabilities.yaml` | 修改 | catalog.skills 追加 `pkg-fork-dev` |
| `openspec/pkg-backlog.md` | 修改 | pilot 案例记录 |
| `.pi/settings.json` | 可能修改 | pilot 案例中切换 package 来源 |

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：`repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - 项目页：`repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
  - 回写目标：`repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
