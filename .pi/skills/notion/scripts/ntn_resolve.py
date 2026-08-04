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


def die(message, code=1):
    """Print JSON error to stderr and exit."""
    print(json.dumps({"error": message}), file=sys.stderr)
    sys.exit(code)


def load_set_arg(raw):
    """Parse --set value: inline JSON object or @file.json → dict."""
    if raw is None:
        die("--set is required")
    try:
        if isinstance(raw, str) and raw.startswith("@"):
            path = raw[1:]
            if not path:
                die("empty @file path for --set")
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        else:
            data = json.loads(raw)
    except FileNotFoundError:
        die(f"set file not found: {raw[1:] if isinstance(raw, str) and raw.startswith('@') else raw}")
    except json.JSONDecodeError as e:
        die(f"invalid JSON for --set: {e}")
    except OSError as e:
        die(f"failed to read --set: {e}")

    if not isinstance(data, dict):
        die("--set must be a JSON object")
    return data


def build_property_value(prop_schema, value):
    """Convert a plain value to Notion API property format."""
    if not prop_schema:
        return {"rich_text": [{"text": {"content": str(value)}}]}

    ptype = prop_schema.get("type", "")

    if ptype == "title":
        return {"title": [{"text": {"content": str(value)}}]}
    if ptype == "rich_text":
        return {"rich_text": [{"text": {"content": str(value)}}]}
    if ptype == "select":
        return {"select": {"name": str(value)}}
    if ptype == "multi_select":
        if isinstance(value, str):
            value = [v.strip() for v in value.split(",")]
        return {"multi_select": [{"name": v} for v in value]}
    if ptype == "status":
        return {"status": {"name": str(value)}}
    if ptype == "number":
        if isinstance(value, str):
            value = float(value) if "." in value else int(value)
        return {"number": value}
    if ptype == "checkbox":
        if isinstance(value, str):
            return {"checkbox": value.lower() == "true"}
        return {"checkbox": bool(value)}
    if ptype == "date":
        if isinstance(value, str):
            return {"date": {"start": value}}
        return {"date": value}
    if ptype == "url":
        return {"url": str(value)}
    if ptype == "email":
        return {"email": str(value)}
    if ptype == "phone_number":
        return {"phone_number": str(value)}

    return {"rich_text": [{"text": {"content": str(value)}}]}


def translate_properties(updates, schema):
    """Map plain {name: value} dict to Notion API properties using schema."""
    properties = {}
    for name, value in updates.items():
        prop_schema = schema.get(name) if schema else None
        properties[name] = build_property_value(prop_schema, value)
    return properties


def get_data_source_schema(data_source_id):
    """Fetch properties schema for a data_source id. Returns {} on failure."""
    ds_id = data_source_id.replace("-", "")
    try:
        ds = ntn_api(f"v1/data_sources/{ds_id}")
        return ds.get("properties", {}) or {}
    except SystemExit:
        return {}


def resolve_data_source(target):
    """Resolve URL/ID to full data_source object (database → first data_source)."""
    if target.startswith("http"):
        raw_id, _ = extract_id_from_url(target)
    else:
        raw_id = target.replace("-", "").lower()

    if not raw_id:
        return None

    data = ntn_api(f"v1/data_sources/{raw_id}", silent=True)
    if data is not None:
        return data

    db = ntn_api(f"v1/databases/{raw_id}", silent=True)
    if db is not None:
        ds_list = db.get("data_sources", [])
        if ds_list:
            return ntn_api(f"v1/data_sources/{ds_list[0]['id'].replace('-', '')}", silent=True)
    return None


def get_page_schema(page_id):
    """Get parent data_source property schema for a page. Returns {} on failure."""
    try:
        page = ntn_api(f"v1/pages/{page_id}")
        parent = page.get("parent", {})
        if parent.get("type") == "data_source_id":
            return get_data_source_schema(parent["data_source_id"])
        if parent.get("type") == "database_id":
            db_id = parent["database_id"].replace("-", "")
            db = ntn_api(f"v1/databases/{db_id}")
            ds_list = db.get("data_sources", [])
            if ds_list:
                return get_data_source_schema(ds_list[0]["id"])
    except SystemExit:
        pass
    return {}


if __name__ == "__main__":
    # Minimal self-check for property translation (no network).
    assert build_property_value({"type": "title"}, "k") == {
        "title": [{"text": {"content": "k"}}]
    }
    assert build_property_value({"type": "select"}, "UI") == {"select": {"name": "UI"}}
    assert build_property_value({"type": "checkbox"}, True) == {"checkbox": True}
    assert build_property_value({"type": "checkbox"}, "true") == {"checkbox": True}
    tmp = os.path.join(os.path.dirname(__file__), "._set_probe.json")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({"a": 1}, f)
    try:
        assert load_set_arg(json.dumps({"b": 2})) == {"b": 2}
        assert load_set_arg("@" + tmp) == {"a": 1}
        assert translate_properties({"t": "x"}, {"t": {"type": "title"}})["t"]["title"]
    finally:
        os.remove(tmp)
    print(json.dumps({"ok": True, "checks": ["title", "select", "checkbox", "load_set_arg"]}))
