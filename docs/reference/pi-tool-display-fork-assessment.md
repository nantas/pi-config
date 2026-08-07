# pi-tool-display Fork Assessment

> Last reviewed: 2026-08-07
> Fork status: **active — still required**

## Context

`pi-tool-display` is forked from [MasuRii/pi-tool-display](https://github.com/MasuRii/pi-tool-display) to [nantas/pi-tool-display](https://github.com/nantas/pi-tool-display). The fork release `v0.3.7` carries two fixes on top of upstream v0.3.6:

```
bd352d4 fix: recognize MCP Direct Tools via label field
c192370 fix(search): yield grep and find to pi-fff override
```

Registered in `forks/manifest.yaml` with status `active`.

## Why the Fork Exists

pi-mcp-adapter registers MCP Direct Tools with a `label` field set to `"MCP: <toolName>"` format:

```typescript
// pi-mcp-adapter index.ts:70-78
pi.registerTool({
  name: spec.prefixedName,              // e.g. "xcodebuild_list_sims"
  label: `MCP: ${spec.originalName}`,   // e.g. "MCP: list_sims"
  ...
});
```

Upstream pi-tool-display v0.3.6's `isMcpToolCandidate()` only checked `name` and `description` fields — not `label`. As a result, Direct Tools were not recognized as MCP tools and skipped MCP-specific rendering rules (collapsed output, `mcpOutputMode` settings, etc.).

## Fork Changes

Two files modified:

1. **`src/tool-metadata.ts`** — Added `label` field check in `isMcpToolCandidate()`:
   ```typescript
   const label = getTextField(tool, "label");
   if (typeof label === "string" && MCP_DESCRIPTION_PATTERN.test(label)) {
     return true;
   }
   ```

2. **`src/tool-overrides.ts`** — Changed `formatMcpCallLine()` to handle `"MCP:"` colon format:
   ```typescript
   // Before: only handled "MCP " (space)
   toolLabel.startsWith("MCP ") ? toolLabel.slice("MCP ".length) : toolLabel
   // After: handles both "MCP:" and "MCP "
   toolLabel.replace(/^MCP[:\s]+/, "") || toolLabel
   ```

3. **`src/capabilities.ts` and `src/index.ts`** — Detect the effective pi-fff mode before tool registration. When CLI flag or `PI_FFF_MODE` resolves to `override`, the effective tool-display config releases `grep` and `find` ownership so pi-fff can register those standard names without a cross-extension conflict. Other tool-display overrides remain active.

## Upstream v0.4.2 Comparison

Upstream v0.4.2 significantly expanded MCP detection in `isMcpToolCandidate()`:

| Detection rule | Fork (v0.3.7) | Upstream v0.4.2 |
|---|---|---|
| `name === "mcp"` | ✅ | ✅ |
| `description` matches `/\bmcp\b/i` | ✅ | ✅ |
| **`label` matches `/\bmcp\b/i`** | **✅** | **❌** |
| `name.includes(":")` | ❌ | ✅ |
| `/^mcp[_-]/i.test(name)` | ❌ | ✅ |
| `/_mcp$/i.test(name)` | ❌ | ✅ |
| `/^ctx_/i.test(name)` | ❌ | ✅ |
| params contain server fields | ❌ | ✅ |

However, **none of the new upstream rules cover Direct Tools registered by pi-mcp-adapter**, because:

- `name` is the prefixed form (e.g. `xcodebuild_list_sims`) — no colons, no `mcp` prefix
- `description` is the MCP tool's original description — may or may not contain "mcp"
- `label` is `"MCP: list_sims"` — **only the fork checks this field**

### formatMcpCallLine Relevance

The fork's `formatMcpCallLine` fix is **not actually needed for Direct Tools**. Direct Tools have their own `renderCall` handler (`createMcpDirectToolCallRenderer` in pi-mcp-adapter), which bypasses `formatMcpCallLine` entirely. The fix only applies to the `mcp` proxy tool, where the label is simply `"MCP"` without a colon suffix.

## Conclusion

The fork is **still required** for two active behaviors: the `label` field check in `isMcpToolCandidate()`, and the pi-fff override ownership guard that prevents duplicate `grep`/`find` registrations. The `formatMcpCallLine` change remains harmless but irrelevant for Direct Tools.

## Recommended Path Forward

1. **Short term** — Keep `v0.3.7`; both the label check and pi-fff ownership guard remain necessary.
2. **Medium term** — Rebase onto upstream v0.4.2+ to benefit from performance improvements and other fixes, retaining both active behaviors.
3. **Long term** — Submit both fixes upstream. Once merged, the fork can be retired (status → `upstreamed`).

## References

- Fork manifest: `forks/manifest.yaml`
- Upstream: `https://github.com/MasuRii/pi-tool-display`
- Fork: `https://github.com/nantas/pi-tool-display`
- pi-mcp-adapter: `npm:pi-mcp-adapter` (v2.9.0)
- Capabilities declaration: `git:github.com/nantas/pi-tool-display` in `.pi/capabilities.yaml`
