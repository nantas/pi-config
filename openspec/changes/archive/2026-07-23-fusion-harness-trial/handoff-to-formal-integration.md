# Handoff — fusion-harness-trial → 正式引入

> 本文档是 `fusion-harness-trial` change 归档前的交付物，为新 session（正式引入 fusion harness）提供完整上下文。
> 新 session 从本文档起步，无需重新调研 trial 过程。

---

## 一、Trial 结论速览

### 价值确认（有条件）

- ✅ **fusion 机制有效**：consensus/divergence/discard 真实捕获批判性视角差异（forget-loop 案例：architect 独有"盲区"视角被保留为"most substantive value-add"）
- ✅ **gate-first loop 机制有效**：baseline FAIL RED → 3 轮 → PASS，工作流成立
- ✅ **sovereign 栈可用**：deepseek + glm 全程无障碍，R1 provider 兼容性通过
- ⚠️ **关键修正**：auto-validate 实际产出的 34 项 gate 检查**全部是结构/关键词校验**，**零语义验证**——价值定位需重写（详见下文疑问 3）

### 成本/规模证据

- 全阶梯（4 run）总成本 $0.10，~28 分钟
- 模型对：deepseek-v4-pro（architect/fusion/validator）+ glm-5.2（builder）

### 完整证据入口

| 想看什么 | 去哪 |
|---|---|
| 产出全景总索引 | `~/scratch/fusion-trial/00-trial-index.md` |
| 按 run 整理的 artifacts | `~/scratch/fusion-trial/runs/{01..04}/` |
| 本 change 的 spec/verification | `openspec/changes/fusion-harness-trial/` |

---

## 二、用户提出的三个正式引入疑问（核心待解决）

以下三个疑问在 trial 复核时提出，**均不属于当前 change scope**（当前 change 只做价值验证），需由新 change 解决。用户原话保留以防洞察流失。

### 疑问 1：正式入口形态

> "交付的内容入口是 sh 脚本吗？我要使用 fusion harness 是否必须用那个 sh 脚本来启动 pi？"

**Trial 现状**：`~/scratch/fusion-trial/launch-fusion-trial.sh` 是 trial 临时封装（封装了 `-e extension + 模型 flag + pointer 注入`）。

**正式引入该做的**：
- fusion-harness 作为 extension 装入 `.pi/extensions/`（通过 pkg-fork-dev），pi 启动自动加载，**无需 sh 脚本、无需 `-e` flag**
- 模型配置固化进配置文件 或 session 内 flag 调用
- pointer 文件（architect/builder 契约）需要持久化方案——trial 里放 scratch，正式引入该放哪需设计（可能 fork harness 时内置，或 .pi/ 下约定路径）

### 疑问 2：角色定制规范缺失

> "如果要定制参与 fusion/validate 的 agent，包括由哪个模型来做最终的 fusion 输出，和 validate 是谁来做 gate，谁来执行，现在有清晰的规范了吗？"

**Trial 现状**：无沉淀。角色机制散落在 upstream README + flag 文档，本次 change 没有结构化规范。

**Fusion harness 的原生角色机制**（从源码 + README 提取，供新 change 起点）：
- `--architect <model>` → 用于整个 ARCHITECT 家族（ARCHITECT worker + FUSION merge + VALIDATOR + TRIAGE）
- `--builder <model>` → 所有 builder 执行
- 所以：**"谁做 fusion 输出" = architect 模型**；**"谁设计 gate" = architect 模型**；**"谁执行 build" = builder 模型**
- 注意：这是 upstream 的角色绑定，**正式引入时是否要支持 per-command 角色重映射**（如让不同模型做不同命令的 fusion）需设计决策

**正式引入该做的**：产出一份操作规范文档，针对不同任务类型（ingest / 设计 / 规划 / 审查）说明：
- 角色配置策略
- pointer 文件撰写规范
- gate 形式选择（结构类 vs 语义类）

### 疑问 3：auto-validate 价值重定位（最重要的洞察）

> "目前 auto validate 虽然按照 fusion harness 的指导，通过 python 脚本来做 gate，但对于 my-wiki 仓库的很多分析、提炼、推理工作来说，python 形式的 gate 并不适用，实际解决的都是文本校对和格式规范方面的问题，这些问题确实值得暴露和沉淀到本仓库的脚本，但这不应该是 auto validate 的主要价值。"

**Trial 暴露的事实**（已在 verification.md 轴 3 修正记录）：

gate.py 的 34 项检查实际分类：
| 类型 | 检查数 | 本质 | 正确归属 |
|---|---|---|---|
| 硬结构（frontmatter/章节/markdown） | 19 | 确定性校验 | **回归 governance 脚本** |
| 关键词存在性（"AND not OR" in body 等） | 10 | 机械检查，与语义无关 | **也是 governance 职责** |
| 内容纪律（引用计数/否定关键词） | 4 | 机械计数 | **也是 governance 职责** |
| **语义质量验证** | **0** | 核心论点抓取/提炼深度/视角全面性 | **auto-validate 真正该做，但完全空缺** |

**核心结论**：
1. auto-validate 的**机制**（gate-first loop）有效，但它的**内容设计**（gate 该查什么）没解决
2. Python gate 能做的本质是 governance 的延伸，不是 auto-validate 的核心价值
3. auto-validate 真正的增量应在**语义层**——验证 digest 是否"真正理解并重新组织了论点"，这需要 **LLM-as-judge**，不是 Python

**正式引入该做的**（核心设计任务）：
- **gate 分类归位**：结构/关键词类 → 扩展 my-wiki governance 脚本承接；语义类 → 设计 LLM-as-judge gate
- **Q3 解冻**：trial 冻结的"声明式 YAML gate"决策需重新评估——在 LLM-as-judge 引入后，gate 形式可能是"声明式 + LLM hook"混合
- **gate 设计规范**：针对不同 ingest 任务，定义"哪些查结构、哪些查语义"的决策框架

---

## 三、Trial 副产品：governance 增强候选清单

gate.py 里那些"本质是 governance 职责"的检查项，是有价值的副产品——它们暴露了现有 governance 的覆盖缺口。正式引入时（或独立的 governance 增强 change），这些应沉淀进 my-wiki `tools/`：

| 候选检查 | gate.py 现实现 | 建议沉淀位置 |
|---|---|---|
| frontmatter 关键字段值匹配（type/synthesis_kind/source_kind/source_format/source_created_at/promotion_status/epoch/tags/raw_path/related/title） | 维度 1（12 项） | 扩展 `schema_validator.py` 或新增 `frontmatter_value_checker.py` |
| 必需章节存在性（开篇/长期价值/当前课题/系列关联/Sources） | 维度 2（6 项） | 扩展 `template_checker.py` 的 `<!-- required_sections -->` 机制 |
| 核心概念关键词覆盖（task-specific，如"这篇讲座必须提到三命令/SQLite/视角差异"） | 维度 3（10 项） | **新工具**：`content_coverage_checker.py`，按 digest 的 task contract 检查关键概念存在性 |
| raw 处理纪律（无 ASR 表、时间戳计数、raw 引用存在） | 维度 4（3 项） | **新工具**：`raw_discipline_checker.py` |
| 系列关联引用计数（≥N 处引用关联 digest） | 维度 6（1 项） | 扩展 `link_checker.py` 或新增 `series_reference_checker.py` |

**注意**：这些检查用 Python 在 governance 层做，比塞进 auto-validate 的 Python gate 更合理——它们是确定性的、可复用的、跨 digest 通用的。auto-validate 的 Python gate 只是把这些检查"任务特化"了，本质重复造轮子。

---

## 四、建议的新 change

### 建议 A：单一 change `fusion-harness-formal-integration`

涵盖三个疑问全部 + governance 增强。scope 大，但内聚。

### 建议 B：拆分多个 change

1. `fusion-harness-install`（疑问 1+2）：extension 正式注册 + 入口形态 + 角色规范
2. `auto-validate-gate-redesign`（疑问 3）：gate 分类归位 + LLM-as-judge 设计 + Q3 解冻
3. `my-wiki-governance-coverage`（副产品）：governance 脚本吸收 gate 暴露的检查项

**推荐 B**——三个问题复杂度差异大（疑问 3 是真设计难题，疑问 1 是工程问题，疑问 2 是文档问题），拆分后各自能聚焦。但具体在新 session 经 grilling 决定。

### 跨 change 的前置依赖

- 任何正式引入 change 都依赖 **pkg-research** 先做 upstream `disler/fusion-harness` 的安全审查（trial 跳过了这步，正式引入必须补）
- my-wiki 相关改动（governance 增强、ingest skill 改造）需先把 **my-wiki 注册到 `repo-registry`**（binding.md 已标注此缺口）

---

## 五、新 session 起步指引

1. **读本文档** + `openspec/changes/fusion-harness-trial/verification.md`（含修正后的价值定位）+ `~/scratch/fusion-trial/00-trial-index.md`
2. **不需要重跑 trial**——证据已沉淀，结论已记录
3. **建议从 grilling 起**：确认新 change 的 scope（单一 vs 拆分）、优先级（哪个疑问先解）、是否需要先做 pkg-research
4. **scratch 产物保留**——`~/scratch/fusion-trial/` 在正式引入完成前不清理，随时可回查 artifacts

---

## 六、Trial 遗留的两个已知问题（已在 verification 缺口节，正式引入时需处理）

1. **FUSION agent 路径遵守不一致**：forget-loop 的 FUSION 把产出写到 `/tmp/` 而非指令指定的 output/。根因：pointer 文件对 FUSION agent 的 output 路径约束不够强。
2. **fusion run artifacts 清理机制不明**：stop-picking 的 fusion run artifacts 缺失（最终产出含归因标记证明源自 fusion，但 architect/builder/fused 中间文件不在）。正式引入需明确 artifacts 生命周期。
