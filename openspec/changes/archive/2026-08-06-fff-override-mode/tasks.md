# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `pi-fff-env-config` spec delta 覆盖范围：`PI_FFF_MODE` 取值规范 + 降级路径（见 `specs/pi-fff-env-config/spec.md`）
- [x] 1.2 确认依赖前置：pi-fff v0.10.1+ 已安装（`~/.pi/agent/npm/node_modules/@ff-labs/pi-fff/package.json` 确认）；pi-powerline 已安装；冲突消除代码证据已采集

## 2. 核心实现任务

- [x] 2.1 翻转 `.pi/capabilities.yaml` `global.env.pi-fff.variables.PI_FFF_MODE.value`：`tools-only` → `override`，同步更新 description 记录冲突消除依据
- [x] 2.2 翻转 `~/.zshenv:19` `export PI_FFF_MODE`：`tools-only` → `override`
- [x] 2.3 执行 `scripts/sync-pi-agent.sh`，确认无 `PI_FFF_MODE mismatch` WARNING（本轮 sync 仅校验不写文件，zshenv 手改是必须的）
- [x] 2.4 用户重启 pi，实测 `@` 补全与 pi-powerline 编辑器共存（spec `Override tool registration in effect` scenario 的 `@`-mention 部分）—— **用户确认通过**

## 3. 收敛与验证准备

- [x] 3.1 整理进入 verification 的证据：capabilities.yaml diff、zshenv diff、sync 输出、用户实测结论（工具列表变化 + @ 补全共存）
- [x] 3.2 标记 writeback 摘要：本 change 是配置值翻转，回写目标已在实现阶段即时完成，writeback 记录事后可审计证据即可

## 4. 验证与回写收敛

- [x] 4.1 生成 verification.md，覆盖 spec-to-implementation（每个 Requirement 对应的实现证据）与 task-to-evidence（每个 task 的完成凭证）
- [x] 4.2 生成 writeback.md，记录回写目标、字段映射、执行结果（回写已在 change 创建时即时执行，此处补证据）
- [x] 4.3 若决定归档本 change，执行 `/opsx-archive` 并按 `docs/pi-change-closeout-governance.md` 检查 CONTEXT.md 索引是否需要更新（本 change modified 了 `pi-fff-env-config` 既有 capability，检查是否已在其分组）—— CONTEXT.md:85 已含 slug，无需追加
