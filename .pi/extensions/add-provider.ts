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

interface PersistedProviderConfig {
	v: number;
	name: string;
	baseUrl: string;
	apiKey: string;
	models: ProviderModelConfig[];
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

	// Reload persisted providers on every session start
	pi.on("session_start", async (_event, ctx) => {
		const entries = ctx.sessionManager.getEntries();
		let reloaded = 0;
		for (const entry of entries) {
			if (entry.type === "custom" && (entry as any).customType === "add-provider") {
				const config = (entry as any).data as PersistedProviderConfig | undefined;
				if (!config?.name) continue;
				try {
					pi.registerProvider(config.name, {
						baseUrl: config.baseUrl,
						apiKey: config.apiKey || undefined,
						api: "openai-completions",
						models: config.models,
					});
					reloaded++;
				} catch {
					// Provider may already be registered — skip silently
				}
			}
		}
		if (reloaded > 0) {
			ctx.ui.notify(`Reloaded ${reloaded} custom provider(s)`, "info");
		}
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

				// Step 3: API key (optional)
				const apiKey = (await ctx.ui.input("API key (optional):", "")) || "";

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

				// Step 6: Register provider (takes effect immediately)
				pi.registerProvider(name.trim(), {
					baseUrl: baseUrl.trim(),
					apiKey: apiKey || undefined,
					api: "openai-completions",
					models,
				});

				// Step 7: Persist configuration
				pi.appendEntry("add-provider", {
					v: 1,
					name: name.trim(),
					baseUrl: baseUrl.trim(),
					apiKey,
					models,
				});

				ctx.ui.notify(
					`Provider "${name.trim()}" added with ${models.length} model(s)`,
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
