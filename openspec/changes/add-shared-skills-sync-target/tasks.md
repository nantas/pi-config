# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `specs/capability-manifest/spec.md` 四个 Requirement 的实现落点：字段声明（manifest）、同步段+重复声明报错（sync node 脚本）、env 校验 active_ids（sync Python 段）、help 文本
- [x] 1.2 合并前核对：`diff -r` 确认 `.agents` 版与 repo 版差异文件清单仅为 SKILL.md + references/{career,search,social,video,web}.md + 新增 finance.md，无其他意外差异

## 2. 核心实现任务

- [x] 2.1 合并 agent-reach：上游 `.agents` 版 SKILL.md + references/* 覆盖仓库版本，新增 finance.md，保留 SKILL_en.md；验证：`diff -r` 仓库版与 `~/.agents/skills/agent-reach/` 仅剩 SKILL_en.md 差异
- [x] 2.2 `capabilities.yaml`：新增 `global.shared_skills: [agent-reach]`（含注释说明共享层语义与无清理约束），从 `global.skills` 移除 agent-reach；验证：YAML 解析通过、两列表无交集
- [x] 2.3 `sync-pi-agent.sh` node 段：`extractItems("global", "shared_skills")` + `AGENTS_SKILLS_ROOT` env（默认 `~/.agents/skills`）+ 替换式同步段（无 stale 清理）+ `global.skills`∩`global.shared_skills` 重复声明报错退出
- [x] 2.4 `sync-pi-agent.sh` Python env 校验段：`active_ids` 纳入 `global_section.get("shared_skills")`
- [x] 2.5 `sync-pi-agent.sh` help 文本与目录说明：新增 shared skills 目标行
- [x] 2.6 README.md「工作流技能」节：agent-reach 条目改述共享层安装位置；AGENTS.md 治理表新增 shared_skills 增删行；验证：与 capabilities.yaml 实际内容一致

## 3. 收敛与验证准备

- [x] 3.1 本地验证脚本级行为：manifest 双列表重复声明时 sync 报错；构造临时 HOME 下 dry 验证 shared skills 只写目标 skill、不碰共享目录其他内容（不实际执行全局 sync）
- [x] 3.2 汇总验证证据（diff 输出、脚本试跑输出）供 verification.md 引用；标记 closeout 需用户确认的全局 sync 项

## 4. 验证与回写收敛

- [x] 4.1 生成 verification.md（spec-to-implementation 映射 + task-to-evidence）
- [x] 4.2 生成 writeback.md（目标：仓库内文件清单 + 运行时同步操作记录位）
- [x] 4.3 closeout：按 `docs/pi-change-closeout-governance.md` 询问用户是否执行全局 sync；执行后记录结果（共享层更新 + pi 层退役 + stale 清理仅作用于预期条目）于 writeback.md
