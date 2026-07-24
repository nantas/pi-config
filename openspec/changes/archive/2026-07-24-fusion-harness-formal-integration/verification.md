# Verification

## 验证范围

本 verification 覆盖 `fusion-harness-formal-integration` change 的代码实现环节（Phase A–E）。交互测试（`/reload`、`/opinion`、`/auto-validate`、artifacts 持久化）需用户在 Pi TUI 中完成。

## Spec-to-Implementation

### fusion-harness-integration

| Requirement | 验证方式 | 状态 |
|------------|---------|------|
| Extension Registration | `pi install -l` 成功，`.pi/git/` clone HEAD 匹配 | ✅ PASS |
| Settings Configuration Block | `fusionSettings()` 函数读取 `.pi/settings.json` 的 `fusionHarness` 块，fallback 链：flag → settings → DEFAULT | ✅ 代码已实现 |
| Artifact Persistence | `ARTIFACT_ROOT = path.join(process.cwd(), ".scratch", "fusion-harness")` | ✅ 代码已实现 |
| Sub-agent Context Inheritance | args 数组去掉 `--no-skills` 和 `--no-context-files` | ✅ 代码已实现 |
| FUSION Agent Output Path Compliance | prompt L2 改为锁定 `{{ARTIFACTS_DIR}}`，移除 `/tmp` 引用 | ✅ 代码已实现 |

### capability-manifest

| Requirement | 验证方式 | 状态 |
|------------|---------|------|
| Fork Manifest Entry | `forks/manifest.yaml` 含 fusion-harness 条目 | ✅ PASS |
| Settings.json Package Entry (Dev) | 本地路径 `/Users/nantasmac/projects/forks/fusion-harness` | ✅ PASS（已切换生产模式） |
| Settings.json Package Entry (Prod) | `git:github.com/nantas/fusion-harness` | ✅ PASS |
| Settings.json FusionHarness Block | `architecture`/`builder`/`architectThinking`/`builderThinking` 已配置 | ✅ PASS |
| Global Package Conflict | 全局 settings 无 fusion-harness 条目，无需处理 | ✅ PASS（无冲突） |

## Task-to-Evidence

| Task | 状态 | 证据 |
|------|------|------|
| 1.1 settings.json 开发模式 | ✅ | 本地绝对路径已写入 packages |
| 1.2 pi install -l | ✅ | 成功输出 "Installed" |
| 2.1 ARTIFACT_ROOT | ✅ | L1658-1659 改为 `.scratch` |
| 2.2 spawn args | ✅ | `--no-skills`/`--no-context-files` 已删除 |
| 2.3 FUSION prompt | ✅ | L2 和 L3 `/tmp` 引用已移除 |
| 2.4 settings fallback | ✅ | `fusionSettings()` + `roleThinking()` 已改 |
| 3.1 fusionHarness 配置块 | ✅ | `.pi/settings.json` 含完整块 |
| 4.1 全局冲突检测 | ✅ | 无冲突 |
| 5.1 fork commit & push | ✅ | commit `92c35b6`，tag `v0.1.3`，已推送 |
| 5.2 生产模式 | ✅ | `git:github.com/nantas/fusion-harness` |
| 5.3 恢复全局冲突 | ✅ | N/A（无冲突） |
| 5.4 pi install -l (prod) | ✅ | `.pi/git/` clone HEAD 匹配 |
| 5.5 manifest 更新 | ✅ | `changes_summary` 已更新 |

## 待用户验证（Pi TUI）

- [x] 4.2 `/reload` — 三命令注册无报错
- [x] 4.3 `/opinion hello` — 双栏显示，模型配置生效
- [x] 4.4 `/auto-validate` — gate-first loop 完成
- [x] 4.5 artifacts 持久化 — `.scratch/fusion-harness/` 下有产物
