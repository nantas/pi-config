# Prefer snap-edit over builtin edit

内置 `edit` 工具要求 `oldText` 精确匹配，在大段替换、批量多位置编辑、含特殊字符（模板字符串、SQL 占位符）的场景下 token 开销大且容易因微小不匹配而失败。安装 `pi-snap-edit` 全局扩展，在 session 启动时替换内置 `edit` 为 `quick_edit`（按行号定位）和 `target_edit`（按精确文本定位）。基准测试显示：批量编辑调用减少 67%，大段删除参数节省 79%，整体参数大小减少约 22%。代价是放弃全文本精确匹配模型，改为行号+行首守卫模型；同时 `substitute_edit` 被禁用。
