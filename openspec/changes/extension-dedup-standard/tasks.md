# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `extension-dedup-standard` spec 的两个 requirement 覆盖范围
- [x] 1.2 确认 dollar-skill-invoke.ts 的去重点位置（export default 入口）

## 2. 核心实现任务

### 2.1 Dollar-skill-invoke 去重
- [x] 2.1 在 `.pi/extensions/dollar-skill-invoke.ts` 的 export default 函数入口添加 globalThis 去重标记
  - 覆盖 spec: Dollar-Skill-Invoke Self-Dedup
  - 验证: `pi -e .pi/extensions/dollar-skill-invoke.ts` 无启动报错

### 2.2 pi-extension-dev 技能更新
- [x] 2.2 更新 `.pi/skills/pi-extension-dev/SKILL.md`，在 Phase D 中增加 Dedup Requirement 步骤
  - 覆盖 spec: Pi-Extension-Dev Skill Standard
  - 位置: Phase D Step 1 之后
  - 验证: 文件包含自去重要求

## 3. 收敛与验证准备

- [x] 3.1 整理 verification 检查点清单（每个 spec scenario 对应验证步骤）
- [x] 3.2 标记 writeback 摘要所需的变更状态与交付物清单

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 verification.md（覆盖 spec-to-implementation 与 task-to-evidence）
- [x] 4.2 基于 verification.md 结论生成或更新 writeback.md（目标、字段映射、前置条件）
- [x] 4.3 执行 writeback.md 中定义的回写目标，并记录可审计证据（链接、时间、执行人、结果）
