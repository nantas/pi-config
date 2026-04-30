# tsconfig-setup — 项目 TypeScript 配置

## 概要

在项目根目录创建 `tsconfig.json`，配置 TypeScript 编译选项和 pi SDK 包类型引用路径，使 LSP/编辑器能正确分析 `.pi/extensions/`、`.pi/skills/`、`.pi/prompts/` 下的 TypeScript 源码。

## 验收标准

1. `tsconfig.json` 存在于项目根目录
2. 配置 `target: ES2022`、`module: NodeNext`、`strict: true`
3. 通过 `paths` 映射 4 个 pi SDK 包的类型声明：
   - `@mariozechner/pi-ai`
   - `@mariozechner/pi-coding-agent`
   - `@mariozechner/pi-tui`
   - `@mariozechner/pi-agent-core`
4. `include` 覆盖 `.pi/extensions/`、`.pi/skills/`、`.pi/prompts/`
5. `npx tsc --noEmit` 能成功解析配置（扩展代码中的类型错误为已有代码问题，不阻塞配置生效）

## 非目标

- 不修改任何扩展代码来修复类型错误
- 不添加 `package.json`
