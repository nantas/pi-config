# Markdown Output Quality

## Wiki Link in Tables（Markdown 表格内的 Obsidian Wiki Link）

当在 Markdown 表格单元格内写入 `[[页面名|显示文本]]` 时，`|` 会被标准 Markdown 解析器误判为表格列分隔符，导致渲染错乱和链接失效。

**强制规则：** 表格中的 Wiki 链接必须将内部的 `|` 转义为 `\|`。

**正确写法：**
```markdown
| [[str-01-competitive-games\|Competitive Games]] | Game Structure |
```

**注意：**
- 仅表格内的 Wiki 链接需要转义。列表项（如 `- 参见 — [[xxx|yyy]]`）不受影响。
- 子章节 index.md 如使用列表而非表格时无需处理。

## 非表格场景下的 Wiki Link

表格外的 `[[页面名|显示文本]]` 无需转义，`|` 在此处是合法的 Obsidian Wiki 链接语法。
