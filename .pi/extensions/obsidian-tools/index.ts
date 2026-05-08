import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { preloadKnownVaults, isInsideVault } from "./vault-resolver";
import { searchToolDefinition } from "./search-tool";
import { cliToolDefinition } from "./raw-tool";

const _key = "__pi_ext_obsidian_tools_loaded";

/**
 * Obsidian Tools Extension
 *
 * Registers obsidian_search (intelligent vault retrieval) and
 * obsidian_cli (command passthrough) tools, and preloads
 * known vaults on session start.
 */
export default function (pi: ExtensionAPI) {
  // Global dedup marker — prevent double registration on hot reload
  if ((globalThis as any)[_key]) return;
  (globalThis as any)[_key] = true;

  pi.on("session_shutdown", () => {
    delete (globalThis as any)[_key];
  });

  // Session start: preload known vaults only when inside a vault
  pi.on("session_start", async () => {
    if (isInsideVault(process.cwd())) {
      await preloadKnownVaults();
    }
  });

  // Register tools
  pi.registerTool(searchToolDefinition);
  pi.registerTool(cliToolDefinition);
}
