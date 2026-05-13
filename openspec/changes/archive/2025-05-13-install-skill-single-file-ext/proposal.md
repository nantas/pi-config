# Proposal

## 问题定义

### 问题 A：扩展源类型检测缺失

`install-from-pi-config` skill 的 Phase 4（File-Based Installation）假设所有扩展都是目录结构，使用 `cp -R "{{source}}/.pi/extensions/{{name}}/" "{{target}}/.pi/extensions/{{name}}/"` 安装。但仓库中存在单文件扩展（如 `trellis-analytics.ts`、`add-provider.ts`），源路径带末尾 `/` 时指向不存在的目录，导致安装失败。

根因：SKILL.md 的安装逻辑未区分文件扩展（`.ts` 单文件）和目录扩展（带 `package.json` 的文件夹）。

### 问题 B：单文件扩展的 npm 依赖未安装

即使单文件扩展复制成功，扩展中 `import` 引用的 npm 包（如 `@earendil-works/pi-ai`、`@sinclair/typebox`）也不会自动安装到目标仓库的 `.pi/npm/` 中。尝试在目标仓库启动 Pi 时，扩展因 `Cannot find module` 错误加载失败。

根因：Phase 5（npm Dependencies）仅处理 `has_package_json: true` 的目录扩展，单文件扩展没有 `package.json`，没有渠道声明或安装其 npm 依赖。

## 范围边界

- **In scope**:
  - 修改 SKILL.md Phase 4 的扩展安装逻辑，使其在安装时自动检测源是文件还是目录，选择正确的复制方式
  - 新增 Phase 5b（或扩展现有 Phase 5），检查单文件扩展中的 `import` 语句并安装缺失的 npm 包到目标仓库
- **Out of scope**:
  - 不修改 catalog schema（不加 `is_single_file` 字段）
  - 不修改 Phase 4b（settings-entry 安装）
  - 不修改 Phase 4 的 skill 安装部分（skill 目前全部是目录结构）
  - 不实现通用依赖树解析（仅处理扩展文件中可直接检测的 `import` 语句）

## Capabilities

### New Capabilities

- `install-skill-dep-resolution`: 在扩展安装后，扫描单文件 `.ts` 扩展的 `import` 语句，识别并安装缺失的 npm 包到目标仓库的 `.pi/npm/` 中

### Modified Capabilities

- `install-skill-single-file`: install-from-pi-config skill 的扩展安装阶段自动检测源类型（文件 vs 目录），支持单文件扩展的正确安装

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

- **低风险**: 仅修改 SKILL.md 文档的 bash 伪代码和文字描述；依赖安装依赖于 `grep` 扫描和 `npm install`，不会修改已有包
- **正向影响**:
  - 所有 catalog 中的单文件扩展（add-provider、trellis-analytics）可通过 `$install` 正确安装
  - 安装后扩展的 npm 依赖自动解决，目标仓库启动 Pi 时不再出现 `Cannot find module` 错误
- **无破坏性**: 目录扩展的安装行为不变；已有的 `.pi/npm/node_modules/` 不受影响

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：无外部标准页，修改目标为 `.pi/skills/install-from-pi-config/SKILL.md`，无外部回写目标
