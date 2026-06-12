# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认每个 capability spec 的实现范围与边界 — `specs/wikilink-batch-replace/spec.md` 定义 4 个 requirement，全部为新增
- [x] 1.2 确认依赖前置条件与外部协作项 — 单文件 extension，依赖 `@earendil-works/pi-coding-agent` + `@sinclair/typebox`，无外部协作

## 2. 核心实现任务

- [x] 2.1 创建 `.pi/extensions/wikilink-batch-replace.ts`，注册 `wikilink_batch_replace` tool
  - Spec 覆盖: `batch-replace-with-table-escape`, `direct-file-modification`, `single-file-extension`
  - 实现路径: `design.md` D1-D6
  - 验证: `pi -e .pi/extensions/wikilink-batch-replace.ts` 无启动错误，tool 出现在工具列表

- [x] 2.2 实现核心替换逻辑：逐行扫描 + 表格行检测 + 正则匹配 + 映射查找 + displayTemplate 渲染
  - Spec 覆盖: `batch-replace-with-table-escape` (scenarios: mixed-content, multiple-patterns-sequential, skip-existing, skip-unmapped), `display-template-support`
  - 实现路径: `design.md` D4 (仅表格行转义), D6 (`[[]]` 内部检测算法)
  - 验证: 用 NA2 真实文档（`.scratch/` 副本）做端到端测试，对比 `tools/table_wikilink_fixer.py --check` 结果为零违规

- [x] 2.3 实现文件读写与统计返回
  - Spec 覆盖: `direct-file-modification`
  - 实现路径: `design.md` D5 (统计信息格式)
  - 验证: tool call 返回值包含替换/跳过/未命中计数，文件确实被修改

- [x] 2.4 实现 multi-pattern 顺序处理
  - Spec 覆盖: `batch-replace-with-table-escape` scenario `multiple-patterns-sequential`
  - 验证: 传入 2 个 pattern，验证第二个 pattern 操作在第一个 pattern 结果之上

## 3. 收敛与验证准备

- [x] 3.1 用 `pi -e` 验证 extension 加载 + tool 注册 + 基本功能
- [x] 3.2 用 NA2 真实文档（1003 行，293 处替换）做端到端验证
- [x] 3.3 用 `table_wikilink_fixer.py --check` 交叉验证零违规

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 verification.md
- [x] 4.2 基于 verification.md 结论生成或更新 writeback.md
- [x] 4.3 执行 writeback.md 中定义的回写目标（`CONTEXT.md` 索引更新 + `.pi/capabilities.yaml` 新增 extension 条目）
