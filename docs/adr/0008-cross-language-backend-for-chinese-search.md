# Cross-Language Backend for Chinese Text Search

Obsidian 搜索扩展使用 jieba（Python 持久进程）做中文分词和 fff-node（SIMD Aho-Corasick）做模式匹配，替代了 `Intl.Segmenter`（将中文复合词拆成单字）和 `rg` 子进程（1-3 秒延迟）。引入了跨语言运行时依赖（Python + jieba + fff-node），但这是获得正确中文分词的唯一可行方案——`Intl.Segmenter` 的分词质量在中文场景下不可接受。
