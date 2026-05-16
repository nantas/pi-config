# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 specs 覆盖已验证
  - ✅ ADDED: Context Event Message Injection → `context` handler 实现
  - ✅ ADDED: Repeat Injection Prevention → 消息结构检查去重
  - ✅ MODIFIED: Dollar Skill Token Expansion → 全量展开 + 保留原始文本
  - ✅ MODIFIED: Skill Content Format → `CustomMessage` + `display: false`
  - ✅ MODIFIED: Context Handler Single Registration → 顶层注册
  - ✅ REMOVED: Input Event Interception → `input` handler 已移除
- [x] 1.2 依赖项已确认：`context` 事件签名（`types.ts:605`）、`emitContext()` 接受修改后数组（`runner.ts:855-882`）、`convertToLlm()` 将 `role:"custom"` 转为 `role:"user"`（`messages.ts:136-142`）

## 2. 核心实现任务

- [x] 2.1 **移除 `input` 事件 transform 逻辑**
  - ✅ `handleInputTransform()` 已移除
  - ✅ `pi.on("input", ...)` 注册已移除
  - ✅ 保留 `DOLLAR_SKILL_REGEX`、`getSkills()`、`stripFrontmatter()` 供 `context` handler 复用
  - ✅ 验证: `input` handler 不再存在于扩展代码中

- [x] 2.2 **新增 `context` event handler**
  - ✅ `pi.on("context", ...)` 在顶层注册（不随 session_start 累积）
  - ✅ `handleContextInjection()` 实现:
    a. 尾部向前扫描找最后一条 `role === "user"` 消息（索引 i）
    b. 检查 `messages[i+1]` → 已有 skill 消息则跳过（去重）
    c. 全局正则匹配所有 `$skill-name` 标记
    d. 每个 skill 查找 → 读 SKILL.md → 构建 `<skill>` 块 → 生成独立 `CustomMessage`
    e. 新数组: `[...slice(0,i+1), ...skillMessages, ...slice(i+1)]`
    f. 返回 `{ messages: newMessages }`
  - ✅ 覆盖 spec scenarios：单 skill、多 skill、未知 skill、转义、重复调用防护

- [x] 2.3 **保留 `session_start` autocomplete 注册**
  - ✅ `pi.on("session_start", ...)` 中 autocomplete provider 注册未修改
  - ✅ `createAutocompleteProvider()` 未修改
  - ✅ `$` Tab 补全和 `/` skill filter 行为不变

- [x] 2.4 **保留扩展自 dedup 机制**
  - ✅ `__pi_ext_dollar_skill_invoke_loaded_session_<N>` + `SESSION_COUNTER` 逻辑未修改
  - ✅ `session_shutdown` handler 未修改

## 3. 收敛与验证准备

- [x] 3.1 扩展加载测试通过（`pi -e .pi/extensions/dollar-skill-invoke.ts` 无启动错误）
- [x] 3.2 **用户验证通过**：多 skill 场景（`$pkg-research` + `$gitnexus-cli`）— 两个 skill 都独立展开为 `<skill>` 块，原始 prompt 完整保留
- [x] 3.3 **用户验证通过**：未知 skill（`$nonexistent`）— 标记保留且无注入
- [x] 3.4 **用户验证通过**：转义（`\$escaped $valid`）— 转义保留、合法展开
- [x] 3.5 **用户验证通过**：`$` autocomplete Tab 补全正常工作
- [x] 3.6 验证证据框架已创建（见 `verification.md` 草稿）

## 4. 验证与回写收敛

- [x] 4.1 已生成 `verification.md`（spec-to-implementation 6 requirements 全覆盖 + task-to-evidence 15 tasks 全覆盖）
- [x] 4.2 已生成 `writeback.md`（目标 `openspec/specs/dollar-skill-invoke/spec.md`，字段映射含 Purpose/Requirements 更新）
- [x] 4.3 已执行写回目标：`openspec/specs/dollar-skill-invoke/spec.md` 已更新（新增 Context Event Message Injection / Repeat Injection Prevention，替换 Dollar Token Expansion / Handler Registration，移除 Input Event Interception）
