# ask_user Tool Guidelines

## 核心规则：prompt 必须自包含

`ask_user` 的交互 UI 只渲染每个 question 的 `prompt` 文本和 `options`（label / description / preview）。
用户**看不到** Agent 的内部上下文。所有决策所需信息 MUST 显式写在 `prompt` 或 `options` 字段中。

### 反模式（禁止）

❌ **prompt 空引用** — prompt 引用内部上下文中的内容但未写入：

```json
{
  "prompt": "确认创建 PR？以下是建议的标题和描述：",
  "options": [{"label": "确认", "value": "yes"}, {"label": "修改", "value": "edit"}]
}
```

用户只看到"以下是建议的标题和描述："，实际标题和描述不存在于任何字段中。

❌ **option 信息缺失** — option 只有名称，关键内容留在内部上下文：

```json
{
  "prompt": "选择架构方案",
  "options": [
    {"label": "方案 A：微服务", "value": "a"},
    {"label": "方案 B：单体", "value": "b"}
  ]
}
```

方案的权衡、细节、影响范围等信息缺失，用户无法做出有意义的比较。

### 正确做法

✅ **将完整决策信息内联到 prompt 中**（适合内容较短的场景）：

```json
{
  "prompt": "确认创建以下 PR？\n\n标题: feat: dirty-workspace 全局开关\n\n描述:\n1. dirty-workspace 全局开关：允许用户在脏工作区中运行 agent\n2. trellis-brainstorm 上下文编译：优化 brainstorm skill 的上下文传递\n\n请确认或选择修改。",
  "options": [
    {"label": "确认创建", "value": "yes"},
    {"label": "修改后创建", "value": "edit"},
    {"label": "取消", "value": "cancel"}
  ]
}
```

✅ **将详情放入 option 的 description 或 preview 字段**（适合多选项比较场景）：

```json
{
  "prompt": "选择架构方案",
  "type": "preview",
  "options": [
    {
      "label": "方案 A：微服务",
      "value": "a",
      "description": "独立部署、弹性伸缩",
      "preview": "优点：独立部署、弹性伸缩、技术栈灵活\n缺点：运维复杂度高、网络延迟、分布式事务\n影响范围：需新增 3 个服务、CI/CD 改造"
    },
    {
      "label": "方案 B：单体",
      "value": "b",
      "description": "简单部署、开发效率高",
      "preview": "优点：开发调试简单、部署快、事务一致\n缺点：扩展性受限、耦合度高\n影响范围：重构核心模块、无基础设施变更"
    }
  ]
}
```

### 检查清单

调用 `ask_user` 前，对每个 question 检查：

1. 用户能否**仅凭 prompt + options 做出决策**？
2. prompt 中是否有**未定义的引用**（如"以下内容"、"上述方案"）？
3. 每个 option 是否包含足够信息让用户理解其含义和后果？

若有任何一项为否，必须补充信息后再调用。

## 触发条件

调用 `ask_user` 让用户确认决策、在内部生成的内容间选择、或对 Agent 持有的数据做判断时，必须遵循本文件规则。
