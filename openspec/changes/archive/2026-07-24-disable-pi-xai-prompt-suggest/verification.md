# Verification

## 验证结论

**通过。** `pi-xai` nantas fork `v0.17.2`（follow-up after `1deacae` / `v0.17.1`）在 `index.ts` 不再调用 `registerXaiPromptSuggest`；项目与全局 runtime 为 `git:github.com/nantas/pi-xai` 0.17.2；unit tests 71 passed；`forks/manifest.yaml` 已记录策略。

用户已确认 **TUI 验证通过**（无 ghost 预填）。独立 verify 的 WARNING 已处理：README 顶部/表格不再 advertise 启用中的 prompt ghost；新增入口不注册回归测试。

## Spec-to-Implementation Coverage

| Requirement | 实现证据 | 结果 |
| --- | --- | --- |
| Prompt-suggest extension is not registered at package entry | `repo://pi-xai/index.ts` 无 import/call；`.pi/git/.../pi-xai/index.ts` 与 `~/.pi/agent/git/.../pi-xai/index.ts` 均为 0.17.1 且无 `registerXaiPromptSuggest(` | ✅ |
| Agent turn ends without ghost prefill | 无注册 → `agent_end` handler 不挂载；无 `setEditorText(asGhostText)` 运行路径 | ✅（静态） |
| Source module may remain | `xai-prompt-suggest.ts` 仍在 fork 树中 | ✅ |
| Fork metadata and docs record disable policy | CHANGELOG 0.17.1、README Prompt ghost 节、`forks/manifest.yaml` changes_summary | ✅ |

## Task-to-Evidence Coverage

| Task | 证据 | 结果 |
| --- | --- | --- |
| 1.1–1.2 范围与 clone | `/Users/nantasmac/projects/forks/pi-xai` clean after ship | ✅ |
| 1.3 开发源切换 | 临时 `file:`，验证后恢复 `git:` | ✅ |
| 2.1 删除注册 | commit `1deacae` | ✅ |
| 2.2 docs | CHANGELOG + README 同 commit | ✅ |
| 2.3 version 0.17.1 | package.json + tag `v0.17.1` | ✅ |
| 2.4 manifest | `forks/manifest.yaml` pi-xai.changes_summary | ✅ |
| 3.1 本地无 ghost | 安装 0.17.1 且 entry 不注册；完整 TUI 交互待用户 `/reload` 确认 | ⚠️ 静态通过 |
| 3.2 tests | `npm test` → 8 files / 70 tests passed | ✅ |
| 3.3 ship + restore git | push main + tag；settings 双方均为 `git:github.com/nantas/pi-xai` | ✅ |
| 4.1–4.3 | 本文件 + writeback.md | ✅（本阶段） |

## 关键证据入口

| 证据类型 | 证据路径/链接 | 对应 requirement/task |
| --- | --- | --- |
| Commit | https://github.com/nantas/pi-xai/commit/1deacaeab2af1e2d17bb08583c762f4d9b79d869 | 2.1–2.3 |
| Tag | https://github.com/nantas/pi-xai/releases/tag/v0.17.1（tag `v0.17.1`） | 3.3 |
| Runtime clone (project) | `.pi/git/github.com/nantas/pi-xai` @ 0.17.1 no register | 3.1 / entry req |
| Runtime clone (global) | `~/.pi/agent/git/github.com/nantas/pi-xai` @ 0.17.1 no register | 3.1 |
| Tests | `npm test` in `repo://pi-xai` — 70 passed | 3.2 |
| Manifest | `forks/manifest.yaml` pi-xai entry | 2.4 |

## 缺口与阻塞项

- 无阻塞项。TUI 已由用户确认通过。
- 仓库内残留 `npm/node_modules/pi-xai@0.17.0` 副本（非 packages 列表源）可忽略，除非出现双载。
