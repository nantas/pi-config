# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 capability spec 的实现范围与边界
  - `settings-merge-strategy`: 缓存 + 合并逻辑，仅影响 `render_settings_file()`
- [x] 1.2 确认依赖前置条件
  - `scripts/sync-pi-agent.sh` 存在且 `render_settings_file()` 使用 node inline script
  - `~/.pi/agent/settings.json` 是 sync 的目标文件

## 2. 核心实现任务

- [x] 2.1 修改 `render_settings_file()` 的 node inline script，增加 pre-sync cache 逻辑
  - 标准：在覆写前读取目标文件，提取 `USER_MANAGED_KEYS` 中的字段值
  - 验证：目标文件存在时 cache 非空，不存在时 cache 为空
- [x] 2.2 实现 post-sync merge 逻辑
  - 标准：manifest 过滤完成后，将缓存的字段合并回结果（target wins）
  - 验证：合并后的文件包含目标端的 `enabledModels` 值
- [x] 2.3 定义 `USER_MANAGED_KEYS` 白名单
  - 标准：初始值为 `["enabledModels"]`，在 node script 中声明
  - 验证：只有白名单中的键被缓存和合并
- [x] 2.4 确保 manifest 过滤优先级高于合并
  - 标准：`exclude_keys` 中的键即使出现在 cache 中也不被合并
  - 验证：将 `enabledModels` 加入 `exclude_keys`，确认合并后被移除
- [x] 2.5 实现原子写入
  - 标准：使用临时文件 + fs.renameSync 完成最终写入
  - 验证：写入过程中断时目标文件保持有效

## 3. 收敛与验证准备

- [x] 3.1 整理 verification 检查点
  - pre-sync cache 正确读取目标字段
  - post-sync merge 正确写回目标字段
  - manifest 过滤优先级正确
  - 原子写入不损坏文件
- [x] 3.2 标记 writeback 摘要内容
  - sync 脚本行为变更摘要
  - 新增 `USER_MANAGED_KEYS` 机制说明

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成 `verification.md`
- [x] 4.2 基于 `verification.md` 生成 `writeback.md`
- [x] 4.3 执行 writeback 到 `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`，记录可审计证据
