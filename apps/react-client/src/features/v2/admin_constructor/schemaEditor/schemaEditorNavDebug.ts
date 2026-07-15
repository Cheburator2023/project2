const NAV_DEBUG_STORAGE_KEY = "v2.schemaEditor.navDebug";

let sequence = 0;

export function isSchemaEditorNavDebugEnabled(): boolean {
	if (typeof window === "undefined") {
		return false;
	}
	try {
		if (window.localStorage.getItem(NAV_DEBUG_STORAGE_KEY) === "1") {
			return true;
		}
		if (import.meta.env.DEV) {
			return (
				new URLSearchParams(window.location.search).get("schemaNavDebug") ===
				"1"
			);
		}
		return false;
	} catch {
		return false;
	}
}

export function enableSchemaEditorNavDebug(): void {
	window.localStorage.setItem(NAV_DEBUG_STORAGE_KEY, "1");
	console.info(
		"[schema-nav] debug enabled — reload page, click «К логике», filter console by schema-nav",
	);
}

export function disableSchemaEditorNavDebug(): void {
	window.localStorage.removeItem(NAV_DEBUG_STORAGE_KEY);
	console.info("[schema-nav] debug disabled");
}

export function logSchemaEditorNav(
	step: string,
	details?: Record<string, unknown>,
): void {
	if (!isSchemaEditorNavDebugEnabled()) {
		return;
	}
	sequence += 1;
	const payload = details ? { ...details, seq: sequence } : { seq: sequence };
	console.debug(`[schema-nav] ${step}`, payload);
}

declare global {
	interface Window {
		__schemaNavDebug?: {
			enable: typeof enableSchemaEditorNavDebug;
			disable: typeof disableSchemaEditorNavDebug;
			isEnabled: typeof isSchemaEditorNavDebugEnabled;
		};
	}
}
