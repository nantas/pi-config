# Writeback

## 回写目标

| 目标 | 路径 | 类型 | 状态 |
|------|------|------|------|
| neonspark prompt 文件 | `repo://neonspark/.pi/prompts/trellis-analytics.md` | 直接写入 | ✅ 已部署 |

## 字段映射

### Prompt 文件内容

- **来源**: pi-config `openspec/changes/trellis-analytics-prompt/` 中的 specs + design + tasks
- **目标**: `repo://neonspark/.pi/prompts/trellis-analytics.md`
- **内容**: 完整 prompt 文件（frontmatter + 前置规则 + Phase 1-3 + 交叉验证 + 流程总结）
- **大小**: ~8.8KB

### 无需额外回写

- neonspark 仓库无 `.pi/capabilities.yaml`，无需更新 manifest
- 不涉及 pi-config 全局同步（prompt 仅部署到 neonspark）
- 不修改 trellis-analytics.ts extension 代码
- 不修改 Trellis 框架组件

## 前置条件

- [x] neonspark 仓库可写
- [x] `.pi/prompts/` 目录已存在
- [x] Prompt 文件已通过 verification.md 验证

## 回写执行

| 步骤 | 执行人 | 时间 | 结果 |
|------|--------|------|------|
| 直接写入 prompt 文件 | pi agent (本次 session) | 2026-05-13 | ✅ 文件已创建于 `/Volumes/Shuttle/unity-projects/neonspark/.pi/prompts/trellis-analytics.md` |
