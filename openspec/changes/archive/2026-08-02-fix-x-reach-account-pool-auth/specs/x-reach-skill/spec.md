# Specification Delta

## Capability 对齐（已确认）

- Capability: `x-reach-skill`
- 来源: `proposal.md` / 用户实测 `XClIdAccountError` + twscrape 源码（xclid.py、queue_client.py）+ README + issue #268 实战证据
- 变更类型: `modified`（对既有主 spec 的 R5/R9 做修正，新增 R10）
- 用户确认摘要: 用户在另一 session 实测「同浏览器换号导致 acc1 失效」，报错原文 `XClIdAccountError: Logged-out X web app; username=acc1`，判定原多账号工作流错误，指令重新整理修改方案。根因经 twscrape 源码与实战证据双重确认。

## 规范真源声明

- 本文件是 `x-reach-skill` 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Skill Shall Document Account Pool Operation For Rate-Limit Resilience
The skill SHALL document the authentication model with a single-account cookie mode as the pragmatic default and username/password `login_accounts` as an opt-in upgrade for multi-account pools. The skill SHALL record the verified fact that Chrome's cookie store holds only one `auth_token`/`ct0` per `x.com` domain at a time, so X's in-browser multi-account switcher replaces the active session on each switch — cookie mode is therefore one-account-at-a-time by construction. The skill SHALL explicitly warn that logging out of an X account — including switching accounts in the same browser profile — invalidates that account's `auth_token` on X's server side, causing any previously-stored cookie snapshot to fail with `XClIdAccountError: Logged-out X web app`, and that grabbing a second account by switching in the same browser is a guaranteed-invalidation anti-pattern (not an occasional failure). The skill SHALL document that multi-account pools, when needed, are built via username/password `login_accounts` (twscrape runs an independent login flow per account, sessions do not invalidate each other), and that twscrape rotates accounts automatically when one is rate-limited.

#### Scenario: Single account cookie mode is the pragmatic default
- **WHEN** an operator initializes x-reach
- **THEN** the setup guide presents cookie mode for a single account as the default, noting that even a single twscrape account with persisted session + TLS fingerprint is far more stable than the agent-reach OpenCLI twitter backend, and that single-account mode covers most retrieval needs

#### Scenario: Cookie mode is one-account-at-a-time by construction
- **WHEN** an operator uses cookie mode and asks about multiple accounts
- **THEN** the guide states that Chrome holds one `auth_token`/`ct0` per x.com domain and X's switcher replaces the active session on each switch, so cookie mode is one-account-at-a-time; multiple cookies require independent environments (separate browser profiles / devices / IPs) and a grabbed cookie must never be followed by logging out of or switching accounts in that source browser

#### Scenario: Same-browser account-switching is a documented anti-pattern
- **WHEN** an operator considers grabbing a second account's cookie by switching accounts in the same browser profile
- **THEN** the guide explicitly forbids this as a guaranteed failure, explaining that the logout triggered by switching invalidates the prior account's auth_token server-side, producing `XClIdAccountError` on any snapshot stored from that browser

#### Scenario: Multi-account via login_accounts is an opt-in upgrade
- **WHEN** an operator finds single-account rate-limit waits insufficient and wants a pool
- **THEN** the setup guide documents the upgrade path: `add_accounts <file> username:password:email:email_password` + `login_accounts` (twscrape performs an independent login per account, reads email verification codes via IMAP, sessions do not invalidate each other), positioned as opt-in rather than the default recommendation

#### Scenario: Rate-limit recovery is automatic
- **WHEN** one account hits a per-endpoint rate limit during retrieval
- **THEN** twscrape locks that account for the operation until reset and retries with another active account; the skill documents this as the primary stability mechanism (account rotation does not ban accounts per issue #268 production experience)

### Requirement: Skill MAY Offer A Desktop Cookie-Grab Convenience With Manual Fallback
The skill MAY ship an optional `scripts/x-reach-grab-cookie.sh` convenience that extracts the currently-logged-in X cookie from the local Chrome via `browser_cookie3` and adds it to the pool. The grab convenience SHALL be documented and behave as **single-account-first** only: it grabs whichever account is currently logged into the browser. The script SHALL emit a hard warning that the operator must not log out of or switch accounts in that browser afterward (doing so invalidates the grabbed auth_token server-side), and SHALL direct operators who need multiple accounts to the username/password `login_accounts` path. The manual cookie path (DevTools copy → `add_cookie`) SHALL remain the documented primary path for all environments. The grab convenience SHALL detect failure (no browser / Chrome encryption drift / Keychain denied / x.com not logged in) and fall back to the manual instructions. The skill SHALL NOT document or suggest grabbing multiple accounts by switching accounts in the same browser profile.

#### Scenario: Desktop first-account convenience
- **WHEN** an operator on a desktop machine with Chrome logged into x.com runs `x-reach-grab-cookie.sh <name>`
- **THEN** the script reads auth_token+ct0 from Chrome, adds the account to `~/.x-reach/accounts.db`, and prints a warning that the operator must not log out of / switch accounts in that browser afterward or the grabbed session will be invalidated

#### Scenario: Grab fails and falls back to manual
- **WHEN** the grab script cannot read Chrome cookies (headless/SSH, encryption drift, or x.com not logged in)
- **THEN** the script prints the manual cookie path instructions and exits non-zero, never leaving the pool in a broken state

#### Scenario: Multi-account is directed to login_accounts, not grab-switching
- **WHEN** an operator wants to add a second account
- **THEN** the skill directs them to the `add_accounts` + `login_accounts` path; the previous (now removed) guidance to switch/re-login in the browser per grab is explicitly retracted

#### Scenario: Manual path remains primary
- **WHEN** any environment needs to add an account
- **THEN** the SKILL.md and setup.md present the manual DevTools→add_cookie path as the default, with the grab script as an optional single-account desktop convenience

## ADDED Requirements

### Requirement: Skill Shall Handle Logged-Out Session Errors With Relogin
The skill SHALL document the `XClIdAccountError: Logged-out X web app` error as a server-side session-invalidation signal (not a transient/rate-limit issue), explain its two causes — (a) the account was logged out of its source browser, or (b) IP-based session invalidation from a shared/flagged proxy — and provide the recovery path: `relogin <username>` / `relogin_failed` (re-running the credential login flow, independent of any browser), or removing the account via `del_accounts` if it cannot be recovered. The skill SHALL clarify that `reset_locks` does NOT fix a logged-out account (it only clears rate-limit locks on still-valid sessions).

#### Scenario: Logged-out error from browser logout
- **WHEN** an account stored via cookie/grab starts failing with `XClIdAccountError: Logged-out X web app` after the operator logged out of or switched accounts in the source browser
- **THEN** the skill documents that the cookie is permanently invalidated and the recovery is to re-add the account via `add_accounts` + `login_accounts` (credential flow) rather than re-grabbing from the same browser state

#### Scenario: Logged-out error from IP flag
- **WHEN** accounts fail with ct0/Logged-out errors and a shared or flagged proxy is suspected
- **THEN** the skill documents changing the per-account proxy and running `relogin_failed`, per issue #268 production experience

#### Scenario: reset_locks does not fix logged-out sessions
- **WHEN** an operator runs `reset_locks` to recover a `XClIdAccountError` account
- **THEN** the skill documents that reset_locks only clears rate-limit locks on still-valid sessions and cannot revive a server-side-invalidated session; the operator must use `relogin` / `relogin_failed` instead
