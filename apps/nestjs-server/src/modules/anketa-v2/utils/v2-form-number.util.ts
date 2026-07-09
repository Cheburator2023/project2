/** Число из значения поля формы: number, numeric string, «×1.25» / «x3». */
export function parseFormNumber(value: unknown): number | null {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : null;
	}
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	const multiplier = trimmed.match(/^[x×X]\s*(\d+(?:[.,]\d+)?)$/);
	if (multiplier?.[1]) {
		const n = Number(multiplier[1].replace(",", "."));
		return Number.isFinite(n) ? n : null;
	}
	const embedded = trimmed.match(/[x×X]\s*(\d+(?:[.,]\d+)?)/);
	if (embedded?.[1]) {
		const n = Number(embedded[1].replace(",", "."));
		return Number.isFinite(n) ? n : null;
	}
	const n = Number(trimmed.replace(",", "."));
	return Number.isFinite(n) ? n : null;
}

/** Множитель из enum «N — … ×1.25» или «x1.25». */
export function parseLegacyMultiplierLabel(value: unknown): number {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value !== "string" || !value.trim()) return 1;
	const fromForm = parseFormNumber(value);
	if (fromForm !== null && fromForm > 0) return fromForm;
	const m = value.match(/[x×X]\s*(\d+(?:[.,]\d+)?)/);
	if (m?.[1]) {
		const n = Number(m[1].replace(",", "."));
		if (Number.isFinite(n) && n > 0) return n;
	}
	if (value.startsWith("1")) return 1;
	if (value.startsWith("2")) return 1.25;
	if (value.startsWith("3")) return 1.5;
	if (value.startsWith("4")) return 2;
	if (value.startsWith("5")) return 2.5;
	return 1;
}
