# Verification

## Spec-to-Implementation 覆盖矩阵

本 change 对主 spec 做 R5/R9 MODIFIED + R10 ADDED，全部有实现落点：

| Requirement | 实现落点 | 状态 |
|-------------|---------|------|
| R5 MODIFIED: Account Pool Operation (单号务实默认 + 多号按需升级) | setup.md「单号 cookie 模式（务实默认）」+「多账号升级（可选）」段重写；init.sh 引导段修正；SKILL.md 初始化段补「单号就够」 | ✅ |
| R9 MODIFIED: Cookie-Grab Convenience (仅首账号 + 硬警告 + 删换号误导) | grab-cookie.sh 头注释重写 + 成功输出加硬警告；setup.md 桌面便利段改「仅首账号 + 换号必然失效铁证」；SKILL.md 初始化段 grab 提示改「仅首账号」 | ✅ |
| R10 ADDED: Handle Logged-Out Session Errors With Relogin | setup.md 新增「诊断与恢复：logged-out 与其他错误」段（根因 + relogin 路径 + reset_locks 无效警告 + 代理与 IP 风控）；SKILL.md 失败重试链加「特殊错误 XClIdAccountError」小节 | ✅ |

## Task-to-Evidence（before/after 对比）

### setup.md — 账号池段重写（R5）
- **before**：「轻量账号池（2-3 号，推荐默认）」+「导入 2-3 个 cookie 账号成池：add_cookie acc1/acc2/acc3」
- **after**：「单号 cookie 模式（务实默认）」——论证单号已够（持久 session+TLS 指纹远超 agent-reach）+「多账号升级（可选）」——账密 login_accounts 为按需路径，含 accounts.txt 格式、IMAP 要求、热扩安全、独立代理提示
- **删除**：旧「add_cookie 多个号」误导表述

### setup.md — 桌面便利段（R9）
- **before**：「只抓 Chrome 当前登录的那个号——加第 2、3 个号要先在浏览器切/重登 x.com」
- **after**：「仅首账号便利——抓完别动浏览器」+ 硬警告框「同浏览器换号=必然失效（实测铁证：Chrome x.com 域 auth_token/ct0 各只 1 份，X 切换器替换单槽 session 触发服务端失效）」

### setup.md — 新增诊断与恢复段（R10）
- **新增**：`XClIdAccountError: Logged-out` 根因（登出/切号 或 IP 风控）+ 恢复路径（账密号 relogin，cookie 号删号重加）+ 硬警告 reset_locks 无效 + 「代理与 IP 风控」实战提示（issue #268）

### setup.md — 账号池运维段
- **before**：「relogin_failed（cookie 模式极少需要）」+ reset_locks 无注释
- **after**：relogin 指定号/批量 + reset_locks 加「⚠️ 只能清限流锁，救不活 server-side 失效 session」警告
- **删除**：旧「账密模式（不推荐，仅备选）」独立段（内容已并入「多账号升级」，避免重复）

### grab-cookie.sh（R9）
- **before** 头注释：「要加第 2、3 个号，先在浏览器切/重登 x.com 账号再跑本脚本」
- **after** 头注释：「仅首账号便利...多账号走账密 login_accounts，不要靠浏览器换号抓取」+ 实测铁证说明
- **after** 成功输出：新增硬警告「⚠️ 抓完别动浏览器：不登出、不在 X 切换器切到别的号！」+ 多账号走账密指引
- **实测验证**：`grab-cookie.sh acc_test` 跑通，警告输出正确（见下方证据），acc_test 已清理

### SKILL.md（R9 + R10）
- **初始化段**：grab 提示改「仅首账号」+ 新增「大多数场景单号就够」说明
- **失败重试链**：新增「特殊错误：XClIdAccountError: Logged-out」小节——明确不在重试链（非偶发/限流），根因（登出/切号 或 IP），恢复（relogin/删号重加），reset_locks 无效

### init.sh（原 tasks 未列，同属错误指引，一并修正）
- **before**：「建议导入 2-3 个账号成轻量池：add_cookie acc2/acc3」
- **after**：「单号已足够务实。多账号需求走账密 login_accounts...不要靠浏览器换号抓取」+「抓完别动浏览器」警告

### architecture.md — 账号池轮换段（实测后补充修正）
- **before**：「某账号被限流时锁定...自动切下一个。2-3 号轻量池是甜点。」
- **after**：补「正常请求成功后立即解锁（只有限流才锁约 15min），多账号下轮换只在需要时发生」+ 删「2-3 号轻量池是甜点」（与单号务实默认新定位矛盾）
- **实测证据**：双号池测试中，acc_browser 连续 3 次查询后 locks 为空（用完即解锁），acc1 因先前限流被锁时 twscrape 自动全用 acc_browser。源码：queue_client.py:174 正常 unlock、:171 限流 lock_until

## 安全自查

- ✅ 真实 cookie 匹配数 = 0（grep `auth_token=[a-f0-9]{20,}` 排除占位符后无匹配）
- ✅ `~/.x-reach/` 在 home 目录，仓库外天然隔离
- ✅ accounts.txt.example 仍 3 处 REPLACE_ME 占位
- ✅ 无旧措辞残留（grep「2-3 号推荐」「add_cookie acc2/acc3」「先在浏览器切/重登」「2-3 个账号成轻量池」均无匹配）

## 验证结论

- R5/R9/R10 三条 requirement 全部实现并覆盖
- 致命缺陷（同浏览器换号抓多账号 = 必然失效）在 5 个文件（setup.md / grab-cookie.sh / SKILL.md / init.sh / architecture.md）系统性修正
- R10 logged-out 错误处理完整（根因 + 恢复 + reset_locks 陷阱警告）
- 单号务实默认 + 多号按需升级的定位贯穿所有文档
- 安全边界守住（零真实 cookie，占位符不变）

**结论：verification 通过，change 可进入 archive 阶段。**
