# Tasks

> 实现路径：`pkg-fork-dev` 工作流。所有代码改动落点 `repo://fusion-harness`（`/Users/nantasmac/projects/forks/fusion-harness`）。本仓 pi-config 侧仅 `forks/manifest.yaml` 版本摘要同步。
>
> 任务编号对应 spec 的 Requirement：T2.1→Worker Output Confinement，T2.2→Worker Prompt Override Contract，T2.3→Output Boundary Statement，T2.4→Fusion Report Publish Manifest，T2.5→Non-Regression。

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认五个 MODIFIED Requirement 的实现落点全部在 `repo://fusion-harness` 的三个文件内（`fusion-harness.ts` + `USER_PROMPT_FUSION_WORKER.md` + `USER_PROMPT_FUSION_MERGE.md`），无第四处需改
  - 验证：`grep -rn "embed your identity\|writes any canonical" repo://fusion-harness/extensions/fusion-harness/` 仅命中待改的旧措辞
- [x] 1.2 确认 fork 本地克隆可写且 `pi install -l file:<path>` 测试链路通（Phase D 本地测试前置）
- [x] 1.3 备份现有 `fusion-harness-aYwYMb` run 作为 verification 的 before 对照（已存于 `repo://my-wiki .scratch/fusion-harness/fusion-harness-aYwYMb/` + 两棵污染树）

## 2. 核心实现任务

### T2.1 workerPrompt() 签名扩展（覆盖 Requirement: Fusion Worker Output Confinement 的「Worker passes artifacts dir」scenario）

- [x] 2.1.1 修改 `repo://fusion-harness extensions/fusion-harness/fusion-harness.ts` 的 `workerPrompt()` 函数（现 line 762），签名新增 `artifactsDir: string` 参数
  - 验证：`fill("USER_PROMPT_FUSION_WORKER.md", { ..., ARTIFACTS_DIR: artifactsDir })` 插值正确
- [x] 2.1.2 修改两处 Stage 1 spawn（ARCHITECT line ~1850 / BUILDER line ~1862）传入当前 run 的 `artifactsDir`
  - 验证：worker 运行时 prompt 内 `{{ARTIFACTS_DIR}}` 已被实际 run 目录替换（无裸占位符残留）

### T2.2 重写 USER_PROMPT_FUSION_WORKER.md（覆盖 Requirement: Fusion Worker Prompt Override Contract + Output Confinement）

- [x] 2.2.1 删除旧措辞：「embed your identity in EVERY path ... report-{{ROLE}}-{{MODEL}}.md」整段（D2，彻底删，不留变体）
- [x] 2.2.2 删除踢皮球暗示：「The fusion agent merges afterwards and writes any canonical, exactly-named deliverable the request asks for」整句
- [x] 2.2.3 新增 B 命令式优先级声明段：fusion mode 覆盖 skill/workflow 的发布路径指令，发布目标被重定位而非删除，工作流照跑
- [x] 2.2.4 新增 A 声明式路径重写规则段：`{{ARTIFACTS_DIR}}/{{ROLE}}/` 前缀重写，配两个例子（嵌套目录 `synthesis/digest/X/` + 裸文件 `path/foo.md`），声明保留内部结构/filename/slug
- [x] 2.2.5 新增 slug 净化段：禁止 identity 入 filename 或 slug，只允许进分区目录
- [x] 2.2.6 新增分区目录模型说明：文本答案写 `{{ARTIFACTS_DIR}}/{{ROLE}}.md`（run 根），工作流产物树写 `{{ARTIFACTS_DIR}}/{{ROLE}}/`（分区子树）—— 明确区分两类写，防 R3 误读（design R3）
  - 验证：渲染后 prompt 同时含两类写位置说明，且路径重写规则含 ≥2 例子

### T2.3 USER_PROMPT_FUSION_MERGE.md 输出边界对齐（覆盖 Requirement: Fusion Output Boundary Statement）

- [x] 2.3.1 fuser prompt 顶部新增与 worker 一致的「fusion 全流程不 publish」声明段（D4，措辞两端一致）
- [x] 2.3.2 保留现有「Write ALL artifacts under {{ARTIFACTS_DIR}}. NEVER use /tmp or any other directory」强化句
  - 验证：worker + fuser 两端 prompt 的边界声明文案一致（diff 对比）

### T2.4 fused report publish manifest（覆盖 Requirement: Fusion Report Contains Publish Manifest）

- [x] 2.4.1 `USER_PROMPT_FUSION_MERGE.md` 的 OUTPUT CONTRACT 追加第 3 项：Publish Manifest section（D5，Markdown section 非 schema）
  - 内容：枚举每个 worker 分区的 repo 相对路径产出 + promote 建议（引用 consensus/divergence）
- [x] 2.4.2 OUTPUT CONTRACT 现有 2 项（Fused answer / Consensus & divergence）顺序保持，manifest 作为新增第 3 项
  - 验证：fuser 渲染后 prompt 的 OUTPUT CONTRACT 含 3 项，第 3 项明确要求「inventory both trees + promote recommendation」

### T2.5 非回归确认（覆盖 Requirement: Non-Regression）

- [ ] 2.5.1 跑一次纯分析类 `/fusion`（如「对比 sqlite vs postgres for X」），确认 worker 产出 text answer + fuser 产 fused.md，无分区目录产物树，publish manifest section 为空/省略
  - 验证：`.scratch/fusion-harness/<run>/` 内无 `architect/`、`builder/` 子目录；`fused.md` 的 manifest section 缺省或标注「no worker produced a tree」

## 3. 收敛与验证准备

- [ ] 3.1 准备 verification 的 before/after 对照：
  - before = `fusion-harness-aYwYMb` run（repo canonical 被两棵 namespaced 树污染）
  - after = 重跑同 game-wiki-ingest prompt（预期 repo canonical 干净 + scratch 镜像完整）
- [ ] 3.2 标记 R1（worker override 可行性）为 verification 关键判定点：若 after 仍污染，本 change 不达标，需开后续 change 做工具层

## 4. 验证与回写收敛

- [ ] 4.1 基于真实实现结果生成或更新 verification.md：
  - spec-to-implementation 映射（五个 Requirement → 三处文件改动）
  - task-to-evidence 映射（T2.1-T2.5 → 具体 git diff / run 产物）
  - R1 override 可行性的实测结论（关键）
- [ ] 4.2 基于 verification.md 结论生成或更新 writeback.md：回写目标 = `repo://fusion-harness` 三处文件 + pi-config `forks/manifest.yaml` 版本摘要
- [ ] 4.3 执行 writeback：fork 仓库 commit + push（`git:` 源更新），pi-config `forks/manifest.yaml` 追加版本变更摘要（沿用 v0.x.y 序列）；记录可审计证据（commit hash、时间、执行人、结果）

---

**完成标准**：T2.1-T2.5 全绿，且 verification 中 R1 实测结论为「override 成功」（repo canonical 干净 + scratch 镜像完整）。若 R1 失败，暂停本 change，开 `fusion-write-path-interception` 后续 change，不在本 change 范围内膨胀。
