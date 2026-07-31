# Verification

## 验证方法

独立验证由 reviewer subagent 执行 /opsx-verify 全流程（读 artifacts → 任务勾选检查 → spec requirement 到实现映射 → design 决策核对 → 代码模式一致性 + 实跑命令验证），主 agent 在验证后修复了 1 个 WARNING。

## Spec-to-Implementation Coverage

| Requirement | 实现证据 | 状态 |
|---|---|---|
| `manifest-declares-shared-models` | `.pi/capabilities.yaml` `global.models.deepseek`：`apiKey: "$DEEPSEEK_API_KEY"`（env 引用）、`models` 数组含 api/baseUrl/reasoning/contextWindow 等 | ✅ |
| `sync-renders-models-json` | `scripts/sync-pi-agent.sh` `render_models_file()`：manifest provider 权威替换 + 未声明 provider preserve + 顶层非 providers key 保留 + 目标缺失/损坏降级 + atomic write（temp + rename）；主流程于 render_settings_file 后调用 | ✅ |
| `deepseek-flash-uses-responses-api` | manifest 声明 `api: openai-responses`、`baseUrl: https://api.deepseek.com`、`contextWindow: 1048576`、`thinkingLevelMap`（low/high/max）；v4-pro 未声明（内置保留） | ✅ |
| `readme-reflects-models-governance` | `README.md` `global.models` 节（bullet 模板 + OpenSpec spec 链接）；`docs/getting-started.md` 第三步能力统计新增模型配置行 | ✅ |

## Task-to-Evidence Coverage

| Task | 证据 | 状态 |
|---|---|---|
| 1.1 spec 范围确认 | proposal + design 边界 | ✅ |
| 2.1 manifest 声明 | capabilities.yaml `global.models` 段（yaml 校验通过，null 序列化正确） | ✅ |
| 2.2 YAML 合法 | `yaml.safe_load` 验证 + JSON 序列化 null 断言 | ✅ |
| 3.1 render_models_file | sync 脚本实现 + 隔离渲染测试（zhipuai 保留 / deepseek 替换 / apiKey env 引用） | ✅ |
| 3.2 主流程挂接 | `--- Syncing models.json ---` 日志 + 子 shell TARGET_PATH 切换 | ✅ |
| 4.1 全局 sync | 已执行，`~/.pi/agent/models.json` 渲染正确（deepseek apiKey=`$DEEPSEEK_API_KEY`，zhipuai 保留） | ✅ |
| 4.2 模型可见 | `pi --list-models`：deepseek-v4-flash（1.0M/384K）+ deepseek-v4-pro（内置） | ✅ |
| 4.3 通讯流 | `pi -p` 实跑正常响应（实施阶段）；api=openai-responses 驱动 Responses API | ✅ |
| 5.1/5.2 文档 | README + getting-started 更新 | ✅ |
| 6.1 validate | `openspec validate models-manifest-governance` → valid | ✅ |
| 6.2 git status | 仅 change 相关文件 | ✅ |

## 命令验证记录

- `bash -n scripts/sync-pi-agent.sh` → 无输出（语法 OK）
- `openspec validate models-manifest-governance` → valid
- `pi --list-models | grep deepseek` → 两个模型可见
- 隔离渲染测试：zhipuai apiKey 保留 / deepseek apiKey 变为 `$DEEPSEEK_API_KEY` / thinkingLevelMap null 正确

## 已知缺口

- 无 CRITICAL；验证期间发现的 1 个 WARNING（README 缺 OpenSpec spec 链接）已在归档前修复
- 2 个 SUGGESTION 记录待后续（非阻塞）：README bullet 模板已顺手对齐；apiKey env-only 自动化强制（design D3 有意取舍，超出本次范围）

## 结论

spec 全部覆盖、tasks 全部完成、实现与 design 决策一致。可归档。
