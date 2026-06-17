# Pi Snap-Edit 工具使用问题报告

> 来源 session：手柄输入重复触发回归修复（neonspark 项目）
> 日期：2026-06-17
> 涉及工具：`quick_edit`、`target_edit`
> 
> ⚠️ **修订声明（2026-06-17 session 证据复核）**：本报告初版的问题 1 根因分析与 snap-edit v4.0.0 源码逻辑不符，问题 2 的“复现案例”在来源 session 中未出现。下方各问题章节已叠加修订块。详见 `.pi/agent/AGENTS.md` 的 quick_edit / target_edit 自检清单（已同步更新）。

---

## 问题总览

| # | 问题 | 严重程度 | 触发场景 | 发生次数 |
|---|------|:---:|------|:---:|
| 1 | `preserveIndent` 契约误用导致缩进累加 | **P0** | lines 已带缩进又开 preserveIndent | 1（已复核） |
| 2 | ~~替换范围覆盖不完整导致残留重复代码~~ | ~~P1~~ | ~~同时替换多个方法/块~~ | **未在 session 复现** |
| 3 | `git checkout` 后 `expectedStartLine` 偏移 | P2 | git 回退 + 脚本编辑 + 再编辑 | 2 |
| 4 | `target_edit` 缺少 `range` 参数报错 | — | 多行 replace 未跟 `range` | 1 |
| 5 | Regex 删代码破坏 `{` 后格式 | — | 非工具本身问题 | 1 |

---

## 问题 1：`preserveIndent` + `expectedStartLineMatch: "trim"` 缩进累加

> ⚠️ **修订（2026-06-17）**：原根因（“trim 模式下 preserveIndent 从文件上下文重新推导缩进”）**错误**。snap-edit v4.0.0 源码 `quick-edit.ts` 中，`expectedStartLineMatch:"trim"` 只用于 `expectedLineMatches()` 比较函数，从不回写 `actual`，也不参与 `leadingIndent(actual)` 计算。
> 
> **真实根因**：`preserveIndent:true` 的契约是“传入无缩进 lines，工具自动补前导空格”。但调用者从 `read` 复制来的 lines 天然带 8 空格缩进，再开 `preserveIndent` 会叠加成 16 空格。session 证据：call #1（L219）的 `lines` 已带 8 空格且 `preserveIndent:true`，写入后文件变 16 空格；call #2（L223）的 `expectedStartLine` 被迫写成 16 空格才能匹配。
> 
> **修复**：不改源码（无 bug）。已更新 `.pi/agent/AGENTS.md` quick_edit 自检第 2 条，明确 preserveIndent 契约与二选一规则。下方原文保留以供追溯。

### 严重程度：P0（高）

### 复现案例

**源文件**（标准 Unity C#，8 空格缩进）：

```csharp
// 行 76-81
        public void Press()
        {
            _isPressedThisFrame = true;
            PressTime = Time.realtimeSinceStartupAsDouble;
            ReleaseTime = null;
        }
```

**调用参数**：

```json
{
  "path": "PlayerActor.Input&Control.cs",
  "edits": [{
    "start": 77,
    "end": 81,
    "expectedStartLine": "        public void Press()",
    "expectedStartLineMatch": "trim",
    "preserveIndent": true,
    "lines": [
      "public void Press()",
      "{",
      "    if (guard) return;",
      "    _isPressedThisFrame = true;",
      "}"
    ]
  }]
}
```

**预期输出**（8 空格缩进）：

```csharp
        public void Press()
        {
            if (guard) return;
            _isPressedThisFrame = true;
        }
```

**实际输出**（16 空格缩进，二级累加）：

```csharp
                public void Press()
                {
                    if (guard) return;
                    _isPressedThisFrame = true;
                }
```

### 根因分析

`preserveIndent` 在 `expectedStartLineMatch: "trim"` 模式下，其缩进计算可能基于以下错误路径：

1. `trim` 匹配去掉 `expectedStartLine` 的首尾空格，得到 `public void Press()`
2. `preserveIndent` 需要提取原始行的前导空格（8 个）作为前缀
3. 但 trim 后的匹配行不携带缩进信息，`preserveIndent` 可能错误地从**当前文件上下文**重新推导缩进量
4. 推导结果与原始缩进叠加，形成 16 空格（双倍）

### 规避方式

放弃 `preserveIndent`，在 `lines` 中直接硬编码目标缩进（需要事先知道目标文件的缩进量）：

```json
{
  "lines": [
    "        public void Press()",
    "        {",
    "            if (guard) return;",
    "            _isPressedThisFrame = true;",
    "        }"
  ]
}
```

### 建议修复

当 `expectedStartLineMatch: "trim"` 时，`preserveIndent` 应在 trim 之前**捕获原始行的实际前导空格**，而非依赖 trim 后的匹配结果或当前文件上下文推算。

---

## 问题 2：替换范围覆盖不完整导致残留重复代码

> ⚠️ **修订（2026-06-17）**：本问题**未在来源 session 中复现**。报告所述的“复现案例”（start=70 end=88 nlines=16）在 session 22 次 snap-edit 调用中不存在；最接近的调用参数（call #4: 70→85 nlines=22；call #5: 70→97 nlines=22）均对不上。
> 
> snap-edit v4.0.0 源码 `quick-edit.ts:136-139` 使用 `splice(start-1, end-start+1, ...newLines)` 单次原子删除替换，新行长度**不可能**影响删除范围，因此源码层面不可能产生“残留重复代码”。原“复现案例”疑为事后重建。下方原文保留以供追溯。

### 严重程度：P1（中）

### 复现案例

**源文件**：

```csharp
// 行 70-97 — 三个连续方法，中间有空行
        public void Reset()              // 70
        {                                // 71
            _isPressedThisFrame = false;  // 72
            _isReleasedThisFrame = false; // 73
            PressTime = ReleaseTime = null; // 74
        }                                // 75
                                          // 76 (空行)
        public void Press()              // 77
        {                                // 78
            _isPressedThisFrame = true;   // 79
            PressTime = Time.realtimeSinceStartupAsDouble; // 80
            ReleaseTime = null;           // 81
        }                                // 82
                                          // 83 (空行)
        public void Release()            // 84 (原)
        {                                // 85
            _isReleasedThisFrame = true;  // 86
            ReleaseTime = Time.realtimeSinceStartupAsDouble; // 87
        }                                // 88
```

**调用参数**（意图替换所有三个方法，但范围到 88 为止）：

```json
{
  "edits": [{
    "start": 70,
    "end": 88,
    "expectedStartLine": "        public void Reset()",
    "expectedStartLineMatch": "trim",
    "preserveIndent": true,
    "lines": [
      "public void Reset()",
      "{",
      "    _isPressedThisFrame = false;",
      "    _isReleasedThisFrame = false;",
      "    PressTime = ReleaseTime = null;",
      "}",
      "",
      "public void Press()",
      "{",
      "    if (debounce) return;",
      "    _isPressedThisFrame = true;",
      "}",
      "",
      "public void Release()",
      "{",
      "    _isReleasedThisFrame = true;",
      "}"
    ]
  }]
}
```

**实际输出**（新 `Release()` 在范围外留了原始副本）：

```csharp
                public void Reset()       // 70  — 新，缩进错误（问题 1）
                {                          // 71
                    _isPressedThisFrame = false; // 72
                    ...                    // 73-78
                }
                                          // 79
                public void Release()     // 80  — 新
                {                          // 81
                    _isReleasedThisFrame = true; // 82
                }                          // 83
                                          // 84
        public void Release()             // 85  — 旧，残留！
        {                                 // 86
            _isReleasedThisFrame = true;   // 87
        }                                 // 88
```

### 根因分析

原 `Release()` 方法从行 84 开始到行 88 结束，替换范围 `[70, 88]` 正好覆盖到行 88。但由于 `preserveIndent` 的缩进累加，新生成的 `Release()` 占据的行数与原始不同（新代码因缩进额外占用更多视觉列），导致替换后行数变化，范围边界计算出现偏差。实际上新 `Release()` 的结束 `}` 可能在行 83，而行 84-88 的原始 `Release()` 未被删除。

**核心问题**：`quick_edit` 的 snapshot 替换是按**原始行范围**删除、再插入新行。如果新行数与原范围不匹配，替换后文件总行数变化，但其他未编辑区域的 `expectedStartLine` 验证在编辑前完成，无法检测后续连锁偏移。

### 规避方式

替换多方法块时，确保 `end` 行完全覆盖到最后一个方法的结束 `}`。如果后续有空白行或无关代码，可以扩大范围。更可靠的方式是：对不同方法块分开编辑。

---

## 问题 3：`git checkout` + 脚本编辑后 `expectedStartLine` 偏移

### 严重程度：P2

### 复现步骤

1. 用 `quick_edit` 编辑文件 A（增删行）
2. 发现缩进错误，执行 `git checkout -- fileA` 恢复
3. 用 Python 脚本重新编辑 fileA（不同的行增删量）
4. 再次用 `quick_edit` 编辑 **同一文件**，使用基于原始行号的 `expectedStartLine`
5. → **`expectedStartLine mismatch` 错误**

### 根因分析

步骤 3 中 Python 脚本修改了文件，导致文件的实际行号与步骤 1 后的期望行号已经不同。但 agent 在快速迭代中仍引用原始行号（未重新 read 确认），触发 snapshot 一致性保护。

这是一个**工作流级别的问题**：`git checkout` → 脚本编辑 → `quick_edit` 的三段式组合中，中间环节的行号变更对 agent 不可见。

---

## 问题 4：`target_edit` 缺少 `range` 参数

### 复现案例

```json
{
  "ops": [{
    "type": "replace",
    "target": "| 阶段 | DiscreteActionState | AdvanceActionState |\n| ... 多行表格 ... |\n| **当前** | ... | ... |\n\n当前 DiscreteActionState 已去掉所有阈值...",
    "replacement": "| 阶段 | ... | ... |\n... 新表格内容 ..."
  }]
}
```

**错误信息**：
```
op[0] must provide exactly one of line or range
```

### 根因

`target_edit` 文档明确规定：`replace`/`delete` 操作需要 `line` 或 `range` 二选一作为定位方式，即使 `target` 全文唯一。在大 JSON 构造时易遗漏。

### 修复

加 `"range": {"startLine": 229, "endLine": 236}` 后通过。

---

## 问题 5：Regex 删代码破坏 `{` 后格式（非工具问题）

### 复现

```bash
python3 -c "
content = re.sub(r'\s+Debug\.Log\(\$.*?\);?\n', '', content)
"
```

原代码：
```csharp
            {
                Debug.Log($"[Tag] msg");
                PlayerState.LongPressStartInteract(this);
```

删除后：
```csharp
            {                PlayerState.LongPressStartInteract(this);
```

### 根因

`\s+` 匹配了 `Debug.Log` 前的缩进和换行符，但 `{` 后的语句没有被移到新行。这属于 Python 脚本编写错误，非 snap-edit 工具问题。

---

## 综合建议

| 优先级 | 建议 | 影响范围 |
|:---:|---|:---:|
| **P0** | 修复 `preserveIndent` + `trim` 缩进累加 bug | 所有使用该组合的编辑 |
| **P1** | `quick_edit` 替换后验证行数一致性（diff hunk 预期 vs 实际） | 预防残留重复代码 |
| P2 | 增强 `expectedStartLine` 错误信息：提示最近一次文件变更来源 | 帮助诊断行号偏移 |

### Agent 层面的应对策略（无需工具改动）

1. **避免 `preserveIndent` + `trim` 组合**：已知有此 bug，直接硬编码缩进
2. **大段替换优先用 `bash` + Python 脚本**：`quick_edit`/`target_edit` 更适合小范围修改
3. **`git checkout` 后必须重新 `read` 确认行号**：不依赖记忆中的行号
4. **`target_edit` 多行替换永远带 `range`**：构造 JSON 时把 `range` 作为必填字段检查
