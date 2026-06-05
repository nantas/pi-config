# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认所有 4 个 capability spec 的实现范围：`capabilities-env-schema`、`sync-env-check`、`pi-fff-global-package`、`pi-fff-env-config`
- [x] 1.2 确认依赖前置：Python 3 + PyYAML 可用（sync 脚本现有依赖），`~/.cache/pi/` 可写

## 2. 核心实现任务

### 2.1 capabilities-env-schema：扩展 capabilities.yaml schema

- [x] 2.1.1 在 `global.settings` 之后、`catalog` 之前插入 `global.env` 节
- [x] 2.1.2 按能力 ID `pi-fff` 分组声明 `FFF_FRECENCY_DB` 和 `FFF_HISTORY_DB`，包含 `value`、`description`、`required: true`
- [x] 2.1.3 添加 `catalog.env` 占位 section（空），注释说明其为 catalog 能力预留
- [x] **验证**：`node -e "require('yaml')"` 解析 capabilities.yaml 无语法错误；`global.env` 中 `pi-fff` 键存在且包含 2 个变量

### 2.2 pi-fff-global-package：添加 pi-fff 到全局包列表

- [x] 2.2.1 在 `global.settings.packages` 末尾添加 `npm:@ff-labs/pi-fff`
- [x] **验证**：`grep "pi-fff" .pi/capabilities.yaml` 可见该条目

### 2.3 sync-env-check：扩展 sync-pi-agent.sh

- [x] 2.3.1 在 dedup 步骤（step 6）和 summary 步骤（step 7）之间插入 env 检查步骤
- [x] 2.3.2 实现 Python 3 内联脚本：
  - 解析 `global.env` 中所有 capability
  - 提取已在 global lists 中激活的 capability ID
  - 对每个活跃能力检查 env var 的存在性和值匹配
  - 检测孤立 env 块（无匹配能力 ID）
  - 自动创建 path 型变量的父目录
  - 输出 OK / WARNING / ERROR 分级信息及修复命令
- [x] **验证**：运行 `scripts/sync-pi-agent.sh`，输出包含 `--- Checking environment variables ---` 和 `pi-fff` 相关检查结果

### 2.4 pi-fff-env-config：配置 shell 环境变量

- [x] 2.4.1 在 `~/.zshenv` 末尾添加 fff 注释块和两条 `export`
- [x] 2.4.2 执行 `source ~/.zshenv` 使环境变量生效
- [x] 2.4.3 确保 `~/.cache/pi/` 目录存在（sync 脚本或手动 `mkdir -p`）
- [x] **验证**：`echo $FFF_FRECENCY_DB` 输出 `$HOME/.cache/pi/fff_frecency`；`echo $FFF_HISTORY_DB` 输出对应路径

### 2.5 文档更新

- [x] 2.5.1 在 `README.md` 的 "外部 Pi 包" 节添加 pi-fff 描述（名称、功能、源文件路径）
- [x] **验证**：`grep "pi-fff" README.md` 可见新条目

## 3. 收敛与验证准备

- [x] 3.1 执行完整 `scripts/sync-pi-agent.sh`，确认：
  - settings.json 包含 `npm:@ff-labs/pi-fff`
  - env 检查步骤成功运行且无 error
  - 所有现有同步路径（extensions、agents、skills、prompts、catalog）未受影响
  - 无重复 sync 警告
- [x] 3.2 启动新 shell 会话，确认 `pi-fff` 可通过 `pi` 的 extension 加载
- [x] 3.3 确认 frecency DB 在首次使用后生成于 `~/.cache/pi/fff_frecency/`

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 `verification.md`（覆盖 spec-to-implementation 与 task-to-evidence）
- [x] 4.2 基于 `verification.md` 结论生成或更新 `writeback.md`（目标、字段映射、前置条件）
- [x] 4.3 执行 `writeback.md` 中定义的回写目标，并记录可审计证据（链接、时间、执行人、结果）
