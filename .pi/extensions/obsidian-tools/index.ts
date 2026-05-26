import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { preloadKnownVaults, isInsideVault } from "./vault-resolver";
import { searchToolDefinition, resetSessionState } from "./search-tool";

/**
 * Obsidian Tools Extension
 *
 * Registers obsidian_search for intelligent vault retrieval using rg backend.
 * Preloads known vaults on session start.
 */
export default function (pi: ExtensionAPI) {
  // Register search tool
  pi.registerTool(searchToolDefinition);

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
