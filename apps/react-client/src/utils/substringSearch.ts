export function normalizeSearchText(value: string): string {
	return value.trim().toLocaleLowerCase("ru");
}

/** Индексы подстроки для подсветки. */
export function substringMatchIndexes(
	text: string,
	query: string,
): ReadonlyArray<number> {
	const trimmedQuery = query.trim();
	if (!trimmedQuery) return [];

	const lowerText = text.toLocaleLowerCase("ru");
	const lowerQuery = trimmedQuery.toLocaleLowerCase("ru");
	const start = lowerText.indexOf(lowerQuery);
	if (start < 0) return [];

	return Array.from({ length: trimmedQuery.length }, (_, index) => start + index);
}

/** Меньше — выше в списке. `null` — не подходит под запрос. */
export function rankSubstringSearchLabel(
	label: string,
	secondaryText: string | undefined,
	query: string,
): number | null {
	const normalizedQuery = normalizeSearchText(query);
	if (!normalizedQuery) return null;

	const primary = normalizeSearchText(label);
	const secondary = normalizeSearchText(secondaryText ?? "");

	if (primary === normalizedQuery) return 0;
	if (primary.startsWith(normalizedQuery)) return 1;
	if (primary.includes(normalizedQuery)) return 2;
	if (secondary.startsWith(normalizedQuery)) return 3;
	if (secondary.includes(normalizedQuery)) return 4;

	return null;
}

export function filterSubstringSearchOptions<T>(
	options: readonly T[],
	query: string,
	getLabel: (option: T) => string,
	getSecondaryText?: (option: T) => string | undefined,
): T[] {
	const normalizedQuery = normalizeSearchText(query);
	if (!normalizedQuery) return [...options];

	return options
		.map((option) => ({
			option,
			rank: rankSubstringSearchLabel(
				getLabel(option),
				getSecondaryText?.(option),
				query,
			),
		}))
		.filter(
			(entry): entry is { option: T; rank: number } => entry.rank !== null,
		)
		.sort((a, b) => {
			if (a.rank !== b.rank) return a.rank - b.rank;
			return getLabel(a.option).localeCompare(getLabel(b.option), "ru");
		})
		.map((entry) => entry.option);
}
