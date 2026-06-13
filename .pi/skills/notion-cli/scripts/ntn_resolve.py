"""Shared library for ntn-* scripts."""
import json
import os
import re
import subprocess
import sys


def ntn_api(*args, stdin_data=None, silent=False):
    """Call ntn api and return parsed JSON. Exits on error.

    Args:
        silent: If True, suppress stderr output on failure (for fallback chains).
                Returns None instead of sys.exit on error.
    """
    cmd = ["ntn", "api"] + list(args)
    env = {k: v for k, v in os.environ.items() if k != "NOTION_API_TOKEN"}
    result = subprocess.run(cmd, capture_output=True, text=True, env=env, input=stdin_data)
    if result.returncode != 0:
        if silent:
            return None
        err_msg = result.stderr.strip() or result.stdout.strip()
        print(json.dumps({"error": err_msg}), file=sys.stderr)
        sys.exit(1)
    return json.loads(result.stdout)


def extract_id_from_url(url):
    """Extract primary ID and optional view_id from a Notion URL."""
    cleaned = url.replace('-', '').lower()
    if re.match(r'^[0-9a-f]{32}$', cleaned):
        return cleaned, None
    m = re.match(
        r'https?://app\.notion\.com/(?:p/)?(?:[^/]+/)?([0-9a-f-]{32,36})(?:\?.*)?$',
        url, re.I
    )
    if not m:
        return None, None
    raw_id = m.group(1).replace('-', '').lower()
    view_match = re.search(r'[?&]v=([0-9a-f-]+)', url, re.I)
    view_id = view_match.group(1).replace('-', '').lower() if view_match else None
    return raw_id, view_id


def resolve_id(raw_id, silent=False):
    """Try pages → databases → data_sources, return first hit.

    Uses silent mode for fallback chain to avoid stderr pollution.
    """
    raw_id = raw_id.replace('-', '').lower()

    # Try pages
    data = ntn_api(f"v1/pages/{raw_id}", silent=silent)
    if data is not None:
        title = ""
        for v in data.get("properties", {}).values():
            if isinstance(v, dict) and v.get("title"):
                title = v["title"][0]["plain_text"] if v["title"] else ""
                break
        return {"type": "page", "id": data["id"], "title": title, "url": data.get("url", "")}

    # Try databases
    data = ntn_api(f"v1/databases/{raw_id}", silent=silent)
    if data is not None:
        title = ""
        tp = data.get("title", [])
        if tp:
            title = tp[0].get("plain_text", "")
        return {
            "type": "database", "id": data["id"], "title": title,
            "url": data.get("url", ""), "data_sources": data.get("data_sources", []),
        }

    # Try data_sources
    data = ntn_api(f"v1/data_sources/{raw_id}", silent=silent)
    if data is not None:
        title = ""
        tp = data.get("title", [])
        if tp:
            title = tp[0].get("plain_text", "")
        return {
            "type": "data_source", "id": data["id"], "title": title,
            "parent": data.get("parent", {}),
            "properties": list(data.get("properties", {}).keys()),
        }

    return None
