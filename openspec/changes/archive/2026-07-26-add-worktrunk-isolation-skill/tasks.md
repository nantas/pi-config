# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `specs/worktrunk-isolation/spec.md` 的 10 个 requirement 全部有对应实现落点（SKILL.md 章节 / install.md / capabilities.yaml / README）。
- [x] 1.2 确认前置：worktrunk 工具行为与 `docs/plans/worktrunk-isolation-skill-handoff.md` 已验证段落一致（`--no-cd --format json` 输出、`wt remove` dirty 拒删、path 模板变量）。

## 2. 核心实现任务

- [x] 2.1 新建 `.pi/skills/worktrunk-isolation/SKILL.md`（~100 行），6 节结构：When to use/not → Preflight → Protocol（每步 completion criterion）→ Merge gate（加粗，positive 主轴，leading word「门禁」）→ Command recipes（`--no-cd --format json`）→ Config（推荐 user config `worktree-path`，不碰 project hooks）。覆盖 spec req：存在性/invocation、生命周期、preflight、创建/复用、门禁、汇报、config、命令白/黑名单。
- [x] 2.2 新建 `.pi/skills/worktrunk-isolation/references/install.md`：brew/cargo 安装、`wt` vs `wiredtiger` / Windows `git-wt` 冲突、平台矩阵、shell 集成（agent 始终 `--no-cd`）。覆盖 spec req：安装参考下沉。
- [x] 2.3 验证 SKILL.md 不出现独立 doctor 脚本引用，preflight checklist 即 doctor（spec req：preflight 即 doctor）。
- [x] 2.4 验证 SKILL.md 用 positive 措辞主导门禁，仅保留无法正向表述的硬护栏（`wt switch -x`）为禁止项（spec req：门禁 + writing-great-skills negation 原则）。

## 3. 收敛与验证准备

- [x] 3.1 在 `.pi/capabilities.yaml` 的 `global.skills` 追加 `worktrunk-isolation`（spec req：catalog 登记与全局同步）。
- [x] 3.2 按 `docs/reference/readme-governance.md` 在 README 与 `docs/getting-started.md` 能力表各加一行描述。
- [x] 3.3 运行 `scripts/sync-pi-agent.sh` 校验同步无 drift（dry-run 或用户确认后执行）。

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 `verification.md`（覆盖 spec-to-implementation 与 task-to-evidence）。
- [x] 4.2 基于 verification.md 结论生成或更新 `writeback.md`（目标 `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`、字段映射、前置条件）。
- [x] 4.3 执行 writeback.md 中定义的回写目标，并记录可审计证据（链接、时间、执行人、结果）。
