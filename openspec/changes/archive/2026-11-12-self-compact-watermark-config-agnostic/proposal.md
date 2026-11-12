# 主 spec 去除硬编码水位线数值

## Why

`openspec/specs/self-compact/spec.md` 把水位线的具体百分比和 token 数写进了需求文本：

- Purpose：「(`10%` notice / `20%` recommend / `30%` forced, 90% hard cap)」
- Requirement: Three-Tier Percentage Watermark → Scenario「Default percentage watermarks on a 1M context window」把 `.pi/managed/self-compact.json` 的内容写死为 `softAt: "10%"` / `at: "20%"` / `buffer: "10%"`，并断言解析结果是 100,000 / 200,000 / 300,000
- Requirement: Three-Tier Enforcement → 「forced（default `30%`）」
- Requirement: Three-Tier Percentage Watermark → Scenario「Hard ceiling clamp」把上限写死为 `0.90`

水位线已经调整到 70% / 75% / 80%（commit `a1b25b6`），spec 立即变成错误描述。根因是把**配置实例**写进了**行为契约**：数值属于 `.pi/managed/self-compact.json`，spec 只应约束「如何读取、如何解析、如何夹取、如何排序校验」。

## What Changes

- Purpose 段改为不出现具体数值。
- 「Default percentage watermarks」场景改为验证**解析规则**（百分比 → floor(window × pct)、token 字面量 → 原值、forced = min(at + buffer, 硬上限)），数值一律从配置读取，spec 不声明具体值。
- 「Hard ceiling clamp」场景保留夹取行为，但上限值表述为「配置的 `hardCeilingPercent`（缺省 90）」。
- 「Three-Tier Enforcement」里对 forced 的描述去掉 `default 30%`。

无代码改动，无行为改动。

## Impact

- Affected specs: `self-compact`
- Affected code: 无
