# Specification Delta

## Capability 对齐（已确认）

- Capability: `install-from-pi-config-overwrite`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: 修改 Phase 4 目录覆盖安装逻辑，将 `cp -R` 合并拷贝改为先删除后拷贝

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: directory-overwrite-shall-remove-target-first
当用户确认覆盖安装一个已存在的目录型 skill 或 extension 时，install-from-pi-config SHALL 先递归删除目标目录，再从源端完整拷贝。这确保安装结果与源仓库目录内容完全一致，不残留源端已删除的文件。

#### Scenario: overwrite-existing-skill-directory
- **WHEN** 用户安装一个已存在于目标 `.pi/skills/<name>/` 的 skill 目录，并确认覆盖
- **THEN** 系统先执行 `rm -rf <target>` 删除目标目录，再执行 `cp -R <source> <target>` 从源端拷贝

#### Scenario: overwrite-existing-extension-directory
- **WHEN** 用户安装一个已存在于目标 `.pi/extensions/<name>/` 的 extension 目录，并确认覆盖
- **THEN** 系统先执行 `rm -rf <target>` 删除目标目录，再执行 `cp -R <source> <target>` 从源端拷贝

#### Scenario: fresh-install-no-target-cleanup
- **WHEN** 用户安装一个目标目录不存在的 skill 或 extension
- **THEN** 系统仅执行 `mkdir -p` 和 `cp -R`，不执行 `rm -rf`（行为不变）

#### Scenario: single-file-extension-unchanged
- **WHEN** 用户覆盖安装单文件扩展（`.ts`）
- **THEN** 系统使用 `cp` 直接覆盖文件（行为不变，不受本次修改影响）
