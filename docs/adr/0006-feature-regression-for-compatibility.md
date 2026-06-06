# Feature Regression for Dependency Compatibility

用 `@johnnywu/pi-subagents@1.5.0` 替换了 `pi-subagents@0.24.0`，接受丢失 chain/parallel/async 执行和内置 agents/skills/prompts。原因是旧版本 API 与当前 pi-core 不兼容，且 agent 定义已从 `settings.json` overrides 迁移到 `.pi/agents/*.md` frontmatter 文件，无法回退。
