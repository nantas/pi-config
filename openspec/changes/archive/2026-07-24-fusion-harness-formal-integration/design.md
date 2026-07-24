# Design

## Context

fusion-harness 在 `fusion-harness-trial` 中已验证价值（sovereign 模型栈 + gate-first loop 有效）。本次 change 将其从 ad-hoc trial 状态转为 pi-config 正式包。

上游架构：一个 TypeScript extension 文件（`fusion-harness.ts`）+ 11 个 prompt 模板（`SYSTEM_PROMPT_*.md`、`USER_PROMPT_*.md`），通过 spawn 子 pi 进程驱动多 agent 协作。三条命令：`/opinion`（并行多视角）、`/fusion`（智能合并 + consensus/divergence/discard）、`/auto-validate`（验证前置自循环）。

## Goals / Non-Goals

**Goals:**
1. Fork `disler/fusion-harness` → `nantas/fusion-harness`，做 4 项修改
2. 注册到 pi-config（manifest.yaml + settings.json + 全局冲突处理）
3. 本地测试验证三条命令在新配置下可用
4. 提交、打 tag、推送 fork，切换到 git URL 生产模式

**Non-Goals:**
- auto-validate gate 语义层重设计（LLM-as-judge）——独立 change
- my-wiki governance 增强——独立 change
- agent 角色文件抽象
- 自定 system prompt 文件

## Decisions

### Decision 1: ARTIFACT_ROOT → `.scratch/fusion-harness/`

**选择**：将 `ARTIFACT_ROOT` 从 `/tmp` 改为项目工作目录下的 `.scratch/fusion-harness/`。

**理由**：`/tmp` 不持久（macOS 定期清理），而 fusion runs 的中间产物（agent outputs、gate scripts、gate run logs）在调试时有回查价值。`.scratch/` 是 pi-config 项目已有的临时数据约定，gitignore 覆盖。

**影响**：`sessionsRootFor()` 也使用 `ARTIFACT_ROOT`，session 数据会随迁。代码改动 1 行（L1659 常量定义）。

### Decision 2: 子 agent context 继承

**选择**：去掉 `--no-skills` 和 `--no-context-files`，仅保留 `--no-extensions`。

**理由**：
- `--no-extensions`：必须保留，防止 fusion-harness 递归 spawn。
- `--no-skills`：去掉后子 agent 加载 cwd 的 skills（如 my-wiki 的 lecture-ingest），共享项目契约体系。trial 期间通过 custom system prompt 手动注入 skill 引用是绕路——原本就该继承。
- `--no-context-files`：去掉后子 agent 加载 CONTEXT.md，有助于 domain terminology 一致性。
- 视角收敛风险：trial 证据表明共享 skill 契约不会消除模型原生智能差异（architect 和 builder 在相同契约下仍产出不同视角）。

**影响**：代码改动在 `runChild()` 函数的 args 构建段，删除 `"--no-skills"` 和 `"--no-context-files"` 两行。

### Decision 3: FUSION prompt 路径锁定

**选择**：修改 `USER_PROMPT_FUSION_MERGE.md`，将 "Write throwaway artifacts under /tmp unless the instruction says otherwise" 改为明确锁定 `{{ARTIFACTS_DIR}}`。

**理由**：trial 中 FUSION agent 把产出写到 `/tmp` 而非指令指定路径——根因是 `/tmp` 写死在 prompt 里，与 GROUNDING 段的 `{{ARTIFACTS_DIR}}` 矛盾。Agent 更容易被前面的明确指令引导。

**影响**：1 行 prompt 修改。

### Decision 4: settings.json fallback

**选择**：`architectModel()` 和 `builderModel()` 增加 settings.json 读取：`getFlag()` 优先 → settings.json `fusionHarness` 块 fallback → 上游硬编码默认值最后。

**实现方式**：导入 pi 的 `getSettingsPath()`，读取 settings.json 的 `fusionHarness` 块。不在 fork 内 hardcode sovereign 模型对——模型对由 pi-config 的 settings.json 维护。

**影响**：约 30-40 行代码新增（settings 读取 + 缓存 + fallback 链）。

### Decision 5: 模型默认值不固化

**选择**：不去掉或改上游的 `DEFAULT_ARCHITECT` / `DEFAULT_BUILDER` 常量。

**理由**：settings.json 已提供 fallback 链。如果 settings.json 没配且没传 flag，落到上游默认值是合理的（至少不会静默失败）。未来 settings.json 配置固化了 sovereign 模型对后，正常使用不会走这个路径。

## Risks / Migration

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| 子 agent 加载 skills 导致视角收敛 | 低 | trial 证据支持不收敛；若发现同质化，可后续添加 skill 排除机制 |
| 递归 extension 加载 | 低 | `--no-extensions` 保留，架构上已防住 |
| settings.json fallback 读取失败（路径不存在/权限） | 低 | fallback 链：settings → upstream 默认值，任何环节失败不阻塞启动 |
| 全局包冲突（`~/.pi/agent/settings.json` 已有同名包） | 中 | 按 pkg-fork-dev Phase D1a 处理：检测→移除→记录→恢复 |
| upstream 更新后 merge 冲突 | 中 | 改动集中在 3 个位置（常量 + args + 1 prompt），冲突面小。Phase F 逐次处理 |
| `/reload` 不生效（jiti 缓存） | 低 | 重启 Pi 作为 fallback |
