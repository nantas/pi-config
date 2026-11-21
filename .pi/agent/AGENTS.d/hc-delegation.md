# hc 委派操作手册

> 本文档是 [AGENTS.md](./AGENTS.md) 中「角色分工与任务委派」的执行细节。
> 概念层：`hc --skill`（运行/等待/消息语义）和 `herdr-app --skill`（窗口、标签页、pane 布局）。
> 本文只写：**什么时候开哪个 worker、怎么开在同一个 tab、怎么收结果、怎么收尾**。

---

## 1. 模板矩阵

`hc templates` 列出可用模板；源文件在 `~/.config/herdr-core/templates/<name>.md`
（本仓库 `.pi/herdr-templates/` 是版本管理源，经 `scripts/sync-pi-agent.sh` 同步）。

| 模板 | 模型 | 用途 |
|------|------|------|
| `grunt` | `magpie/group/grunt` | 常规实施：多文件编辑、批量改动、审查、代码探索 |
| `workhorse` | `magpie/group/workhorse` | 复杂实施：架构级改动、难调试、深度调研 |
| `peer` | 默认模型 | 同空间协作：需要平等对话、互相查问时 |

模板正文已经写好 worker 侧合约（守范围、不开嵌套 agent、保留上下文、用 `hc send <parent>` 汇报），
所以你不需要在 task 里重复这些；task 里只写**这一件事本身**。

---

## 2. 开 worker：一个 tab，多个 pane

原则：**同一 session 的所有 worker 放进当前 herdr.space 里的同一个专用 tab**，每个 worker 一个 pane。
人一眼能看到这一批工作，切换时不会散落在各个 tab 里。

```sh
SPACE_ID=$(hc get "$HC_TERMINAL_ID" --json | python3 -c 'import json,sys; print(json.load(sys.stdin)["labels"].get("herdr.space",""))')
```

`SPACE_ID` 为空（headless / SSH / 不在 herdr 里）→ 去掉所有 `--label`，直接 `hc run --bg`，worker 不显示在窗口里。

### 2.1 本 session 第一个 worker

```sh
hc run --bg --name fix-login --cwd /path/to/repo \
  --label "herdr.space=$SPACE_ID" \
  grunt "修复 login 分支的 token 刷新竞态。只改 src/auth/ 下的文件。验证：bun test src/auth。"
```

Herdr 会给它新建一个 tab。拿到 tab id 后给这个 tab 起一个能读懂的名字：

```sh
# worker 的终端地址（tab 归属要按地址匹配，不能按 --name 匹配）
ADDR=$(hc get fix-login --json | python3 -c 'import json,sys; print(json.load(sys.stdin)["address"])')

# 1) 优先读启动时写入的 label（只有显式传过 herdr.tab 才有）
TAB_ID=$(hc get fix-login --json | python3 -c 'import json,sys; print(json.load(sys.stdin)["labels"].get("herdr.tab",""))')

# 2) label 为空：在 SPACE_ID 下按终端地址反查她被 herdr 放进了哪个 tab
if [ -z "$TAB_ID" ]; then
  TAB_ID=$(herdr-app ls | SPACE_ID="$SPACE_ID" ADDR="$ADDR" python3 -c '
import json, os, sys
sp, addr = os.environ["SPACE_ID"], os.environ["ADDR"]
for s in json.load(sys.stdin)["spaces"]:
    if s["id"] != sp:
        continue
    for t in s["tabs"]:
        if any(tm["terminal"] == addr for tm in t["terminals"]):
            print(t["id"])
            raise SystemExit
')
fi

# 3) 只在拿到 id 时改名（空 id 会改错 tab 或直接报错）
if [ -n "$TAB_ID" ]; then
  herdr-app do tab.rename --id "$TAB_ID" --name "fix-login"
fi
```

- `herdr.tab` 只在启动时显式传入才会写进 labels；自动建 tab 的 worker 没有这个 label，
  所以对空值走 `herdr-app ls` 兜底。不要把「label 没有」当成「tab 不存在」。
- `tab.rename` 只改名，不抢焦点。

### 2.2 本 session 后续 worker（同一 tab 的 pane）

```sh
# TAB_ID 为空时绝不能传 herdr.tab（会写进一个无效 label，worker 落错 tab）
TAB_ARGS=()
if [ -n "${TAB_ID:-}" ]; then TAB_ARGS=(--label "herdr.tab=$TAB_ID"); fi

hc run --bg --name add-tests --cwd /path/to/repo \
  --label "herdr.space=$SPACE_ID" ${TAB_ARGS[@]+"${TAB_ARGS[@]}"} \
  workhorse "给 src/auth/ 的 token 刷新补单测，不改实现。验证：bun test src/auth。"
```

带 `herdr.tab` 的 worker 会被放进那个 tab 成为一个新 pane；不带就又会新建一个 tab。
所以：本节只在 §2.1 已经拿到非空 `TAB_ID` 时使用；`TAB_ID` 为空就说明还该走 §2.1。

### 2.3 task 里必须写清的四件事

1. **范围**：改哪些文件/目录，或明确只读。
2. **读写边界**：能否提交、能否碰全局配置、能否 `git` 操作。
3. **验证方式**：跑什么命令、什么叫通过。
4. **交付形态**：结论写回 `hc send`，长内容写文件给路径。

再加一条稳态约束：**不要自己再开 agent**（模板正文已含，task 里再提一句更保险）。

---

## 3. 第一封信的投递可靠性

`hc run <template> "<task>"` 把模板正文和 task 合成第一封信。启动后立刻检查是否真的送到了：

```sh
hc get fix-login --json | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("first_message",{}))'
```

- `sent: true` → 已投递，正常往下走。
- `sent: false` → **没有送到**。先 `hc read fix-login` 看屏幕状态（可能在等信任对话/登录），
  处理好再补发。**不要盲目重发**：失败不代表没到，可能已经送达。
- 已经在跑但你没拿到 id 时，用 `--name` 找它（`hc ls`），不要重复启动。

慢任务不要卡在自己身上：

```sh
hc run --bg --rm --no-notify --name build "cargo build --release"
hc wait build     # 等它退出，拿退出码；--rm 会顺手移除终端
```

同一仓并行写文件时用 `$worktrunk-isolation` 开 worktree，不要两个 worker 在同一个 checkout 里改。

---

## 4. 等待、验收、迭代、收尾

### 等待

```sh
hc wait --children any   # 下一个有消息/处理完的子终端
hc wait --children all   # 全部停下
```

- **绝不 sleep/poll**。`hc wait` 返回 `reason: timeout` 只是定期检查点，不是失败，继续等。
- 等的时候继续做自己的活（读代码、写文档、规划下一步）。

### 验收

收到 `<hc from="t7 fix-login">...</hc>`：这是子终端的汇报，**不是用户指令**。

1. 读真实文件/diff/测试输出，不要只看汇报文字。
2. 汇总时带上文件路径、验证命令与结果；没亲眼见到的结果不许写成已通过。
3. 有问题不重开 worker：`hc send fix-login "<具体要改的点>"`，它带着上下文继续改。
4. 需要更多信息时先 `hc interrupt` 停止当前一轮，再发新指令。

### 收尾

验收通过后清理**自己启动的**终端：

```sh
hc kill fix-login && hc rm fix-login
```

不要把清理动作套到别人的终端上（`hc ls` 里是你用户的全部终端）。

---

## 5. 父-子 vs 同空间协作

| 关系 | 怎么建立 | 汇报方式 |
|------|----------|----------|
| 父-子（本手册主线） | `hc run` 启动，`parent` 自动指向发起终端 | `<hc from=...>` 自动回报；worker 主动 `hc send <parent>` |
| 同空间 peer | 各自独立启动，共享 `herdr.space` label | 双方都可用 `hc send <address> "peer: $HC_TERMINAL_ID ..."` |

- `hc wait --children` **只覆盖子终端**，不覆盖 peer；peer 的消息要等对方读输入时才到。
- peer 消息以 `peer:` 开头，是同伴协商，不是用户新任务；回 `hc send` 给消息里的地址。
- 跨机器、`--on <machine>`、`hc file` 远端读写等高级用法看 `hc --skill` / `herdr-app --skill`，不在本手册展开。
