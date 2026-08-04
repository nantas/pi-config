# 设计：xAI Imagine 独立 Extension（未实现）

> 状态：**设计冻结 / 暂不实现**  
> 日期：2026-08-04  
> 背景：官方 Pi 已内置 `xai` provider（`/login xai` + `grok-4.5` 看图）；`pi-xai` 从能力地图移除。生图需求不紧急，本设计仅作后续可选路径。

## 1. 问题

| 能力 | 官方 Pi（2026-08 起） | 社区 `pi-xai` |
|------|----------------------|---------------|
| 登录 | ✅ `/login xai`（订阅 OAuth + API key） | `/login grok-build` 等扩展流 |
| 聊天 | ✅ `xai/grok-4.5`（Responses） | `grok-build/*` 自定义 provider |
| 看图 | ✅ 模型 `input: ["text","image"]` | 原生 + `xai-vision` 旁路 |
| 文生图 / 改图 | ⚠️ 仅 OpenRouter Images API | ✅ `image_gen` / `image_edit` + `/imagine`（xAI 直连） |

用户需要 agent 内 xAI 直连生图时，官方尚无一等工具；不必因此继续背负整包 `pi-xai`（provider/oauth/vision/video/…）。

## 2. 目标 / 非目标

### 目标（若将来实现）

- 独立 extension：`image_gen`、`image_edit`、`/imagine`
- 鉴权复用**官方** `auth.json` 的 `xai` 槽或 `XAI_API_KEY`
- HTTP 直连 `https://api.x.ai/v1/images/generations|edits`（Grok Imagine 协议）
- 可挂到本仓 `capabilities.yaml`（global 或 catalog）

### 非目标

- 不移植 `grok-build` provider / CLI proxy / device OAuth
- 不移植 `xai-vision`、video、goal、plan、usage、prompt-suggest
- 不假装走官方 `generateImages()`（当前仅 OpenRouter）
- 不与 `pi-xai` 双装同名工具

## 3. 推荐架构

```
.pi/extensions/xai-imagine/   # 或单文件 xai-imagine.ts
  index.ts        # registerTool + registerCommand
  imagine-api.ts  # generations / edits + 落盘
  auth.ts         # 只读官方 xai 凭证
```

```
/imagine → 注入 instruction → 模型调 image_gen
image_gen / image_edit
  → Bearer(official xai)
  → POST api.x.ai/v1/images/{generations|edits}
  → 落盘 → 返回 path
```

### 层职责

| 层 | 用官方？ | 做法 |
|----|----------|------|
| 登录 | ✅ | `/login xai` |
| 聊天 / 看图 | ✅ | `xai/grok-4.5`，本 extension 不碰 |
| 生图 HTTP | ❌ 无官方 xAI Images driver | extension 内 REST（源自 `pi-xai` 的 `xai-image-gen.ts`） |
| agent 工具 | extension | `registerTool` / `registerCommand` |

### 鉴权（实现时）

优先级建议：

1. `~/.pi/agent/auth.json` → `xai`（oauth access 或 api_key）
2. `process.env.XAI_API_KEY`
3. 失败则提示 `/login xai`

`baseUrl` 默认 `https://api.x.ai/v1`（不要默认 CLI proxy）。

### 协议要点（自 pi-xai）

- 默认模型：`grok-imagine-image-quality`（可选 `grok-imagine-image`）
- gen：`POST /images/generations`，`response_format: b64_json`，`aspect_ratio`，`resolution: 1k`
- edit：`POST /images/edits`，本地路径 → `data:image/...;base64,...`
- 输出：写临时文件，工具返回 path

## 4. 为何不接官方 `generateImages()`

1. 官方 Images provider **只有 OpenRouter**
2. ExtensionAPI **无** `registerImagesProvider`
3. OpenRouter 路径需要 `OPENROUTER_API_KEY`，与 xAI 订阅登录不是同一账单/权限面

因此「官方模型接口」在本设计中 = **官方鉴权 + 聊天/看图**；生图 = **扩展内 xAI REST**，而非 `pi-ai.generateImages`。

## 5. 与 pi-xai 的边界

可复用：`xai-image-gen.ts` 主体（~276 行）中的 HTTP、工具 schema、`/imagine` 指令模板。  
不复用：`xai-oauth.ts`、`xai-provider.ts`、`xai-vision.ts`、video 等。

双装冲突：若用户仍全局安装 `pi-xai`，会重复 `image_gen`；本仓能力地图已移除 `pi-xai`，实现 extension 时文档应写清互斥。

## 6. 触发实现的条件

满足任一再开任务即可：

- 用户频繁需要 Grok Imagine 生图/改图，且不愿走 OpenRouter
- 官方仍未提供 xAI Images provider / 内置工具
- 有明确验收用例（单图 gen、本地路径 edit、鉴权失败文案）

## 7. 相关决策

- 2026-08-04：`git:github.com/nantas/pi-xai` 从 `capabilities.yaml` global packages 移除；backlog 记为废弃（官方已覆盖登录/聊天/看图）。
- 生图：本设计 **backlog / 未实现**；当前可用替代：`pi-codex-image-gen` 或 OpenRouter 图像模型。

## 8. 参考

- 上游 Pi：`packages/ai/src/providers/xai.ts`、`auth/oauth/xai.ts`、`providers/data/xai.json`
- 上游文档：`packages/coding-agent/docs/providers.md`（`/login xai`）
- 社区参考：`pi-xai` → `xai-image-gen.ts`
- 本仓 backlog：`openspec/pkg-backlog.md`（pi-xai 废弃条目）
