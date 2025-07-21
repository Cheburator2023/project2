export interface FuzzyMatch {
	item: string;
	score: number;
	matches: Array<{ start: number; end: number }>;
}

export interface FuzzySearchOptions {
	threshold?: number;
	caseSensitive?: boolean;
}

export const fuzzySearch = (
	query: string,
	items: string[],
	options: FuzzySearchOptions = {},
): FuzzyMatch[] => {
	const { threshold = 0.3, caseSensitive = false } = options;

	if (!query.trim()) {
		return items.map((item) => ({
			item,
			score: 1,
			matches: [],
		}));
	}

	const normalizedQuery = caseSensitive ? query : query.toLowerCase();
	const results: FuzzyMatch[] = [];

	for (const item of items) {
		const normalizedItem = caseSensitive ? item : item.toLowerCase();
		const match = calculateFuzzyMatch(normalizedQuery, normalizedItem);

		if (match.score >= threshold) {
			results.push({
				item,
				score: match.score,
				matches: match.matches,
			});
		}
	}

	return results.sort((a, b) => b.score - a.score);
};

const calculateFuzzyMatch = (
	query: string,
	text: string,
): { score: number; matches: Array<{ start: number; end: number }> } => {
	const matches: Array<{ start: number; end: number }> = [];
	let queryIndex = 0;
	let textIndex = 0;
	let matchStart = -1;
	let consecutiveMatches = 0;
	let totalMatches = 0;

	while (queryIndex < query.length && textIndex < text.length) {
		if (query[queryIndex] === text[textIndex]) {
			if (matchStart === -1) {
				matchStart = textIndex;
			}
			consecutiveMatches++;
			totalMatches++;
			queryIndex++;
		} else {
			if (matchStart !== -1) {
				matches.push({
					start: matchStart,
					end: matchStart + consecutiveMatches,
				});
				matchStart = -1;
				consecutiveMatches = 0;
			}
		}
		textIndex++;
	}

	if (matchStart !== -1) {
		matches.push({ start: matchStart, end: matchStart + consecutiveMatches });
	}

	if (queryIndex < query.length) {
		return { score: 0, matches: [] };
	}

	const matchRatio = totalMatches / query.length;
	const consecutiveBonus = matches.reduce((bonus, match) => {
		const length = match.end - match.start;
		return bonus + (length > 1 ? length * 0.1 : 0);
	}, 0);

	const positionBonus = matches.length > 0 && matches[0].start === 0 ? 0.2 : 0;

	const score = Math.min(1, matchRatio + consecutiveBonus + positionBonus);

	return { score, matches };
};

export const highlightMatches = (
	text: string,
	matches: Array<{ start: number; end: number }>,
): Array<{ text: string; highlighted: boolean }> => {
	if (matches.length === 0) {
		return [{ text, highlighted: false }];
	}

	const result: Array<{ text: string; highlighted: boolean }> = [];
	let lastIndex = 0;

	for (const match of matches) {
		if (match.start > lastIndex) {
			result.push({
				text: text.slice(lastIndex, match.start),
				highlighted: false,
			});
		}

		result.push({
			text: text.slice(match.start, match.end),
			highlighted: true,
		});

		lastIndex = match.end;
	}

	if (lastIndex < text.length) {
		result.push({
			text: text.slice(lastIndex),
			highlighted: false,
		});
	}

	return result;
};
