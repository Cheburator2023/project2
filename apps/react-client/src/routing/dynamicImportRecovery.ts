const AUTO_RELOAD_FLAG = "dynamic-import:auto-reload";

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		globalThis.setTimeout(resolve, ms);
	});
}

function shouldAttemptAutoReload(): boolean {
	return !sessionStorage.getItem(AUTO_RELOAD_FLAG);
}

function markAutoReloadAttempt(label?: string): void {
	sessionStorage.setItem(AUTO_RELOAD_FLAG, label ?? "module");
}

function reloadForStaleChunks(label?: string): void {
	if (!shouldAttemptAutoReload()) return;
	markAutoReloadAttempt(label);
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

/** Сбрасывает флаг одноразовой перезагрузки после успешного старта приложения. */
export function clearDynamicImportReloadFlag(): void {
	sessionStorage.removeItem(AUTO_RELOAD_FLAG);
}

/** Глобальный fallback: ловит ChunkLoadError вне lazyPage (например, nested import). */
export function registerDynamicImportRecoveryHandlers(): void {
	if (typeof window === "undefined") return;

	const recover = (error: unknown) => {
		if (!isDynamicImportFetchError(error)) return;
		reloadForStaleChunks("global");
	};

	window.addEventListener("unhandledrejection", (event) => {
		recover(event.reason);
	});

	window.addEventListener("error", (event) => {
		recover(event.error ?? event.message);
	});
}
