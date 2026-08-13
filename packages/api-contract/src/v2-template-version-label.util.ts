/**
 * Отображаемое имя версии схемы: «Название-N».
 * N — порядковый номер без ведущих нулей.
 */
export function formatV2TemplateVersionDisplayName(
	templateName: string | null | undefined,
	versionNumber: number | string | null | undefined,
): string {
	const name = String(templateName ?? "").trim() || "Схема";
	if (versionNumber == null || versionNumber === "") return name;
	const n =
		typeof versionNumber === "number"
			? versionNumber
			: Number.parseInt(String(versionNumber), 10);
	if (!Number.isFinite(n)) return name;
	return `${name}-${n}`;
}
