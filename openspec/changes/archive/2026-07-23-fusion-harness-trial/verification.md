# Verification

## 验证结论

**Trial 完成，三轴评估均有真实证据，auto-validate 轴显示明确增量。**

价值结论：**价值确认（有条件）**——gate-first loop **机制**本身有效（baseline FAIL RED → loop → PASS），但 trial 暴露一个关键修正：auto-validate 实际产出的 34 项 gate 检查**全部属于格式/结构校验**（关键词存在性 + frontmatter + 章节计数），**零语义验证**——它们本应回归 governance 脚本，而非 auto-validate 的核心价值。auto-validate 真正该承担的语义层验证（核心论点抓取/提炼深度/视角全面性）在本次 trial 完全空缺。opinion/fusion 轴在批判性深度有真实视角差异，但主干结构高度收敛（design R3 印证）。建议后续独立 change 正式引入，**重点重设计 gate 该检查什么**，opinion/fusion 视模型栈视角差异而定。

**诚实标注**：以下定性判断基于 agent（我）对 artifacts 的分析，最终采纳决策仍建议用户对照 ground truth 复核。

## Spec-to-Implementation Coverage

| Requirement | 覆盖状态 | 证据 |
|---|---|---|
| **Scratch 隔离执行** | ✅ 完全覆盖 | 产出全在 `~/scratch/fusion-trial/` + `/tmp/fusion-harness-*`；my-wiki `20-synthesis/` 零改动（trial 前后文件 mtime 未变）；`~/.pi/agent/` 零改动 |
| **Upstream 框架优先** | ✅ 完全覆盖 | 全程用 Dan 框架 `fusion-harness.ts`，无原生重实现；summary.json 全程 `deepseek-v4-pro` + `glm-5.2`，无 Anthropic/OpenAI |
| **Skill 契约路径指针注入** | ✅ 完全覆盖 | `architect-prompt.md`/`builder-prompt.md` 均 <30 行纯指针；gate.py 的内容层检查（"AND not OR"、三命令、三要素等）证明 builder/validator 确实 read 并应用了 SKILL.md 契约 |
| **全阶梯试跑** | ✅ 完全覆盖 | opinion（run 01 hello 预检 + run 02 forget-loop 正式）+ fusion（run 03 forget-loop）+ auto-validate（run 04 stop-picking）全跑；fused.md + gate.py 落盘 |
| **价值评估驱动后续决策** | ✅ 完全覆盖 | 三轴评估完成（见下），结论为"价值确认（有条件）"，触发后续独立 change 引入路径 |

### Scenario 级验证

| Scenario | 状态 | 证据 |
|---|---|---|
| trial 不污染主仓库 | ✅ | my-wiki/pi-config/全局配置零改动 |
| 产出与 ground truth 隔离 | ✅ | 产出落 scratch output/，未覆盖 my-wiki 原文 |
| 模型对用 sovereign 栈覆盖 | ✅ | deepseek + glm 全程，无回退 |
| clean-room 子进程 provider 兼容性预检 | ✅ | R1 通过（run 01 两次 hello 成功），deepseek clean-room 解析正常，无需回退 glm-5.1 |
| 子 agent 按需 read 加载契约 | ✅ | gate.py 34 项检查覆盖 SKILL.md 衍生契约，证明 read 生效 |
| builder 明确 trial 跳过 grilling | ✅ | builder-prompt.md 含显式声明；两模型均自决主干结构（无 grilling 询问） |
| opinion 提供认知方向 | ✅ | run 02 两模型各给 6 个角度的独立视角 |
| fusion 合并产出 digest | ✅ | run 03 fused 产出 353 行（含 `[BUILDER]` 归因）；run 04 最终产出 308 行（含 11 个归因标记） |
| auto-validate 用 Dan Python gate | ✅ | gate.py 34 项，baseline FAIL RED，round-3 PASS（41 passed 0 failed） |
| cwd 指向 my-wiki | ✅ | launch 脚本 cd my-wiki；gate.py 含 `PROJECT_ROOT = my-wiki` 路径 |
| 价值确认触发后续正式引入 | ✅ | 见下文三轴评估 + writeback |
| 价值不足则 trial 弃用 | N/A | 价值确认，此 scenario 未触发 |

## Task-to-Evidence Coverage

| Task | 状态 | 证据 |
|---|---|---|
| 1.1-1.3 准备 | ✅ | 二进制全装（just 新装）；deepseek+zhipu key 在 auth.json |
| 2.1.1-2.1.4 环境 | ✅ | harness cloned；output 创建；raw + ground truth 可读 |
| 2.2.1 launch 命令 | ✅ | `launch-fusion-trial.sh`（cwd 修正版） |
| 2.2.2 provider 预检 | ✅ | run 01 两次 hello，R1 通过无回退 |
| 2.3.1-2.3.3 契约指针 | ✅ | 两 prompt 文件 <30 行纯指针，无内联 |
| 2.4.1 opinion | ✅ | run 02，两模型独立视角 |
| 2.4.2 fusion | ✅ | run 03，fused 产出 353 行 |
| 2.4.3 auto-validate | ✅ | run 04，gate 绿 |
| 3.1-3.4 评估 | ✅ | 见下文三轴评估 |
| 4.1-4.3 收敛 | ✅ | 本文件 + writeback.md |

## 三轴评估

### 轴 1：opinion 视角差异 — **有差异，但限于批判性深度**

**证据**：run 02 两模型产出（architect 74 行 / builder 83 行）

- **主干结构收敛**：两模型都选"论证链式/渐进式建构"作主干，都识别三要素 + scale-up 路径为核心 → 印证 design R3（模型在 ingest 场景结构层趋同）
- **真实差异在批判性深度**：architect（deepseek）独有的"角度5：隐藏的张力与盲区"（Factory Router 路由错误 / Agent 质量漂移 / review 递减收益 / strawman 嫌疑），builder（glm）完全没有
- **结论**：opinion 的价值不在"多给一个论点"，在"其中一个模型给出了另一个漏掉的批判视角"。这正是 digest 原文说的"divergence 才是价值"。

### 轴 2：fusion 合并捕获度 — **真实有效，divergence 被保留**

**证据**：run 03 `fusion-agent-merge-report.md`

merge report 的三栏分类真实有效：
- **Converged**：主干结构、关键引文、8 级台阶、三要素定位（高收敛）
- **Diverged（价值所在）**：architect 的"边界与盲区"section 被 merge report 明确标为"most substantive value-add"，kept in full；builder 的三层长期价值分类被采纳
- **Discarded（合理）**：builder 的破→立排序（不如 architect 忠实）、独立系列关联节（并入）

**结论**：fusion 的 consensus/divergence/discard 机制不是装饰——它确实识别并保留了单模型会漏的 divergence（批判性盲区）。这是 fusion 的真实增量。

### 轴 3：auto-validate gate — **机制有效，但 gate 设计未触及核心价值（关键修正）**

**证据**：run 04 `gate.py`（34 项）vs 现有 `governance_report.py`

**修正说明**：本节在 trial 初版 verification 中曾表述为"明确增量，核心价值"，经用户复核后纠正。gate 实际产出的 34 项检查本质分类如下：

| gate.py 维度 | 检查数 | 实际性质 | governance 能力 | 正确归属 |
|---|---|---|---|---|
| Frontmatter 字段 | 12 | 硬结构校验 | ✅ schema_validator | → 回归 governance |
| 章节结构（存在/计数） | 6 | 硬结构校验 | ⚠️ template_checker 部分 | → 回归 governance |
| "内容概念覆盖" | 10 | **关键词存在性**（`"AND not OR" in body`/`"SQLite" in body`） | ❌ governance 无 | → **也是 governance 职责**（机械检查，与语义无关） |
| raw 处理纪律 | 3 | 计数/否定关键词（`ASR 误识别 not in content`/时间戳<10） | ❌ governance 无 | → 也是 governance 职责 |
| markdown 质量 | 1 | 硬结构校验 | ✅ 现有 lint | → 回归 governance |
| 系列关联 | 1 | 引用计数（≥2 处提及第一期） | ❌ governance 无 | → 也是 governance 职责 |
| governance 兜底 | 1 | 自身检查 | ✅ | — |
| **语义质量验证** | **0** | **核心论点抓取/提炼深度/视角全面性/可复述性** | ❌ governance 无 | **→ auto-validate 真正该做，但本次完全空缺** |

**关键发现**：
1. gate 机制本身有效——baseline 正确 FAIL RED → 3 轮 loop → PASS（41 passed 0 failed），证明 gate-first loop 作为工作流是成立的。
2. 但 34 项检查**全部可被 Python 表达**，意味着全部是确定性结构/关键词校验——机械塞入关键词即可通过，与"是否真正理解讲座"无关。
3. auto-validate 真正的核心价值应是**语义层验证**（digest 是否抓住核心论点、提炼是否到位、视角是否全面），这需要 LLM-as-judge，Python gate 做不了。
4. 本次 trial 证明的只是"机制可行"，未证明"语义价值"。语义层是后续 change 必须攻克的真问题。

**结论**：auto-validate 的**机制**（gate-first loop）已验证可行且有增量（相对于纯事后人工 review），但它的**内容设计**（gate 该查什么）未解决——34 项里该回归 governance 的结构检查、该 LLM-as-judge 做的语义检查，两类都没归位。这是后续 change 的核心设计任务。

## 关键证据入口

| 证据类型 | 证据路径 | 对应 requirement/task |
|---|---|---|
| R1 预检结果 | `runs/01-opinion-hello-r1preflight/` | provider 兼容性 Scenario |
| opinion 视角差异 | `runs/02-opinion-forget-loop/architect-*.md` vs `builder-*.md` | opinion 提供认知方向 + 轴1 |
| fusion 合并报告 | `runs/03-fusion-forget-loop/fusion-agent-merge-report.md` | fusion 合并 + 轴2 |
| fusion 真正产出 | `runs/03-fusion-forget-loop/fusion-merged-output-*.md`（353行） | fusion 合并产出 |
| auto-validate gate | `runs/04-auto-validate-stop-picking/validator-gate-*.py` | auto-validate + 轴3 |
| gate 执行链 | `runs/04-auto-validate-stop-picking/gate-round-*.txt` | baseline FAIL + round-3 PASS |
| 最终 digest | `runs/04-auto-validate-stop-picking/builder-glm-5.2-final-output.md`（308行） | 全阶梯产出 |
| 总索引 | `00-trial-index.md` | 产出全景 |
| 成本数据 | 各 run 的 summary.json | 总计 $0.10 |

## 缺口与阻塞项

### 已识别问题（不阻塞价值确认，但影响后续引入设计）

1. **FUSION agent 路径遵守不一致**：forget-loop 的 FUSION 把产出写到 `/tmp/` 而非指令指定的 output/（run 03）。stop-picking 的 FUSION 写对了。根因：pointer 文件对 FUSION agent 的 output 路径约束不够强。**后续引入时需强化**。

2. **stop-picking 的 fusion run artifacts 缺失**：5 个 /tmp 目录只有 forget-loop 的 fusion run。stop-picking 最终产出（308行）含 11 个归因标记证明它源自 fusion，但该次 fusion run 的 architect.md/builder.md/fused.md 不在。**不影响价值评估**（forget-loop 的 fusion run 提供了完整的 consensus/divergence 证据），但说明 artifacts 清理机制需明确。

3. **gate 内容设计错位（关键修正，升级自原 R2）**：原 design R2 把"语义盲区"当"已接受的边界"。trial 复核后发现这是定位错误而非边界——auto-validate 34 项检查全部是结构/关键词校验，本应回归 governance；而它真正该做的语义验证（0 项）完全空缺。**这不是边界，是 gate 该查什么的设计问题没解决**。详见轴 3 的修正说明。后续 change 必须重新定义：哪些检查归 governance 扩展、哪些用 LLM-as-judge 承接语义层。

### 无阻塞性缺口

所有 5 个 Requirement、所有 Scenario 均有证据覆盖，无未完成任务。
