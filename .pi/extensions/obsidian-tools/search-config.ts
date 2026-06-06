import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Types ───────────────────────────────────────────────────────

export interface ScopeConfig {
  path: string;
  weight: number;
  default: boolean;
}

export interface RankingConfig {
  filename_exact: number;
  filename_partial: number;
  match_position: {
    frontmatter_title: number;
    frontmatter_tags: number;
    frontmatter_other: number;
    heading: number;
    body: number;
  };
  content_density_max: number;
  file_size: {
    min_kb: number;
    max_kb: number;
  };
}

export interface TokenizationConfig {
  cn_min_chars: number;
  method: "intl_segmenter" | "jieba";
}

export interface RuntimeConfig {
  max_results: number;
  rg_timeout_ms: number;
  fff_timeout_ms: number;
  fff_page_size: number;
  snippet_context_lines: number;
  snippet_preview_chars: number;
}

export interface SearchConfig {
  scopes: ScopeConfig[];
  ranking: RankingConfig;
  tokenization: TokenizationConfig;
  runtime: RuntimeConfig;
}

// ── Minimal YAML Parser (focused on our schema) ─────────────────

function parseYaml(text: string): unknown {
  const lines = text.split("\n");
  let i = 0;

  function skipEmpty() {
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim() === "" || line.trim().startsWith("#")) {
        i++;
        continue;
      }
      break;
    }
  }

  function parseBlock(indent: number): unknown {
    skipEmpty();
    if (i >= lines.length) return undefined;

    const line = lines[i];
    const lineIndent = line.search(/\S/);
    if (lineIndent < indent) return undefined;

    const trimmed = line.trim();

    // Array
    if (trimmed.startsWith("- ")) {
      return parseArray(lineIndent);
    }

    // Object or scalar
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx !== -1 && lineIndent === indent) {
      return parseObject(indent);
    }

    // Scalar at expected indent
    if (lineIndent === indent) {
      i++;
      return parseScalar(trimmed);
    }

    return undefined;
  }

  function parseArray(itemIndent: number): unknown[] {
    const arr: unknown[] = [];
    while (i < lines.length) {
      skipEmpty();
      if (i >= lines.length) break;

      const line = lines[i];
      const li = line.search(/\S/);
      if (li < itemIndent) break;
      if (li > itemIndent) { i++; continue; }

      const lt = line.trim();
      if (!lt.startsWith("- ")) break;
      i++;

      const itemContent = lt.slice(2).trim();
      if (!itemContent) {
        const child = parseBlock(itemIndent + 2);
        arr.push(child ?? {});
      } else if (itemContent.includes(": ")) {
        const obj: Record<string, unknown> = {};
        const [k, v] = itemContent.split(/: (.+)/);
        obj[k.trim()] = parseScalar(v.trim());

        const childIndent = itemIndent + 2;
        while (i < lines.length) {
          const nl = lines[i];
          const ni = nl.search(/\S/);
          if (ni < childIndent) break;
          const nlt = nl.trim();
          if (nlt === "" || nlt.startsWith("#")) { i++; continue; }
          const ci = nlt.indexOf(":");
          if (ci === -1) break;
          const key = nlt.slice(0, ci).trim();
          const valStr = nlt.slice(ci + 1).trim();
          i++;
          obj[key] = valStr ? parseScalar(valStr) : parseBlock(ni + 2);
        }
        arr.push(obj);
      } else {
        arr.push(parseScalar(itemContent));
      }
    }
    return arr;
  }

  function parseObject(indent: number): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    while (i < lines.length) {
      skipEmpty();
      if (i >= lines.length) break;

      const line = lines[i];
      const li = line.search(/\S/);
      if (li < indent) break;
      if (li > indent) { i++; continue; }

      const trimmed = line.trim();
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) break;

      const key = trimmed.slice(0, colonIdx).trim();
      const valStr = trimmed.slice(colonIdx + 1).trim();
      i++;

      if (valStr) {
        obj[key] = parseScalar(valStr);
      } else {
        skipEmpty();
        if (i >= lines.length) {
          obj[key] = {};
          continue;
        }
        const nextLine = lines[i];
        const nextIndent = nextLine.search(/\S/);
        if (nextIndent <= indent) {
          obj[key] = {};
        } else {
          obj[key] = parseBlock(nextIndent);
        }
      }
    }
    return obj;
  }

  skipEmpty();
  if (i >= lines.length) return {};
  return parseBlock(0) ?? {};
}

function parseScalar(s: string): string | number | boolean {
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  // Unquote strings
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// ── Config Loading ──────────────────────────────────────────────

const CONFIG_FILENAME = "search-config.yaml";

export function loadSearchConfig(vaultPath: string): SearchConfig {
  const configPath = resolve(vaultPath, CONFIG_FILENAME);
  if (!existsSync(configPath)) {
    throw new Error(
      `search-config.yaml not found at vault root: ${configPath}\n` +
        "Run obsidian_search with init=true to generate a default config."
    );
  }

  let raw: string;
  try {
    raw = readFileSync(configPath, "utf-8");
  } catch (err) {
    throw new Error(
      `Failed to read search-config.yaml: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    throw new Error(
      `Failed to parse search-config.yaml: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return validateConfig(parsed, configPath);
}

function validateConfig(data: unknown, configPath: string): SearchConfig {
  if (!data || typeof data !== "object") {
    throw new Error(`search-config.yaml must be a YAML object: ${configPath}`);
  }

  const root = data as Record<string, unknown>;
  if (!root.search || typeof root.search !== "object") {
    throw new Error(`search-config.yaml missing top-level "search" key: ${configPath}`);
  }

  const search = root.search as Record<string, unknown>;
  const requiredKeys = ["scopes", "ranking", "tokenization", "runtime"];
  const missing = requiredKeys.filter((k) => !(k in search));
  if (missing.length > 0) {
    throw new Error(
      `search-config.yaml missing required keys under "search": ${missing.join(", ")} (${configPath})`
    );
  }

  const scopes = validateScopes(search.scopes, configPath);
  const ranking = validateRanking(search.ranking, configPath);
  const tokenization = validateTokenization(search.tokenization, configPath);
  const runtime = validateRuntime(search.runtime, configPath);

  return { scopes, ranking, tokenization, runtime };
}

function validateScopes(data: unknown, configPath: string): ScopeConfig[] {
  if (!Array.isArray(data)) {
    throw new Error(`search.scopes must be an array: ${configPath}`);
  }
  return data.map((item, i) => {
    if (!item || typeof item !== "object") {
      throw new Error(`search.scopes[${i}] must be an object: ${configPath}`);
    }
    const obj = item as Record<string, unknown>;
    if (typeof obj.path !== "string") {
      throw new Error(`search.scopes[${i}].path must be a string: ${configPath}`);
    }
    return {
      path: obj.path,
      weight: typeof obj.weight === "number" ? obj.weight : 1.0,
      default: obj.default === true,
    };
  });
}

function validateRanking(data: unknown, configPath: string): RankingConfig {
  if (!data || typeof data !== "object") {
    throw new Error(`search.ranking must be an object: ${configPath}`);
  }
  const obj = data as Record<string, unknown>;
  const mp = (obj.match_position || {}) as Record<string, unknown>;
  return {
    filename_exact: typeof obj.filename_exact === "number" ? obj.filename_exact : 3.0,
    filename_partial: typeof obj.filename_partial === "number" ? obj.filename_partial : 1.5,
    match_position: {
      frontmatter_title: typeof mp.frontmatter_title === "number" ? mp.frontmatter_title : 2.5,
      frontmatter_tags: typeof mp.frontmatter_tags === "number" ? mp.frontmatter_tags : 2.0,
      frontmatter_other: typeof mp.frontmatter_other === "number" ? mp.frontmatter_other : 1.5,
      heading: typeof mp.heading === "number" ? mp.heading : 1.8,
      body: typeof mp.body === "number" ? mp.body : 1.0,
    },
    content_density_max: typeof obj.content_density_max === "number" ? obj.content_density_max : 2.0,
    file_size: {
      min_kb: typeof obj.file_size === "object" && (obj.file_size as Record<string, unknown>).min_kb === "number"
        ? (obj.file_size as Record<string, unknown>).min_kb as number
        : 1,
      max_kb: typeof obj.file_size === "object" && (obj.file_size as Record<string, unknown>).max_kb === "number"
        ? (obj.file_size as Record<string, unknown>).max_kb as number
        : 500,
    },
  };
}

function validateTokenization(data: unknown, configPath: string): TokenizationConfig {
  if (!data || typeof data !== "object") {
    throw new Error(`search.tokenization must be an object: ${configPath}`);
  }
  const obj = data as Record<string, unknown>;
  return {
    cn_min_chars: typeof obj.cn_min_chars === "number" ? obj.cn_min_chars : 4,
    method: (obj.method === "intl_segmenter" ? "intl_segmenter" : "jieba") as "intl_segmenter" | "jieba",
  };
}

function validateRuntime(data: unknown, configPath: string): RuntimeConfig {
  if (!data || typeof data !== "object") {
    throw new Error(`search.runtime must be an object: ${configPath}`);
  }
  const obj = data as Record<string, unknown>;
  return {
    max_results: typeof obj.max_results === "number" ? obj.max_results : 20,
    rg_timeout_ms: typeof obj.rg_timeout_ms === "number" ? obj.rg_timeout_ms : 15000,
    snippet_context_lines: typeof obj.snippet_context_lines === "number" ? obj.snippet_context_lines : 2,
    snippet_preview_chars: typeof obj.snippet_preview_chars === "number" ? obj.snippet_preview_chars : 200,
    fff_timeout_ms: typeof obj.fff_timeout_ms === "number" ? obj.fff_timeout_ms : 5000,
    fff_page_size: typeof obj.fff_page_size === "number" ? obj.fff_page_size : 200,
  };
}

// ── Default Config Generator ────────────────────────────────────

export function generateDefaultConfig(): string {
  return `# Obsidian Search Configuration
# Generated by obsidian_search (init=true)
# Adjust weights and scopes to match your vault structure.
#
# YAML syntax support:
#   - Objects with key: value pairs (nesting uses 2-space indentation)
#   - Arrays with - item entries (inline key: value on same line)
#   - Scalars: strings, integers, floats, booleans (true/false)
#   - Comments: lines starting with #
#   - NOT supported: multi-line strings (|, >), anchors (&, *), complex mappings

search:
  scopes:
    - path: .
      weight: 2.5
      default: true
    - path: 10-wiki
      weight: 3.0
      default: true
    - path: 20-synthesis
      weight: 2.0
      default: true
    - path: directive
      weight: 2.5
      default: true
    - path: templates
      weight: 1.0
      default: true
    - path: docs
      weight: 1.0
      default: true
    - path: 30-raw
      weight: 0.3
      default: false

  ranking:
    filename_exact: 3.0
    filename_partial: 1.5
    match_position:
      frontmatter_title: 2.5
      frontmatter_tags: 2.0
      frontmatter_other: 1.5
      heading: 1.8
      body: 1.0
    content_density_max: 2.0
    file_size:
      min_kb: 1
      max_kb: 500

  tokenization:
    cn_min_chars: 4
    method: jieba

  runtime:
    max_results: 20
    rg_timeout_ms: 15000
    snippet_context_lines: 2
    snippet_preview_chars: 200
    fff_timeout_ms: 5000
    fff_page_size: 200
`;
}

// ── Search Init Handler ─────────────────────────────────────────

export function handleSearchInit(vaultPath: string, overwrite: boolean): string {
  const configPath = resolve(vaultPath, CONFIG_FILENAME);
  if (existsSync(configPath) && !overwrite) {
    throw new Error(
      `search-config.yaml already exists at ${configPath}\n` +
        "Use flags=['--overwrite'] to overwrite."
    );
  }
  const content = generateDefaultConfig();
  writeFileSync(configPath, content, "utf-8");
  return configPath;
}
