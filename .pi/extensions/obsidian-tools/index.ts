import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { searchToolDefinition, resetSessionState } from "./search-tool";
import { rawToolDefinition } from "./raw-tool";

/**
 * Obsidian Tools Extension
 *
 * Registers obsidian_search for intelligent vault retrieval using FFF backend (rg fallback).
 * Vault detection is lazy — triggered on first tool invocation via resolveVault().
 */
export default function (pi: ExtensionAPI) {
  // Register search tool
  pi.registerTool(searchToolDefinition);

  // Register CLI passthrough tool
  pi.registerTool(rawToolDefinition);

  // Session shutdown: clean up session-scoped state
  pi.on("session_shutdown", () => {
    resetSessionState();
  });
}
