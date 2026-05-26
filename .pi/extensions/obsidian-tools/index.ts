import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { preloadKnownVaults, isInsideVault } from "./vault-resolver";
import { searchToolDefinition, resetSessionState } from "./search-tool";
import { cliToolDefinition } from "./raw-tool";

/**
 * Obsidian Tools Extension
 *
 * Registers obsidian_search (intelligent vault retrieval) and
 * obsidian_cli (command passthrough) tools, and preloads
 * known vaults on session start.
 */
export default function (pi: ExtensionAPI) {
  // Register tools immediately so they're available
  pi.registerTool(searchToolDefinition);
  pi.registerTool(cliToolDefinition);

  // Session start: preload known vaults when inside a vault
  pi.on("session_start", async () => {
    if (isInsideVault(process.cwd())) {
      await preloadKnownVaults();
    }
  });

  // Session shutdown: clean up session-scoped state
  pi.on("session_shutdown", () => {
    resetSessionState();
  });
}
