# 图片格式与图表输出规范

本文按需加载，覆盖两类低频规范：visual input 图片格式兼容性与 mermaid 图表宽度纪律。

## 图片格式兼容性（按 provider）

不同 provider 接受的 visual input 格式不同；不兼容时后端会拒绝**整个请求**。

| Provider | 接受格式 | 典型报错 |
|----------|----------|----------|
| `openai-codex`（如 gpt-5.5） | jpeg / png / gif / webp | `The image data you provided does not represent a valid image` |
| `xai` / Grok（如 grok-4.5） | jpeg / png / webp / ico（**不含 gif**） | `Downloaded response does not contain a valid JPG, PNG, WebP, or ICO image` |

**触发场景**：`read` 本地图、webfetch 下载参考图、抓取网页图片进会话（CDN 常下发 AVIF/WebP；下载资源常为 GIF）。

**处理**：图片进入会话前先 `file` 检测格式，当前 provider 不支持则转码为 png/jpeg。macOS 用 `sips`：

```bash
file ref.gif                               # 检测实际格式
sips -s format png ref.gif --out ref.png   # 转码为 png（批量：for f in *.gif *.avif; do ...）
```

判定：以**当前 provider 白名单**为准，不在表内的格式（含 xAI 下的 gif，以及 AVIF/HEIC/HEIF/BMP/TIFF 等）一律先转 png 再作视觉输入。GIF 动图转 png 只保留一帧。SVG 为矢量，sips 不支持，需先栅格化（`rsvg-convert -h 1024 in.svg -o out.png` 或浏览器截图）或向用户索要位图版本。

## 图表输出规范（mermaid 宽度纪律）

画图一律用 mermaid（对话内与落盘文档皆是）。pi TUI 会把对话消息中的 mermaid
代码块渲染为 Unicode 框线图，但渲染宽度超过终端可用宽度时会**静默降级为源码**
（无警告，agent 无从察觉）。宽度纪律：

1. 渲染宽度 **≤ 90 列**（实测安全线）：节点标签 ≤ 10 个全角字符、
   避免 subgraph 嵌套、箭头标签尽量短。
2. 一张图放不下 → 拆成多张小图（按流程阶段 / 子系统切分），不用 ASCII 手画。
3. 无把握时预检宽度：pi 包路径 `$(npm root -g)/@earendil-works/pi-coding-agent`，
   预检脚本放包目录内运行（ESM 限制），`import { render } from "grok-mermaid"`
   后取 `render(src).width`，≤ 90 再输出。
