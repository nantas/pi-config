# Specification Delta

## Capability 对齐（已确认）

- Capability: `x-reach-skill`
- 来源: `proposal.md` / grilling 阶段方案共识 + 用户「请按照方案创建 change」指令
- 变更类型: `new`
- 用户确认摘要: grilling 达成四项核心决策——①架构=文档 skill + x-reach-init.sh；②cookie 永不同步、`~/.x-reach/accounts.db` 本地化；③账号池=2-3 号轻量池；④与 agent-reach 按场景分工（不动 agent-reach 文档）。ponytail 默认（pipx 安装、只读、命令模板带 `--db`）用户未否决。

## 规范真源声明

- 本文件是 `x-reach-skill` 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面（CONTEXT.md、capabilities.yaml、SKILL.md）回写不得替代本文件

## ADDED Requirements

### Requirement: Skill Shall Provide Twscrape-Driven Read-Only X Retrieval
The x-reach skill SHALL drive `twscrape` CLI to perform read-only X/Twitter retrieval (search, tweet details/replies/thread, user profile/timeline, lists, communities, trends) and emit JSON Lines output consumable by AI agents. The skill SHALL NOT perform write operations (post/like/follow).

#### Scenario: Agent retrieves matching tweets
- **WHEN** an agent runs a search against the configured account pool
- **THEN** the skill invokes `twscrape --db ~/.x-reach/accounts.db search "<query>" --limit=N` and returns one parsed JSON document per line

#### Scenario: Agent reads a single tweet with replies
- **WHEN** an agent needs a tweet and its discussion
- **THEN** the skill invokes `twscrape --db ~/.x-reach/accounts.db tweet_replies <tweet_id> --limit=N` (and/or `tweet_details` / `tweet_thread`) returning JSONL

#### Scenario: Write operations are out of scope
- **WHEN** an agent considers posting, liking, or following via x-reach
- **THEN** the skill documents that only read paths exist and points the agent elsewhere for write operations

### Requirement: Account Pool Shall Persist In A Fixed Local Database
The skill SHALL pin the twscrape account database to `~/.x-reach/accounts.db`. Every documented twscrape invocation SHALL pass `--db ~/.x-reach/accounts.db` so no stray `accounts.db` is created in the working directory.

#### Scenario: Database location is deterministic
- **WHEN** an agent or operator runs any documented x-reach command
- **THEN** the command includes `--db ~/.x-reach/accounts.db` and twscrape reads/writes only that path

#### Scenario: No stray database in working directory
- **WHEN** a command is run without the `--db` flag (operator error)
- **THEN** twscrape creates an empty `accounts.db` in cwd and errors with no accounts — a safe failure that leaks no credentials, documented as a known sharp edge

### Requirement: Credentials Shall Never Leave The Local Machine
The skill SHALL treat X cookies (`auth_token`, `ct0`) and `accounts.db` as machine-local secrets. The repository SHALL contain only `accounts.txt.example` placeholders; the real `accounts.db` and any cookie material SHALL reside exclusively under `~/.x-reach/` and MUST NOT be committed to the pi-config repository or synced via `sync-pi-agent.sh`.

#### Scenario: Repository carries no real credentials
- **WHEN** the pi-config repository is inspected or synced globally
- **THEN** no real `auth_token`/`ct0`/`accounts.db` is present; only `scripts/accounts.txt.example` with placeholder values exists

#### Scenario: Cross-machine reproduction re-imports cookies locally
- **WHEN** the skill is synced to a new machine
- **THEN** the operator runs `x-reach-init.sh` to rebuild the environment and manually re-imports their own cookies into that machine's `~/.x-reach/accounts.db`; credentials are never transported via the repo

### Requirement: Init Script Shall Reproduce The Environment Cross-Machine
The skill SHALL ship `scripts/x-reach-init.sh` that, on a fresh machine, ensures `pipx` is installed, installs `twscrape` via pipx, creates `~/.x-reach/`, verifies the fixed database path exists, runs a doctor/self-check, and guides the operator through importing accounts (cookie mode for headless/SSH environments).

#### Scenario: Fresh machine bootstrap
- **WHEN** the operator runs `x-reach-init.sh` on a machine without twscrape
- **THEN** the script installs pipx if missing, installs twscrape, creates `~/.x-reach/`, and prints the cookie-import commands to run next

#### Scenario: Headless environment uses cookie auth
- **WHEN** the init runs in an SSH/Docker/no-GUI environment
- **THEN** it recommends the cookie path (`twscrape add_cookie <name> "auth_token=...; ct0=..."`) rather than browser-extraction or interactive login flows that need a GUI

#### Scenario: Idempotent re-run
- **WHEN** the operator re-runs `x-reach-init.sh` on an already-configured machine
- **THEN** it does not clobber the existing `~/.x-reach/accounts.db` and reports current account pool status

### Requirement: Skill Shall Document Account Pool Operation For Rate-Limit Resilience
The skill SHALL document a 2-3 account light pool as the recommended default, and explain that twscrape rotates accounts when one is rate-limited, persisting sessions in SQLite so restarts do not lose login state.

#### Scenario: Light pool is the documented default
- **WHEN** an operator reads the setup guide
- **THEN** the guide recommends adding 2-3 cookie accounts and shows `twscrape --db ~/.x-reach/accounts.db add_cookie <name> "..."` for each, plus `accounts` / `stats` / `reset_locks` maintenance commands

#### Scenario: Rate-limit recovery is automatic
- **WHEN** one account hits a per-endpoint rate limit during retrieval
- **THEN** twscrape locks that account for the operation until reset and retries with another active account; the skill documents this as the primary stability mechanism

### Requirement: Skill Shall Manage Expectations On Graphql Endpoint Drift
The skill SHALL document that twscrape depends on X's GraphQL endpoints, so endpoint changes by X can cause temporary 404/failures recoverable only by twscrape upstream updates (maintainer is active), and SHALL provide a fallback chain (retry → upgrade twscrape → fall back to stable commands or agent-reach OpenCLI).

#### Scenario: Endpoint drift failure
- **WHEN** X changes a GraphQL endpoint and a search returns errors
- **THEN** the documented retry chain is: retry once → `pipx upgrade twscrape` → fall back to stable commands (`user_tweets`/`tweet_details`) → fall back to `agent-reach` OpenCLI twitter backend

#### Scenario: Maintenance commands for degraded pool
- **WHEN** accounts accumulate locks or login failures
- **THEN** the skill documents `twscrape --db ~/.x-reach/accounts.db relogin_failed`, `reset_locks`, and `delete_inactive` to restore pool health

### Requirement: Skill Shall Differentiate From Agent-Reach By Scenario
The skill's SKILL.md description SHALL position x-reach for stable/dedicated/batch X retrieval, and SHALL NOT compete with agent-reach's X triggers for general multi-platform research. The skill SHALL NOT modify any file under `.pi/skills/agent-reach/`.

#### Scenario: Scenario-based routing
- **WHEN** a task needs stable or dedicated X/Twitter retrieval (or the agent-reach twitter backend is degraded)
- **THEN** the agent selects x-reach; for general multi-platform research the agent still uses agent-reach

#### Scenario: Agent-reach files are untouched
- **WHEN** the change is implemented
- **THEN** no file under `.pi/skills/agent-reach/` is modified; coexistence is via description wording only

### Requirement: Skill Shall Be Registered In The Capability Manifest
The skill SHALL be registered in `.pi/capabilities.yaml` under `global.skills` so it is included in global sync, applying the existing `capability-manifest` 「Global tier declares skills」requirement.

#### Scenario: Manifest registration
- **WHEN** the change is applied
- **THEN** `global.skills` in `.pi/capabilities.yaml` contains an `x-reach` entry, and `sync-pi-agent.sh` copies the skill docs + init script (never credentials) to `~/.pi/agent/skills/x-reach/`

### Requirement: Skill MAY Offer A Desktop Cookie-Grab Convenience With Manual Fallback
The skill MAY ship an optional `scripts/x-reach-grab-cookie.sh` convenience that extracts the currently-logged-in X cookie from the local Chrome via `browser_cookie3` and adds it to the pool. The manual cookie path (DevTools copy → `add_cookie`) SHALL remain the documented primary path for all environments. The grab convenience SHALL detect failure (no browser / Chrome encryption drift / Keychain denied / x.com not logged in) and fall back to the manual instructions.

#### Scenario: Desktop first-account convenience
- **WHEN** an operator on a desktop machine with Chrome logged into x.com runs `x-reach-grab-cookie.sh <name>`
- **THEN** the script reads auth_token+ct0 from Chrome and adds the account to `~/.x-reach/accounts.db` without manual copy

#### Scenario: Grab fails and falls back to manual
- **WHEN** the grab script cannot read Chrome cookies (headless/SSH, encryption drift, or x.com not logged in)
- **THEN** the script prints the manual cookie path instructions and exits non-zero, never leaving the pool in a broken state

#### Scenario: Multi-account requires browser re-login
- **WHEN** an operator wants to add a second account via grab
- **THEN** the skill documents that they must switch/re-login x.com in the browser first, since grab only extracts the currently-logged-in account

#### Scenario: Manual path remains primary
- **WHEN** any environment needs to add an account
- **THEN** the SKILL.md and setup.md present the manual DevTools→add_cookie path as the default, with the grab script as an optional desktop convenience
