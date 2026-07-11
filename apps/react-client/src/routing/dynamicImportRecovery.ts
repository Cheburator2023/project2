const AUTO_RELOAD_FLAG = "dynamic-import:auto-reload";

const IS_DEV =
	(typeof import.meta !== "undefined" &&
		(import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV) ||
	process.env.NODE_ENV === "development";

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		window.setTimeout(resolve, ms);
	});
}

/** Ошибки устаревших lazy-чанков после HMR (Vite / Webpack dev). */
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
 * Повторяет dynamic import после HMR и один раз перезагружает страницу в dev,
 * если чанк уже удалён с dev-сервера.
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

			if (IS_DEV && !sessionStorage.getItem(AUTO_RELOAD_FLAG)) {
				sessionStorage.setItem(AUTO_RELOAD_FLAG, options?.label ?? "module");
				window.location.reload();
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
