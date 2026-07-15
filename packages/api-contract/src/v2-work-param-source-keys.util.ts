/** Суффикс в `paramName` правила: «Название @ field_a|field_b» — альтернативные ключи в данных анкеты. */
const PARAM_SOURCE_KEYS_SUFFIX_RE = /\s+@\s+([\p{L}\p{N}_|,-]+)$/u;

export function formatParamNameWithSourceKeys(
	name: string,
	sourceKeys?: readonly string[],
): string {
	const uniqueKeys = [...new Set((sourceKeys ?? []).filter(Boolean))];
	if (uniqueKeys.length === 0) return name;

	const suffix = uniqueKeys.join("|");
	const maxNameLen = Math.max(0, 255 - 3 - suffix.length);
	const trimmedName =
		name.length > maxNameLen ? name.slice(0, maxNameLen) : name;
	return `${trimmedName} @ ${suffix}`;
}

export function parseParamNameSourceKeys(paramName: string | null | undefined): {
	displayName: string;
	sourceKeys: string[];
} {
	if (!paramName) return { displayName: "", sourceKeys: [] };

	const match = paramName.match(PARAM_SOURCE_KEYS_SUFFIX_RE);
	if (!match || match.index == null) {
		return { displayName: paramName, sourceKeys: [] };
	}

	const displayName = paramName.slice(0, match.index).trim();
	const sourceKeys = match[1]
		.split("|")
		.map((key) => key.trim())
		.filter(Boolean);

	return { displayName, sourceKeys };
}

export function stripParamNameSourceKeys(
	paramName: string | null | undefined,
): string {
	const { displayName } = parseParamNameSourceKeys(paramName);
	return displayName || paramName || "";
}
