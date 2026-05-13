# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `specs/trellis-repo-guard/spec.md` 中 4 个 requirement 的实现范围与边界 — 实现 `repo-sentinel-check`、`sentinel-file-specification`、`no-side-effects-on-skip`、`dedup-guard-ordering`
- [x] 1.2 确认无外部依赖 — 仅修改 `.pi/extensions/trellis-analytics.ts`，无新增依赖

## 2. 核心实现任务

- [x] 2.1 在 `export default function(pi)` 入口最顶部（dedup guard 之前）添加哨兵检查：`fs.existsSync(path.join(process.cwd(), '.trellis', 'config.yaml'))` — 不存在则 `return` — 覆盖 `repo-sentinel-check`、`sentinel-file-specification`、`dedup-guard-ordering`
- [x] 2.2 验证：在 `return` 路径上，确认无 `globalThis` 写入、无 `pi.on()` 调用、无 `pi.registerTool()` 调用、无文件系统写入 — 覆盖 `no-side-effects-on-skip`

## 3. 收敛与验证准备

- [x] 3.1 运行既有测试 `npx tsx tests/trellis-analytics.test.ts` 确认无回归
- [x] 3.2 在 pi-config 仓库启动 Pi session，确认不再创建 `.trellis/.analytics/` 目录
- [x] 3.3 标记 verification.md 检查点：哨兵检查存在、Trellis 仓库行为不变、非 Trellis 仓库零副作用

## 4. 验证与回写收敛

- [x] 4.1 基于 3.x 验证结果生成 verification.md
- [x] 4.2 生成 writeback.md（本 change 无外部回写目标，记录完成状态即可）
