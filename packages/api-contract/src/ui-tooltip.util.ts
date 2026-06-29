/** Нормализует текст подсказки из uiSchema (`\\n` → перевод строки). */
export function normalizeUiTooltip(raw: unknown): string | undefined {
	if (typeof raw !== "string") return undefined;
	const text = raw.trim();
	if (!text) return undefined;
	return text.replace(/\\n/g, "\n");
}
