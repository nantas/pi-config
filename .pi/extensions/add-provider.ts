import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

interface ProviderModelConfig {
	id: string;
	name: string;
	reasoning: boolean;
	input: ("text" | "image")[];
	cost: {
		input: number;
		output: number;
		cacheRead: number;
		cacheWrite: number;
	};
	contextWindow: number;
	maxTokens: number;
	api?: string;
}

interface ModelsJsonProvider {
	baseUrl: string;
	api: string;
	apiKey: string;
	models: ProviderModelConfig[];
}

interface ModelsJson {
	providers: Record<string, ModelsJsonProvider>;
}

function getModelsJsonPath(): string {
	return join(homedir(), ".pi", "agent", "models.json");
}

function readModelsJson(): ModelsJson {
	const path = getModelsJsonPath();
	try {
		const raw = readFileSync(path, "utf-8");
		return JSON.parse(raw) as ModelsJson;
	} catch {
		return { providers: {} };
	}
}

function writeModelsJson(data: ModelsJson): void {
	const path = getModelsJsonPath();
	writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export default function (pi: ExtensionAPI) {
	// Dedup: prevent duplicate registration when loaded from both global and local paths
	const _key = "__pi_ext_add_provider_loaded";
	if ((globalThis as any)[_key]) return;
	(globalThis as any)[_key] = true;

	// REQUIRED: clear flag on session end so session replacements work
	pi.on("session_shutdown", () => {
		delete (globalThis as any)[_key];
	});

	// /add-provider interactive command
	pi.registerCommand("add-provider", {
		description: "Add a custom OpenAI-compatible provider",
		handler: async (_args, ctx) => {
			try {
				// Step 1: Provider name
				const name = await ctx.ui.input("Provider name:", "my-provider");
				if (!name?.trim()) {
					ctx.ui.notify("Provider name is required", "error");
					return;
				}

				// Step 2: Base URL
				const baseUrl = await ctx.ui.input("Base URL:", "http://localhost:1234/v1");
				if (!baseUrl?.trim()) {
					ctx.ui.notify("Base URL is required", "error");
					return;
				}

				// Step 3: API key (optional — local providers like Ollama don't need one)
				const apiKey = (await ctx.ui.input("API key (optional, enter for local):", "")) || "";

				// Step 4: Discover models from /v1/models
				let models: ProviderModelConfig[] = [];
				let discovered = false;

				try {
					const headers: Record<string, string> = {};
					if (apiKey) {
						headers["Authorization"] = `Bearer ${apiKey}`;
					}
					const url = `${baseUrl.trim().replace(/\/$/, "")}/models`;
					const res = await fetch(url, { headers });
					if (res.ok) {
						const payload = (await res.json()) as {
							data?: Array<{ id: string; name?: string }>;
						};
						if (payload.data && payload.data.length > 0) {
							models = payload.data.map((m) => ({
								id: m.id,
								name: m.name || m.id,
								reasoning: false,
								input: ["text"] as ("text" | "image")[],
								cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
								contextWindow: 128000,
								maxTokens: 4096,
								api: "openai-completions",
							}));
							discovered = true;
							ctx.ui.notify(`Discovered ${models.length} model(s)`, "info");
						}
					}
				} catch {
					// Discovery failed — fall through to manual input
				}

				// Step 5: Fallback — ask for single model ID
				if (!discovered) {
					const fallbackId = await ctx.ui.input(
						"Could not auto-discover models. Enter a model ID:",
						"gpt-4",
					);
					if (!fallbackId?.trim()) {
						ctx.ui.notify("A model ID is required to register the provider", "error");
						return;
					}
					models = [
						{
							id: fallbackId.trim(),
							name: fallbackId.trim(),
							reasoning: false,
							input: ["text"] as ("text" | "image")[],
							cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
							contextWindow: 128000,
							maxTokens: 4096,
							api: "openai-completions",
						},
					];
				}

				const trimmedName = name.trim();
				const trimmedBaseUrl = baseUrl.trim();
				// Use a placeholder value for apiKey if empty (local providers don't need it,
				// but Pi's validateProviderConfig requires apiKey or oauth to be set)
				const effectiveApiKey = apiKey || "none";

				// Step 6: Register provider in current session (takes effect immediately)
				pi.registerProvider(trimmedName, {
					baseUrl: trimmedBaseUrl,
					apiKey: effectiveApiKey,
					api: "openai-completions",
					models,
				});

				// Step 7: Persist to models.json (Pi-native config file)
				// models.json is loaded by Pi on startup via loadModels() -> loadCustomModels(),
				// so the provider will be available in all future sessions.
				// It is NOT managed by sync-pi-agent.sh, so it won't be overwritten.
				const config = readModelsJson();
				config.providers[trimmedName] = {
					baseUrl: trimmedBaseUrl,
					api: "openai-completions",
					apiKey: effectiveApiKey,
					models,
				};
				writeModelsJson(config);

				ctx.ui.notify(
					`Provider "${trimmedName}" added with ${models.length} model(s) (persisted to models.json)`,
					"success",
				);
			} catch (err) {
				ctx.ui.notify(
					`Error: ${err instanceof Error ? err.message : String(err)}`,
					"error",
				);
			}
		},
	});
}
