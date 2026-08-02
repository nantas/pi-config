# 完整命令面

所有命令统一带 `--db ~/.x-reach/accounts.db`，且 `--db` 在子命令**之前**。
输出为 JSON Lines（一行一个 JSON 对象）。`--limit` 是目标结果数，非页大小。

## 搜索

```bash
# 搜索推文（默认 Latest 标签）
twscrape --db ~/.x-reach/accounts.db search "openai lang:en" --limit=20

# Top 标签 / Media 标签：通过 Python API kv={"product":"Top"}，CLI 仅 Latest/默认
# 搜用户用 search 不支持；改用 user_by_login（已知 username）或 Python API search_user
```

### 搜索语法（X 原生，完整指南见 twitter-advanced-search）

```
openai                      关键词
"openai"                    精确短语
openai lang:zh              语言过滤（en/zh/ja...）
from:elonmusk               某用户发的
to:elonmusk                 回复某用户
@elonmusk                   提及某用户
since:2026-01-01            起始日期
until:2026-02-01            截止日期
min_faves:100               最少点赞
min_retweets:50             最少转推
-filter:retweets            排除转推
$AAPL                       $话题符号
#AI                         #标签
```

## 单条推文

```bash
twscrape --db ~/.x-reach/accounts.db tweet_details TWEET_ID          # 详情
twscrape --db ~/.x-reach/accounts.db tweet_replies TWEET_ID --limit=20   # 回复
twscrape --db ~/.x-reach/accounts.db tweet_thread TWEET_ID --limit=20    # 同主题串
twscrape --db ~/.x-reach/accounts.db retweeters TWEET_ID --limit=20      # 转推者
```

## 用户

```bash
twscrape --db ~/.x-reach/accounts.db user_by_login USERNAME   # 按 username 查资料
twscrape --db ~/.x-reach/accounts.db user_about USERNAME      # 账号 about
twscrape --db ~/.x-reach/accounts.db user_tweets USER_ID --limit=20           # 时间线（无回复）
twscrape --db ~/.x-reach/accounts.db user_tweets_and_replies USER_ID --limit=20  # 时间线含回复
twscrape --db ~/.x-reach/accounts.db user_media USER_ID --limit=20            # 媒体推文
```

> ⚠️ `user_tweets` / `user_tweets_and_replies` 受 X 限制，**最多约 3200 条**。
> `USER_ID` 是数字 ID，非 username。可先用 `user_by_login` 取 id。

## 关注关系（谨慎，高频易封号）

```bash
twscrape --db ~/.x-reach/accounts.db following USER_ID --limit=20          # 关注的人
twscrape --db ~/.x-reach/accounts.db followers USER_ID --limit=20          # 粉丝
twscrape --db ~/.x-reach/accounts.db verified_followers USER_ID --limit=20 # 认证粉丝
twscrape --db ~/.x-reach/accounts.db subscriptions USER_ID --limit=20      # 订阅
```

> ⚠️ followers/following 在 VPS/数据中心 IP 上频繁调用有**封号风险**。住宅代理或本地环境优先。

## List

```bash
twscrape --db ~/.x-reach/accounts.db list_timeline LIST_ID --limit=20   # List 推文流
twscrape --db ~/.x-reach/accounts.db list_members LIST_ID --limit=20    # List 成员
```

## Community

```bash
twscrape --db ~/.x-reach/accounts.db community_info COMMUNITY_ID               # 资讯
twscrape --db ~/.x-reach/accounts.db community_members COMMUNITY_ID --limit=20
twscrape --db ~/.x-reach/accounts.db community_moderators COMMUNITY_ID --limit=20
twscrape --db ~/.x-reach/accounts.db community_tweets COMMUNITY_ID --limit=20
```

## Trends

```bash
twscrape --db ~/.x-reach/accounts.db trends news           # 分类：news / sport / entertainment
```

## 输出格式

- **JSON Lines**：一行一个 JSON 对象，agent 直接 `jq`/消费。
- **`--raw`**：打印原始响应（调试端点漂移时用）。
- 落盘建议：`> /tmp/x-reach-<task>.jsonl`。

```bash
twscrape --db ~/.x-reach/accounts.db search "openai lang:en" --limit=20 > /tmp/x-openai.jsonl
twscrape --db ~/.x-reach/accounts.db search "openai" --limit=5 --raw   # 原始响应
```

### 常用字段（Tweet 对象）

`id`, `user.username`, `rawContent`, `createdAt`, `lang`, `likeCount`, `retweetCount`,
`replyCount`, `quoteCount`, `url`, `media`（含 photos/videos）, `quotedTweet`, `inReplyTo`。

## 独立账号池（隔离场景）

需要隔离的账号池时用独立 db 文件：

```bash
twscrape --db ~/.x-reach/research.db search "python lang:en" --limit=100
```
