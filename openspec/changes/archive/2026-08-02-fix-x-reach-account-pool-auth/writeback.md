# Writeback

## 目标

- **无页面 writeback**

## 理由

本 change 是对既有 `x-reach-skill` capability 的 spec/文档修正（R5/R9 MODIFIED + R10 ADDED），不新增能力域：

- `CONTEXT.md` OpenSpec 索引已在 `add-x-reach-skill` 归档时登记 `x-reach-skill` slug（「扩展」组），本 change 不新增 slug
- `.pi/capabilities.yaml` 的 `global.skills` 已含 `x-reach`，本 change 不改 manifest
- skill 文件修改（setup.md / grab-cookie.sh / SKILL.md / init.sh）是实现产物，非页面回写

## 执行时机

不适用。archive 阶段只需同步 delta spec 覆盖主 spec（task 4.3），无 CONTEXT.md 索引变更。

## 不做的事

- 不 edit CONTEXT.md（slug 已存在）
- 不 edit capabilities.yaml（skill 已注册）
- 不跨仓 writeback
