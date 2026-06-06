# Prompt-Based Mode Enforcement

Plan mode 通过系统 prompt 中的行为约束指令实现，而非工具白名单和 bash 正则过滤。所有工具保持可用，LLM 根据行为边界描述自行约束。选择这种方式是因为白名单方案在面对新工具和工具组合时极其脆弱，且需要持续维护过滤规则。
