const AUTO_RELOAD_FLAG = "dynamic-import:auto-reload";
const DEPLOY_SYNC_CHANNEL = "smart-anketa:deploy-sync:v1";
const BUILD_REVISION = process.env.GIT_REVISION ?? "unknown";

type DeploySyncMessage = {
	type: "stale-chunks";
	revision: string;
	label: string;
};

let recoveryHandlersRegistered = false;
let deploySyncChannel: BroadcastChannel | null = null;

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		globalThis.setTimeout(resolve, ms);
	});
}

function shouldAttemptAutoReload(): boolean {
	return !sessionStorage.getItem(AUTO_RELOAD_FLAG);
}

function markAutoReloadAttempt(label?: string): void {
	sessionStorage.setItem(
		AUTO_RELOAD_FLAG,
		JSON.stringify({
			revision: BUILD_REVISION,
			label: label ?? "module",
		}),
	);
}

function broadcastStaleChunks(label?: string): void {
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
	if (!shouldAttemptAutoReload()) return;
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
 * Повторяет dynamic import и один раз перезагружает страницу,
 * если lazy-чанк устарел после деплоя (или после HMR в dev).
 */
export async function importWithDynamicRecovery<T>(
	loader: () => Promise<T>,
	options?: { label?: string },
): Promise<T> {
	try {
		const result = await loader();
		sessionStorage.removeItem(AUTO_RELOAD_FLAG);
		return result;
	} catch (firstError) {
		if (!isDynamicImportFetchError(firstError)) {
			throw firstError;
		}

		await delay(200);

		try {
			const result = await loader();
			sessionStorage.removeItem(AUTO_RELOAD_FLAG);
			return result;
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
 * Сбрасывает защиту от reload-loop только после загрузки другой сборки.
 * Успешный lazy import сбрасывает её сразу в importWithDynamicRecovery.
 */
export function clearDynamicImportReloadFlag(): void {
	const raw = sessionStorage.getItem(AUTO_RELOAD_FLAG);
	if (!raw) return;

	try {
		const value = JSON.parse(raw) as { revision?: string };
		if (value.revision !== BUILD_REVISION) {
			sessionStorage.removeItem(AUTO_RELOAD_FLAG);
		}
	} catch {
		sessionStorage.removeItem(AUTO_RELOAD_FLAG);
	}
}

/**
 * Ловит ChunkLoadError вне lazyPage и синхронизирует reload между вкладками.
 * Вкладки на другой ревизии игнорируют сообщение от устаревшего приложения.
 */
export function registerDynamicImportRecoveryHandlers(): void {
	if (typeof window === "undefined" || recoveryHandlersRegistered) return;
	recoveryHandlersRegistered = true;

	const recover = (error: unknown) => {
		if (!isDynamicImportFetchError(error)) return;
		reloadForStaleChunks("global");
	};

	if ("BroadcastChannel" in globalThis) {
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
