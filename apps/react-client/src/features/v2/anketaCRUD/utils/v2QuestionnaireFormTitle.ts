export function getV2QuestionnaireFormTitle(
	formData: Record<string, unknown> | undefined | null,
	fallback = "Новая анкета",
): string {
	const generalInfo = formData?.generalInfo;
	if (generalInfo && typeof generalInfo === "object" && !Array.isArray(generalInfo)) {
		const calcName = (generalInfo as { calcName?: unknown }).calcName;
		if (typeof calcName === "string" && calcName.trim()) {
			return calcName.trim();
		}
	}

	const meta = formData?.meta;
	if (meta && typeof meta === "object" && !Array.isArray(meta)) {
		const name = (meta as { name?: unknown }).name;
		if (typeof name === "string" && name.trim()) {
			return name.trim();
		}
	}

	return fallback;
}
