#!/usr/bin/env bash
# x-reach-init.sh — 在新机器上复现 x-reach (twscrape) 检索环境。
#
# 做什么：确保 pipx → 装 twscrape → 建 ~/.x-reach/ → 自检 → 打印 cookie 导入命令。
# 不做什么：不导入真实 cookie（cookie 本机敏感，每台机各自重导，永不进仓）；
#           不覆盖既有 ~/.x-reach/accounts.db（幂等）。
#
# 用法：bash .pi/skills/x-reach/scripts/x-reach-init.sh
set -euo pipefail

XREACH_HOME="${HOME}/.x-reach"
DB_PATH="${XREACH_HOME}/accounts.db"

log()  { printf '\033[1;34m[x-reach]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[x-reach]\033[0m %s\n' "$*" >&2; }
ok()   { printf '\033[1;32m[x-reach]\033[0m %s\n' "$*"; }

need_cmd() { command -v "$1" >/dev/null 2>&1; }

# --- 1. python3 前置 ----------------------------------------------------------
if ! need_cmd python3; then
  warn "未找到 python3。请先安装 Python 3.10+（macOS: brew install python）。"
  exit 1
fi

# --- 2. pipx ------------------------------------------------------------------
if ! need_cmd pipx; then
  log "安装 pipx ..."
  if need_cmd brew; then
    brew install pipx
  else
    python3 -m pip install --user pipx
  fi
  # ensurepath 只是把 ~/.local/bin 加进 PATH 的提示，不强制 source
  pipx ensurepath >/dev/null 2>&1 || true
  export PATH="${HOME}/.local/bin:${PATH}"
fi
ok "pipx 就绪"

# --- 3. twscrape --------------------------------------------------------------
if ! need_cmd twscrape; then
  log "安装 twscrape（可选 TLS 指纹后端：pipx install 'twscrape[curl]'）..."
  pipx install twscrape
  export PATH="${HOME}/.local/bin:${PATH}"
fi
ok "twscrape 就绪: $(twscrape version 2>/dev/null || echo 'installed')"

# --- 4. ~/.x-reach/ + db 路径 -------------------------------------------------
mkdir -p "${XREACH_HOME}"
chmod 700 "${XREACH_HOME}"
ok "目录就绪: ${XREACH_HOME} (权限 700)"

# --- 5. 自检：账号池状态 ------------------------------------------------------
log "当前账号池状态（${DB_PATH}）："
if twscrape --db "${DB_PATH}" accounts 2>/dev/null; then
  ACCT_COUNT=$(twscrape --db "${DB_PATH}" accounts 2>/dev/null | grep -c 'True' || true)
  if [ "${ACCT_COUNT}" -ge 1 ]; then
    ok "检测到已登录账号。环境可用，可直接检索。"
    echo ""
    log "快速自检（拉一个公开用户验证 JSONL 输出）："
    echo "    twscrape --db ${DB_PATH} user_by_login elonmusk"
  else
    warn "账号池为空或无已登录账号。请按下方步骤导入 cookie。"
    echo ""
    print_import_guide=1
  fi
else
  warn "数据库尚未初始化（无账号）。请按下方步骤导入 cookie。"
  print_import_guide=1
fi

# --- 6. 引导 cookie 导入（headless 友好）--------------------------------------
if [ "${print_import_guide:-0}" = "1" ]; then
  cat <<EOF

──────────────────────── 下一步：导入 X cookie ────────────────────────
推荐 cookie 模式（无头/SSH/Docker 可用，无需 GUI 登录流程）：

  # 浏览器登录 x.com → DevTools(F12) → Application → Cookies
  # 复制 auth_token 和 ct0 两个值，然后：
  twscrape --db ${DB_PATH} add_cookie myacc "auth_token=粘贴值; ct0=粘贴值"

  # 单号已足够务实。多账号需求走账密 login_accounts（见 setup.md「多账号升级」），
  # 不要靠浏览器换号抓取（实测会触发服务端失效）。

  # 验证：
  twscrape --db ${DB_PATH} accounts
  twscrape --db ${DB_PATH} user_by_login elonmusk    # 拉一个公开用户

⚠️  抓完别动浏览器：不登出、不在 X 切换器切号，否则 session 服务端失效。
⚠️  安全红线：
  - ${DB_PATH} 含明文 cookie = 账号登录态，仅限本机，永不进 pi-config 仓库。
  - 中国大陆 IP 访问 x.com 需代理：export TWS_PROXY=socks5://user:pass@host:port
─────────────────────────────────────────────────────────────────────
EOF
fi

ok "x-reach 环境初始化完成。详见 .pi/skills/x-reach/SKILL.md。"
