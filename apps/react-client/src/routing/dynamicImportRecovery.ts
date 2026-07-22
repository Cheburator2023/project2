const AUTO_RELOAD_FLAG = "dynamic-import:auto-reload";
const DEPLOY_SYNC_CHANNEL = "smart-anketa:deploy-sync:v1";
const BUILD_REVISION = process.env.GIT_REVISION ?? "unknown";
/**
 * Auto-reload только в явном production.
 * Webpack DefinePlugin с `"process.env": {}` без NODE_ENV давал undefined →
 * IS_DEV=false → ChunkLoadError/HTML-as-JS крутил reload-loop.
 */
const IS_PROD = process.env.NODE_ENV === "production";
/** В prod не чаще одного reload на ревизию; защита от гонок/повторных error events. */
const RELOAD_COOLDOWN_MS = 120_000;

type DeploySyncMessage = {
	type: "stale-chunks";
	revision: string;
	label: string;
};

type AutoReloadState = {
	revision: string;
	label: string;
	at: number;
};

let recoveryHandlersRegistered = false;
let deploySyncChannel: BroadcastChannel | null = null;
let reloadScheduled = false;

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		globalThis.setTimeout(resolve, ms);
	});
}

function readAutoReloadState(): AutoReloadState | null {
	const raw = sessionStorage.getItem(AUTO_RELOAD_FLAG);
	if (!raw) return null;
	try {
		const value = JSON.parse(raw) as Partial<AutoReloadState>;
		if (typeof value.revision !== "string") return null;
		return {
			revision: value.revision,
			label: typeof value.label === "string" ? value.label : "module",
			at: typeof value.at === "number" ? value.at : 0,
		};
	} catch {
		return null;
	}
}

/** Уже перезагружались на этой сборке / слишком недавно — не крутим loop. */
function shouldAttemptAutoReload(): boolean {
	if (!IS_PROD) return false;
	if (reloadScheduled) return false;
	const state = readAutoReloadState();
	if (!state) return true;
	if (state.revision === BUILD_REVISION) return false;
	if (Date.now() - state.at < RELOAD_COOLDOWN_MS) return false;
	return true;
}

function markAutoReloadAttempt(label?: string): void {
	const state: AutoReloadState = {
		revision: BUILD_REVISION,
		label: label ?? "module",
		at: Date.now(),
	};
	sessionStorage.setItem(AUTO_RELOAD_FLAG, JSON.stringify(state));
}

function broadcastStaleChunks(label?: string): void {
	if (!IS_PROD) return;
	deploySyncChannel?.postMessage({
		type: "stale-chunks",
		revision: BUILD_REVISION,
		label: label ?? "module",
	} satisfies DeploySyncMessage);
}

function reloadForStaleChunks(
	label?: string,
	{ broadcast = true }: { broadcast?: boolean } = {},
): void {
	if (!IS_PROD) {
		console.warn(
			`[dynamic-import] stale chunk outside production (${label ?? "module"}) — skip full reload to avoid loops`,
		);
		return;
	}
	if (!shouldAttemptAutoReload()) return;
	reloadScheduled = true;
	markAutoReloadAttempt(label);
	if (broadcast) {
		broadcastStaleChunks(label);
	}
	globalThis.location.reload();
}

/** Ошибки устаревших lazy-чанков после деплоя или HMR (Vite / Webpack). */
export function isDynamicImportFetchError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const msg = error.message;
	return (
		msg.includes("Failed to fetch dynamically imported module") ||
		msg.includes("Failed to load module") ||
		msg.includes("Loading chunk") ||
		msg.includes("ChunkLoadError") ||
		msg.includes("Importing a module script failed") ||
		error.name === "ChunkLoadError"
	);
}

/**
 * Повторяет dynamic import и один раз перезагружает страницу (только prod),
 * если lazy-чанк устарел после деплоя.
 * В development full reload отключён — иначе Vite deps 404 даёт бесконечный loop.
 */
export async function importWithDynamicRecovery<T>(
	loader: () => Promise<T>,
	options?: { label?: string },
): Promise<T> {
	try {
		return await loader();
	} catch (firstError) {
		if (!isDynamicImportFetchError(firstError)) {
			throw firstError;
		}

		await delay(200);

		try {
			return await loader();
		} catch (secondError) {
			if (!isDynamicImportFetchError(secondError)) {
				throw secondError;
			}

			if (shouldAttemptAutoReload()) {
				reloadForStaleChunks(options?.label);
				return await new Promise(() => {});
			}

			throw secondError;
		}
	}
}

/**
 * Сбрасывает защиту от reload только после загрузки другой сборки (prod deploy).
 * Не сбрасываем на каждый успешный import — иначе снова возможен loop.
 */
export function clearDynamicImportReloadFlag(): void {
	const state = readAutoReloadState();
	if (!state) return;
	if (state.revision !== BUILD_REVISION) {
		sessionStorage.removeItem(AUTO_RELOAD_FLAG);
	}
}

/**
 * Ловит ChunkLoadError вне lazyPage и синхронизирует reload между вкладками (prod).
 * Вкладки на другой ревизии игнорируют сообщение от устаревшего приложения.
 */
export function registerDynamicImportRecoveryHandlers(): void {
	if (typeof window === "undefined" || recoveryHandlersRegistered) return;
	recoveryHandlersRegistered = true;

	const recover = (error: unknown) => {
		if (!isDynamicImportFetchError(error)) return;
		reloadForStaleChunks("global");
	};

	if (IS_PROD && "BroadcastChannel" in globalThis) {
		deploySyncChannel = new BroadcastChannel(DEPLOY_SYNC_CHANNEL);
		deploySyncChannel.addEventListener(
			"message",
			(event: MessageEvent<DeploySyncMessage>) => {
				const message = event.data;
				if (
					message?.type !== "stale-chunks" ||
					message.revision !== BUILD_REVISION
				) {
					return;
				}
				reloadForStaleChunks(message.label, { broadcast: false });
			},
		);
	}

	window.addEventListener("unhandledrejection", (event) => {
		recover(event.reason);
	});

	window.addEventListener("error", (event) => {
		recover(event.error ?? event.message);
	});
}

/** Для тестов. */
export function resetDynamicImportRecoveryForTests(): void {
	recoveryHandlersRegistered = false;
	reloadScheduled = false;
	deploySyncChannel?.close();
	deploySyncChannel = null;
}
