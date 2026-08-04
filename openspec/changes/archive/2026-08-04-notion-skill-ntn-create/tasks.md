# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 对照 `specs/notion/spec.md` 锁定范围：`.pi/skills/notion/scripts/ntn_resolve.py`、`ntn-write`、新增 `ntn-create`、`SKILL.md`；不改 `capabilities.yaml` / batch / 未覆盖类型
- [x] 1.2 记录 `ntn-write` 内现有 `build_property_value` / `get_page_schema` / `update_properties` 签名与调用点，作为抽取对照基线

## 2. 共享 property 翻译

- [x] 2.1 将 `build_property_value` 迁入 `ntn_resolve.py`（类型覆盖与回退行为不变）— 覆盖 `shared-property-translation` / `shared-library`
- [x] 2.2 在共享模块增加 `load_set_arg(raw)`：内联 JSON 或 `@file` → dict；错误 stderr JSON + exit 1
- [x] 2.3 在共享模块增加 data_source schema 读取 helper（供 create 直接用；write 的 page→parent→schema 可一并迁入或薄封装）
- [x] 2.4 验证：`python3 -c "import ast; ast.parse(open('.pi/skills/notion/scripts/ntn_resolve.py').read())"`；`build_property_value` 对 title/select/checkbox 的最小自检（python -c 或脚本内 assert）

## 3. ntn-write 适配

- [x] 3.1 `ntn-write` 删除内联翻译实现，改为 import 共享函数；`--set` 走 `load_set_arg` — 覆盖 MODIFIED `ntn-write-props-and-content`
- [x] 3.2 验证：`ntn-write --help` 仍含 `--set`/`--safe-replace`；语法 `ast.parse` 通过；`--set` 路径无行为回归（至少静态确认调用共享函数）

## 4. ntn-create

- [x] 4.1 新增可执行脚本 `.pi/skills/notion/scripts/ntn-create`：resolve data_source → schema → translate `--set` → `POST v1/pages` — 覆盖 `ntn-create-row`
- [x] 4.2 输出 `{id, url, properties_set}`；缺 `--set` / 解析失败 / API 失败均 stderr JSON
- [x] 4.3 验证：`chmod +x`；`ast.parse`；`ntn-create --help` 含 `--set`；无 live 时用 mock/静态检查 parent payload 构造；有 probe ds 时 create 一条再 `ntn-write --set` 更新后标记 live 通过

## 5. SKILL.md 文档

- [x] 5.1 Scripts 节增加 `ntn-create`（内联 + `@file` 示例）— 覆盖 `skill-docs-create-and-multi-ds`
- [x] 5.2 Workflow Guide：多 datasource 提醒 + create/update 默认路径（create→`ntn-create`，update prop→`ntn-write --set`，未覆盖类型才 `ntn api`）
- [x] 5.3 Extending 节移除 `ntn-create` 候选；保留 safe-replace 既有指引
- [x] 5.4 验证：`grep -n "ntn-create" .pi/skills/notion/SKILL.md` 在 Scripts/Workflow 有命中；Extending 候选列表无 `ntn-create`

## 6. 收敛与验证准备

- [x] 6.1 汇总静态/可选 live 证据路径，供 verification 使用
- [x] 6.2 确认全局 sync **未**自动执行；在 verification/writeback 记录「待用户确认 sync」
- [x] 6.3 基于真实实现生成/更新 `verification.md` 与 `writeback.md`（实现阶段末尾，非本文件提前空写）
