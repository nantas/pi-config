# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 对照 `specs/notion/spec.md` 确认实现范围：仅 `.pi/skills/notion/scripts/ntn-write` + `.pi/skills/notion/SKILL.md`；不改 `ntn-edit` / resolve / capabilities.yaml
- [x] 1.2 核对参考实现与当前脚本差异：`diff` fusion `ntn-write-fused-deepseek-v4-pro-glm-5.2` vs `.pi/skills/notion/scripts/ntn-write`；确认无 `phone_number` 无关改动
- [x] 1.3 核对 SKILL.md 三处 `oldText` 锚点仍存在（ntn-edit 段末、`--replace` 示例行、Workflow「Editing a long page」第 3 步）

## 2. 核心实现 — ntn-write `--safe-replace`

- [x] 2.1 落地 `build_content_updates(old_md, new_md)`（stdlib `difflib` + 前缀锚点），覆盖 insert/delete/replace（spec: `ntn-write-props-and-content` safe-replace 场景）
- [x] 2.2 落地 `safe_replace_content(page_id, markdown)`：读 markdown → 空页 append / 相同 0 changes / >100 hunks `diff_too_large` / 否则 `update_content`
- [x] 2.3 argparse 注册 `--safe-replace`；main 互斥分支包含该 flag；usage/error 文案列出四个操作之一
- [x] 2.4 保留 `--replace` 行为不变（仅可补 docstring 危险说明）；`build_property_value` / `--set` / `--append` 无行为漂移
- [x] 2.5 语法验证：`python3 -c "import ast; ast.parse(open('.pi/skills/notion/scripts/ntn-write').read())"` 且 `--help` 含 `safe-replace`
- [x] 2.6 离线单测 `build_content_updates` 四场景：数字迭代、追加章节、完全相同、删除中间段（每个非零 hunk 的 `old_str` 带锚点）

## 3. 核心实现 — SKILL.md 文档补丁

- [x] 3.1 补丁 A：ntn-edit 段末改为推荐 `--ops` / `--safe-replace`，强调保留子页面（spec: `skill-docs-replace-guidance`）
- [x] 3.2 补丁 B：ntn-write 段追加 `--safe-replace` 示例 + `--replace` 陷阱与 fallback
- [x] 3.3 补丁 C：Workflow「Editing a long page」追加 NEVER `--replace` / 用 `--safe-replace`
- [x] 3.4 验证：`grep -n "safe-replace" .pi/skills/notion/SKILL.md` 至少 3 处；`child page` / 陷阱说明可见

## 4. 收敛与验证准备

- [x] 4.1 可选在线回归（需 ntn 登录）：对挂子页面的 page id `3a663e9b-7ea6-807f-9803-c92722ab4f1a` 跑 `--safe-replace`，确认不 400 且子页面仍在；无权限则记 skip 与原因
- [x] 4.2 列出 verification 证据清单：脚本 diff、语法/单测输出、SKILL grep、是否已/待 sync
- [x] 4.3 **不要**自动跑全局 sync；verification/writeback 阶段由用户确认后再执行 `scripts/sync-pi-agent.sh`

## 5. 验证与回写收敛

- [x] 5.1 实现完成后生成/更新 `verification.md`（spec-to-implementation + task-to-evidence）
- [x] 5.2 基于 verification 生成/更新 `writeback.md`
- [x] 5.3 用户确认后执行 writeback 目标并记录证据
