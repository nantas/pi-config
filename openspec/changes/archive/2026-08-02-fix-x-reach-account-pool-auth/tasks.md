# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 通读本 change 的 spec delta（R5/R9 MODIFIED + R10 ADDED），确认实现落点对应 setup.md / grab-cookie.sh / SKILL.md 的哪些段落
- [x] 1.2 复核现有实现文件现状：`.pi/skills/x-reach/{SKILL.md, references/setup.md, scripts/x-reach-grab-cookie.sh}`，定位需修正的段落（原 change 引入的多账号 cookie 误导）
  - 额外发现：`scripts/x-reach-init.sh` 引导段也有「add_cookie acc2/acc3 成轻量池」误导，一并修正（原 tasks 未列，同属错误指引）

## 2. 核心实现任务

- [x] 2.1 修正 `references/setup.md` 账号池段（覆盖 R5 MODIFIED）
  - 重写为「单号 cookie 默认 + 多号账密升级」双路径结构：单号为主（实测 Chrome 单槽铁证 + 足够务实的论证），多号为独立升级章节（add_accounts + login_accounts + IMAP 要求）
  - 新增硬警告框：同浏览器换号 = 登出 = 失效（必然构造，非偶发）
  - 验证方式：setup.md 以单号为默认；无「add_cookie 多个号」表述；多号路径明确为升级选项
- [x] 2.2 修正 `scripts/x-reach-grab-cookie.sh`（覆盖 R9 MODIFIED）
  - 脚本头注释与成功输出加硬警告：仅首账号便利，抓完别动浏览器（登出/换号会让该 session 失效），多号走 login_accounts
  - 删除任何「换浏览器号抓多账号」的暗示
  - 验证方式：脚本输出含「多号走账密」指向；无换号抓取误导
- [x] 2.3 修正 `SKILL.md`（覆盖 R9 MODIFIED + R10 ADDED）
  - 「首次/新机器初始化」的 grab 便利段补警告（仅首账号，多号走账密）
  - 「失败重试链」或新增「错误诊断」段：logged-out 错误根因（server-side 失效）+ 恢复（relogin/relogin_failed，reset_locks 无效）
  - 验证方式：SKILL.md 含 login_accounts 多账号路径 + logged-out 错误处理
- [x] 2.4 新增 setup.md「账号诊断与恢复」段（覆盖 R10 ADDED）
  - `XClIdAccountError: Logged-out` 根因（登出 / IP flag）+ 恢复（relogin_failed 账密重登 / del_accounts 删号）
  - 明确 reset_locks 不能修 logged-out（只清限流锁）
  - 「代理与 IP 风控」提示段（issue #268 经验，不写脚本）
  - 验证方式：该段覆盖 R10 全部 scenario

## 3. 收敛与验证准备

- [x] 3.1 整理 spec-to-implementation 覆盖矩阵：R5/R9/R10 → 对应文件段落（见 verification.md）
- [x] 3.2 整理 task-to-evidence：每个修正点的 before/after 文本对比（见 verification.md）
- [x] 3.3 安全自查：确认修正未引入真实 cookie；`~/.x-reach/` 仍隔离；accounts.txt.example 仍为占位
  - 真实 cookie 匹配数=0；~/.x-reach 仓库外天然隔离；accounts.txt.example 3 处 REPLACE_ME；无旧措辞残留

## 4. 验证与回写收敛

- [x] 4.1 基于实现结果生成 `verification.md`（spec-to-implementation + task-to-evidence）
- [x] 4.2 确认本 change 无页面 writeback（CONTEXT.md slug 已登记，纯 spec/文档修正）——writeback.md 记录「无需回写」
- [x] 4.3 archive 阶段：delta spec 同步覆盖主 spec（R5/R9 MODIFIED + R10 ADDED 合并进 `openspec/specs/x-reach-skill/spec.md`）
  - 完成：主 spec 从 9→10 条 requirement，R5/R9 已替换为新版（单号务实默认 + grab 降级），R10（logged-out 处理）已追加；openspec spec list 识别正常
