#!/usr/bin/env bash
# x-reach-grab-cookie.sh — 桌面便利脚本：从 Chrome 自动提取当前登录的 x.com cookie，
# 并导入 twscrape 账号池。
#
# 定位：**仅首账号便利**。手贴仍是全环境通用的主推路径（见 SKILL.md / setup.md）。
#       多账号需求走账密 login_accounts，不要靠浏览器换号抓取（见下警告）。
#
# 用法：bash .pi/skills/x-reach/scripts/x-reach-grab-cookie.sh <账号名>
#   例：bash .../x-reach-grab-cookie.sh acc1
#
# ⚠️ 抓完**别动浏览器**：不登出、不在 X 切换器切到别的号。实测 Chrome x.com 域
#    auth_token/ct0 各只 1 份，换号会替换单槽 session 并触发服务端失效，导致 db 里
#    之前存的 cookie 快照报 XClIdAccountError: Logged-out。多号走账密，别换号抓。
# ⚠️ 首次运行会弹 macOS Keychain 授权框（请点「始终允许」），并自举 venv（~/.x-reach/grab-venv）。
# ⚠️ 无头/SSH 环境无浏览器，本脚本不可用 → 走手贴（见 setup.md）。
set -euo pipefail

XREACH_HOME="${HOME}/.x-reach"
DB_PATH="${XREACH_HOME}/accounts.db"
GRAB_VENV="${XREACH_HOME}/grab-venv"

log()  { printf '\033[1;34m[x-reach]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[x-reach]\033[0m %s\n' "$*" >&2; }
ok()   { printf '\033[1;32m[x-reach]\033[0m %s\n' "$*"; }

USERNAME="${1:-}"
if [ -z "${USERNAME}" ]; then
  warn "用法：$0 <账号名>   例：$0 acc1"
  exit 1
fi

# 确保 twscrape 可用（grab 依赖 add_cookie 子命令）
command -v twscrape >/dev/null 2>&1 || {
  warn "twscrape 未安装。先跑 x-reach-init.sh。"
  exit 1
}
mkdir -p "${XREACH_HOME}"

# --- 自举 browser_cookie3 venv（首次约 10s，之后秒开）-------------------------
if [ ! -d "${GRAB_VENV}" ]; then
  log "首次运行：创建隔离 venv 并装 browser_cookie3 ..."
  python3 -m venv "${GRAB_VENV}"
  "${GRAB_VENV}/bin/pip" install -q --upgrade pip >/dev/null 2>&1 || true
  "${GRAB_VENV}/bin/pip" install -q browser_cookie3
fi

# --- 提取 cookie ----------------------------------------------------------------
log "从 Chrome 读取 x.com cookie（如弹出 Keychain 授权框，请点「允许」）..."
COOKIE="$("${GRAB_VENV}/bin/python" - <<'PY' 2>/dev/null
import browser_cookie3, sys
try:
    cj = browser_cookie3.chrome(domain_name="x.com")
except Exception as e:
    print(f"ERR_READ:{type(e).__name__}:{str(e)[:120]}", file=sys.stderr); sys.exit(2)
found = {c.name: c.value for c in cj if c.name in ("auth_token", "ct0")}
if "auth_token" not in found or "ct0" not in found:
    print("ERR_NOLOGIN", file=sys.stderr); sys.exit(3)
print(f"auth_token={found['auth_token']}; ct0={found['ct0']}")
PY
)" || {
  warn "自动提取失败。可能原因：未在 Chrome 登录 x.com / Chrome 加密变更 / Keychain 被拒。"
  echo ""
  cat <<EOF
回退手贴路径（全环境通用）：
  1. 浏览器登录 x.com → DevTools(F12) → Application → Cookies → 复制 auth_token 和 ct0
  2. twscrape --db ${DB_PATH} add_cookie ${USERNAME} "auth_token=粘贴值; ct0=粘贴值"
EOF
  exit 1
}

# --- 导入账号池 ------------------------------------------------------------------
twscrape --db "${DB_PATH}" add_cookie "${USERNAME}" "${COOKIE}" >/dev/null 2>&1
ok "已导入账号「${USERNAME}」。当前账号池："
twscrape --db "${DB_PATH}" accounts 2>&1 | tail -n +2
echo ""
warn "⚠️ 抓完别动浏览器：不登出、不在 X 切换器切到别的号！"
echo "   实测 Chrome x.com 域 cookie 只 1 份，换号会触发服务端失效，让本 session 报"
echo "   XClIdAccountError: Logged-out。多账号需求走账密 login_accounts（见 setup.md）。"
echo ""
log "验证 cookie 是否真的工作（拉一个公开用户）："
echo "  twscrape --db ${DB_PATH} user_by_login elonmusk"
