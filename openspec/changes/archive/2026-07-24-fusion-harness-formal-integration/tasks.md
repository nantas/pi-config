# Tasks

## 1. Fork 注册（Phase A 收尾）

- [x] 1.1 settings.json 切换到开发模式 — `.pi/settings.json` 的 packages 数组新增本地绝对路径 `/Users/nantasmac/projects/forks/fusion-harness`
  - 覆盖 spec: `capability-manifest` — Settings.json Must Reference Fusion Harness Package (开发模式)
- [x] 1.2 执行 `pi install -l` — 验证本地路径可被 pi 解析
  - 覆盖 spec: `fusion-harness-integration` — Extension Registration (loaded via fork)

## 2. Fork 代码修改（4 项）

- [x] 2.1 ARTIFACT_ROOT 改为 `.scratch/fusion-harness/` — `fusion-harness.ts` L1659 常量从 `/tmp` 改为 `path.join(process.cwd(), ".scratch", "fusion-harness")`
  - 覆盖 spec: `fusion-harness-integration` — Artifact Persistence
  - 验证: 执行 `/fusion` 后检查 `<cwd>/.scratch/fusion-harness/` 下有 artifacts
- [x] 2.2 子 agent spawn 参数调整 — `runChild()` 函数 args 数组中删除 `"--no-skills"` 和 `"--no-context-files"`，保留 `"--no-extensions"`
  - 覆盖 spec: `fusion-harness-integration` — Sub-agent Context Inheritance
  - 验证: 子 agent 日志确认 skills 和 context files 已加载
- [x] 2.3 FUSION prompt 路径锁定 — `USER_PROMPT_FUSION_MERGE.md` 第 2 行改为 `Write ALL artifacts under {{ARTIFACTS_DIR}}. NEVER use /tmp or any other directory.`
  - 覆盖 spec: `fusion-harness-integration` — FUSION Agent Output Path Compliance
  - 验证: 执行 `/fusion` 后 FUSION agent 产出在 artifacts dir 而非 `/tmp`
- [x] 2.4 settings.json fallback — `architectModel()` 和 `builderModel()` 增加 `getSettingsPath()` 读取 `fusionHarness` 块
  - 覆盖 spec: `fusion-harness-integration` — Settings Configuration Block
  - 验证: 不传 `--architect` flag 时，settings.json 配置的模型生效

## 3. settings.json 配置

- [x] 3.1 添加 `fusionHarness` 配置块到 `.pi/settings.json`
  ```json
  "fusionHarness": {
    "architect": "deepseek/deepseek-v4-pro",
    "builder": "zhipuai-coding-plan/glm-5.2",
    "architectThinking": "high",
    "builderThinking": "medium"
  }
  ```
  - 覆盖 spec: `capability-manifest` — Settings.json Must Define Fusion Harness Configuration Block

## 4. 本地测试（Phase D）

- [x] 4.1 全局包冲突检测与处理 — 检查 `~/.pi/agent/settings.json` 是否有 fusion-harness 条目，有则移除并记录
  - 覆盖 spec: `capability-manifest` — Global Package Conflict Must Be Resolved
- [x] 4.2 `/reload` 测试 — 在 Pi TUI 中执行 `/reload`，确认三条命令注册成功、无报错
- [x] 4.3 `/opinion` 功能测试 — 执行 `/opinion hello`，验证双栏显示正常、模型配置生效
- [x] 4.4 `/auto-validate` 功能测试 — 执行 `/auto-validate "write a hello.py that prints hello world"`，验证 gate-first loop 完成
- [x] 4.5 artifacts 持久化验证 — 确认 `.scratch/fusion-harness/` 下有 run 的中间产物

## 5. 提交与发布（Phase E）

- [x] 5.1 提交 fork 修改 — 在 dev clone 中 commit + tag + push
- [x] 5.2 settings.json 切换生产模式 — 本地路径 → `git:github.com/nantas/fusion-harness`
- [x] 5.3 恢复全局包冲突条目 — 从覆盖记录恢复 `~/.pi/agent/settings.json` 中被移除的条目
- [x] 5.4 执行 `pi install -l git:github.com/nantas/fusion-harness` 并验证 `.pi/git/` 克隆 HEAD 匹配
- [x] 5.5 更新 `forks/manifest.yaml` — `changes_summary` 记录修改内容

## 6. 收敛与验证

- [x] 6.1 生成 `verification.md` — 逐项验证 spec requirements 已满足
- [x] 6.2 生成 `writeback.md` — 记录回写目标状态与执行证据
