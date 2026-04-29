# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `specs/pi-extension-dev-skill/spec.md` 中 10 个 requirement 的实现范围和边界，特别确认 knowledge loading、OpenSpec integration、deployment sync 三个关键 requirement 的覆盖路径
- [x] 1.2 确认依赖前置条件：`docs/plans/pi-customization-reference.md` Section 3 存在且可引用、`scripts/sync-pi-agent.sh` 存在且无需修改、`repo://pi-mono` 路径可解析

## 2. 核心实现任务

- [x] 2.1 创建 `.pi/skills/pi-extension-dev/` 目录（如不存在）
- [x] 2.2 编写 SKILL.md YAML frontmatter：`name: pi-extension-dev`，`description` 覆盖 skill 用途与使用场景，符合 Agent Skills standard 并满足 spec requirement "Skill placement and discovery"
- [x] 2.3 编写 Phase A 内容（knowledge loading workflow）：引导 LLM 按序加载 `docs/plans/pi-customization-reference.md` Section 3 和 `repo://pi-mono/packages/coding-agent/docs/extensions.md`，满足 spec requirement "Knowledge loading workflow"
- [x] 2.4 编写 Phase B 内容（design decision guidance）：事件选择指引、Tool vs Command 选择矩阵、文件组织决策树，满足 spec requirement "Design decision guidance"
- [x] 2.5 编写 Phase C 内容（OpenSpec change integration）：引导 LLM 调用 openspec-new-change、填充 artifacts、用户 review 确认，满足 spec requirement "OpenSpec change integration"
- [x] 2.6 编写 Phase D 内容（implementation guidance）：代码放置位置、单文件 vs 子目录决策、package.json 模式，满足 spec requirement "Implementation guidance"
- [x] 2.7 编写 Phase E 内容（verification guidance）：`pi -e` 测试、`/reload` 热加载、openspec-verify-change，满足 spec requirement "Verification guidance"
- [x] 2.8 编写 Phase F 内容（deployment + archive）：`./scripts/sync-pi-agent.sh` 部署同步、openspec-archive-change 归档，满足 spec requirement "Deployment sync guidance" 和 "Archival guidance"
- [x] 2.9 编写附录速查表：ExtensionAPI 方法、关键事件、文件路径的紧凑引用表（指向源文档位置，不复制完整 API），满足 spec requirement "Knowledge loading workflow" 中的 no-duplication 约束
- [x] 2.10 全文 review：确认无 `settings.json` 手动编辑指引（满足 spec requirement "Prohibition of settings.json changes for sync"），确认所有路径引用使用 repo-relative 形式

## 3. 收敛与验证准备

- [x] 3.1 确认 `.pi/skills/pi-extension-dev/SKILL.md` 文件存在且内容完整
- [x] 3.2 确认 pi 在 pi-config 仓库目录下启动时能自动发现该 skill（`/skill:pi-extension-dev` 或 available skills 列表中出现）
- [x] 3.3 确认所有引用路径在当前仓库和 pi-mono repo 中可解析
- [x] 3.4 确认 `.pi/settings.json` 无变更（git diff 验证）
- [x] 3.5 确认 `scripts/sync-pi-agent.sh` 无变更（git diff 验证）

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成 `verification.md`：逐条对照 spec requirements，记录每个 scenario 的验证证据
- [x] 4.2 基于 verification 结论生成 `writeback.md`：回写结论、状态变更、项目进度页更新摘要
- [x] 4.3 执行 writeback 回写目标到 `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`，记录可审计证据
