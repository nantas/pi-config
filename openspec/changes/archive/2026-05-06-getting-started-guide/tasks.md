# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 capability `getting-started-guide`、`comprehensive-readme`、`global-agent-guidance` 的实现范围与边界
  - 实现范围：纯文档变更，不涉及代码修改
  - 边界：不修改 capabilities.yaml、settings.json、扩展实现
- [x] 1.2 确认依赖前置条件与外部协作项
  - 依赖：现有 `AGENTS.d/pi-provider-model.md` 已存在
  - 依赖：现有 `capabilities.yaml` 内容作为能力清单来源
  - 无外部协作项

## 2. 核心实现任务

### 2.1 创建 `docs/getting-started.md`

- [x] 2.1.1 编写文档头部：目标读者、前置条件、文档定位
  - 验证方式：文件存在且包含目标读者说明
- [x] 2.1.2 编写「第一步：配置模型供应商」
  - 包含内置供应商 Login 流程（A 方案）
  - 包含自定义供应商流程（B 方案），使用非 Ollama 的 generic proxy/gateway 示例
  - 引用 `AGENTS.d/pi-provider-model.md` 作为详细参考
  - 验证方式：文档中包含非 Ollama 的 `models.json` 示例
- [x] 2.1.3 编写「第二步：配置常用模型范围（enabledModels）」
  - 说明 `settings.json` 中的 `enabledModels` 字段
  - 提供 glob 模式示例
  - 验证方式：文档中包含 `enabledModels` 配置示例
- [x] 2.1.4 编写「第三步：查看本仓库的能力清单」
  - 从 `capabilities.yaml` 提取当前能力清单，以表格形式呈现
  - 包含扩展、Agent、技能、Prompts、外部包五类
  - 验证方式：表格内容与 `capabilities.yaml` 一致
- [x] 2.1.5 编写「第四步：确认同步范围」
  - 说明需要用户确认的三项内容（是否全部同步、是否删减、settings.json 默认值）
  - 验证方式：包含明确的确认清单
- [x] 2.1.6 编写「第五步：执行全局同步」
  - 说明 `scripts/sync-pi-agent.sh` 命令
  - 说明同步的内容范围和单向覆盖特性
  - 验证方式：包含完整的同步命令和注意事项
- [x] 2.1.7 编写「第六步：验证 Pi 环境」
  - 提供验证清单（/model、Ctrl+P、/planner 等）
  - 验证方式：包含至少 5 项可勾选的验证项
- [x] 2.1.8 编写「后续扩展：可用工作流」
  - `pkg-research`、 `pi-extension-dev`、 `install-from-pi-config`（明确标注"在其他仓库执行"）
  - OpenSpec 工作流（入口为 `.pi/prompts/` 安装的 prompt 命令）
  - 验证方式：`install-from-pi-config` 描述中包含"在其他仓库执行"字样

### 2.2 修改 `README.md`

- [x] 2.2.1 在 README 标题和短描述之后，「架构分层概览」之前插入「新手上路」章节
  - 章节包含简短描述和指向 `docs/getting-started.md` 的链接
  - 验证方式：README 中搜索"新手上路"出现在"架构分层概览"之前
- [x] 2.2.2 确保现有章节顺序和内容不变
  - 验证方式：对比修改前后的章节列表，确认除新增章节外无其他变化

### 2.3 修改 `.pi/agent/AGENTS.md`

- [x] 2.3.1 在「Pi 供应商与模型配置」节中扩展，增加初学者首次配置情景
  - 增加引用 `docs/getting-started.md` 的说明
  - 验证方式：AGENTS.md 中包含指向 getting-started.md 的引用
- [x] 2.3.2 确保现有 AGENTS.md 内容不变
  - 验证方式：仅新增内容，不删除或修改现有规则

## 3. 收敛与验证准备

- [x] 3.1 整理需要进入 verification 的证据与检查点
  - `docs/getting-started.md` 文件存在且内容完整
  - `README.md` 中「新手上路」章节位置正确
  - `AGENTS.md` 中引用存在
  - 自定义供应商示例非 Ollama
  - `install-from-pi-config` 上下文描述正确
  - OpenSpec 工作流入口描述正确
- [x] 3.2 标记需要进入 writeback 的摘要与状态变更
  - 新增文档：`docs/getting-started.md`
  - 修改文档：`README.md`、`.pi/agent/AGENTS.md`

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 verification.md
- [x] 4.2 基于 verification.md 结论生成或更新 writeback.md
- [x] 4.3 执行 writeback.md 中定义的回写目标
  - `docs/getting-started.md` 已创建
  - `README.md` 已修改
  - `.pi/agent/AGENTS.md` 已修改
