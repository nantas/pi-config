# Manifest-Driven Settings Generation

`~/.pi/agent/settings.json` 由 `.pi/capabilities.yaml` 直接生成，而非从仓库 `settings.json` 与白名单取交集。同步脚本通过 Python3+PyYAML 从 manifest 生成 JSON，而非手动解析 YAML 行。选择单一来源（manifest）而非双来源（manifest + settings.json）是为了消除两者不一致的可能性。
