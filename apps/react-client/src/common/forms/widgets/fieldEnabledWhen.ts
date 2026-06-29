function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function readDotPath(data: unknown, path: string): unknown {
	const segments = path.split(".").filter(Boolean);
	let current: unknown = data;
	for (const segment of segments) {
		const record = readRecord(current);
		if (!record) return undefined;
		current = record[segment];
	}
	return current;
}

/** Поле активно, если `enabledWhenVar` в formData истинно (boolean true). */
export function resolveFieldEnabledWhen(
	formData: unknown,
	options: Record<string, unknown> | undefined,
): boolean {
	const path = options?.enabledWhenVar;
	if (typeof path !== "string" || !path.trim()) return true;
	return readDotPath(formData, path.trim()) === true;
}
