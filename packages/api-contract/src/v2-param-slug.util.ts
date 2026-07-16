/** Legacy slug для paramCode из человекочитаемого названия параметра. */
export function slugParamCode(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-zа-я0-9]+/gi, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 80);
}

const MAX_STORED_VALUE_CODE_LENGTH = 120;
const MAX_STORED_VALUE_LABEL_LENGTH = 255;

/** Укладывает valueCode в varchar(120): enum-схемы часто используют длинный текст как code. */
export function normalizeStoredValueCode(
	code: string,
	label?: string | null,
): string {
	const trimmed = code.trim();
	if (!trimmed) return trimmed;
	if (trimmed.length <= MAX_STORED_VALUE_CODE_LENGTH) return trimmed;

	const fromLabel = label?.trim();
	if (
		fromLabel &&
		fromLabel.length > 0 &&
		fromLabel.length <= MAX_STORED_VALUE_CODE_LENGTH
	) {
		return fromLabel;
	}

	const numericPrefix = trimmed.match(/^(\d+)\s*[—–-]/u);
	if (numericPrefix?.[1]) return numericPrefix[1];

	const slug = slugParamCode(fromLabel ?? trimmed);
	if (slug.length <= MAX_STORED_VALUE_CODE_LENGTH) return slug;
	return slug.slice(0, MAX_STORED_VALUE_CODE_LENGTH);
}

export function normalizeStoredValueLabel(
	label: string | null | undefined,
): string | null {
	const trimmed = label?.trim();
	if (!trimmed) return null;
	if (trimmed.length <= MAX_STORED_VALUE_LABEL_LENGTH) return trimmed;
	return trimmed.slice(0, MAX_STORED_VALUE_LABEL_LENGTH);
}
