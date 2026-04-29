# Design

## Context

当 `planner-toggle.ts` 同时存在于 `.pi/extensions/`（项目本地）和 `~/.pi/agent/extensions/`（全局同步）时，Pi 自动发现机制会同时加载两者，各自注册 `Ctrl+Alt+P` 快捷键、`/planner` 命令和事件处理器，产生冲突警告。

两种存在都有合理需求：项目本地用于开发，全局用于其他项目。解决方案不能是"排除同步"，而是让扩展自身具备运行时去重能力。

## Goals / Non-Goals

**Goals:**
- 消除 `planner-toggle.ts` 被重复加载时的快捷键冲突警告
- 保持全局同步机制不变（其他项目继续使用）
- 撤回 `a0ed55e` 中不对的排他逻辑

**Non-Goals:**
- Pi 核心层的扩展加载去重
- 为其他扩展添加通用去重机制
- 扩展加载顺序的调控

## Decisions

### D1: 去重机制 — `globalThis` 标记

**理由:** `globalThis` 在所有 ECMAScript 模块和 CommonJS 模块间共享同一对象。在同一进程内，先加载的副本设置标记，后加载的副本检测到标记后直接返回空函数，跳过所有注册。

```typescript
const GLOBAL_KEY = "__pi_ext_planner_toggle_loaded";

export default function (pi: ExtensionAPI): void {
  if ((globalThis as any)[GLOBAL_KEY]) return;
  (globalThis as any)[GLOBAL_KEY] = true;
  // ... existing registration code
}
```

**为何不是其他方案:**
- 文件路径检测: 扩展难以确定自己的绝对路径（jiti 加载上下文）
- Pi 核心去重: 超出当前 change 范围，且需修改 Pi 源码
- 排除同步: 破坏其他项目对扩展的可用性
- Manifest 标记: 需要 Pi 核心支持，不存在此 API

### D2: 标记变量命名

**理由:** 采用全局唯一的字符串键 `"__pi_ext_planner_toggle_loaded"`，以 `__pi_ext_` 前缀命名空间，避免与其他扩展或代码的全局变量冲突。

### D3: 撤回策略 — `git revert`

**理由:** 撤回 `a0ed55e` 中将对 `scripts/sync-pi-agent.sh` 的修改（EXTENSIONS_EXCLUDE 和 post-sync 清理），恢复 `planner-toggle.ts` 的正常全局同步。使用 `git revert` 保留审计轨迹。

## Risks / Migration

| 风险 | 影响 | 缓解 |
|------|------|------|
| 标记命名字符串拼写错误 | 去重不生效 | 单次拼写，review 即可避免 |
| globalThis 在极旧 Node.js 版本不可用 | 运行时异常 | Pi 要求 Node.js 18+，`globalThis` 已标准支持 |
| 其他扩展有相同问题但不自知 | 同样有冲突告警 | 本方案可作为模板推广；但本次不覆盖 |
