# Verification

## 自动化验证

| 验证项 | 方法 | 状态 |
|--------|------|------|
| `docs/reference/pi-package-loading.md` 存在 | `ls docs/reference/pi-package-loading.md` | ✓ |
| 参考文档无敏感信息 | `grep -c "password\|secret\|token" ...` = 0 | ✓ |
| SKILL.md 包含 D1a 步骤 | `grep -c "D1a.*Global dedup" .pi/skills/pkg-fork-dev/SKILL.md` | ✓ |
| SKILL.md 包含 D5a 步骤 | `grep -c "D5a.*Persist record" .pi/skills/pkg-fork-dev/SKILL.md` | ✓ |
| SKILL.md E4 包含全局恢复 | `grep -c "Restore global settings" .pi/skills/pkg-fork-dev/SKILL.md` | ✓ |
| SKILL.md 包含 Session Recovery 附录 | `grep -c "Session Loss Recovery" .pi/skills/pkg-fork-dev/SKILL.md` | ✓ |

## 手动验证（需实际 fork 开发验证）

| 场景 | 预期行为 | 验证方法 |
|------|---------|---------|
| Phase D1a 检测到冲突 | 从全局 settings 移除同名包条目 | 使用有全局条目的包执行 Phase D |
| Phase D1a 无冲突 | 直接继续，不修改全局 | 使用全局无条目的新包执行 Phase D |
| Phase D5a 持久化确认 | override 记录写入 writeback.md 或 .pi-dev-state.json | 检查对应文件 |
| Phase E4 全局恢复 | 移除的条目恢复到全局 settings | 执行完整 Phase E 流程 |
| Phase E4 清理 | .pi-dev-state.json 被删除 | 检查 dev clone 目录 |
| Session 丢失恢复 | 通过三种路径发现异常并恢复 | 模拟 session 中断 |

## 回归风险评估

- **低风险**: 参考文档新增不影响运行时
- **低风险**: SKILL.md 变更仅添加步骤，不修改现有步骤行为
- **需验证**: D1a 的全局 settings 修改操作使用原子写入，不损坏文件
