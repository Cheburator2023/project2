import { describe, expect, it } from "vitest";
import { highlightMatches } from "@react-client/utils/fuzzySearch";
import { substringMatchIndexes } from "./substringSearch";

function indexesToMatches(
	indexes: ReadonlyArray<number>,
): Array<{ start: number; end: number }> {
	if (!indexes.length) return [];

	const matches: Array<{ start: number; end: number }> = [];
	let start = indexes[0]!;
	let end = indexes[0]!;

	for (let i = 1; i < indexes.length; i++) {
		const index = indexes[i]!;
		if (index === end + 1) {
			end = index;
		} else {
			matches.push({ start, end: end + 1 });
			start = index;
			end = index;
		}
	}
	matches.push({ start, end: end + 1 });
	return matches;
}

describe("substringSearch highlighting", () => {
	it("highlights only the matching substring", () => {
		const label = "Детализация и ясность запроса постановки задачи";
		const query = "детализа";
		const segments = highlightMatches(
			label,
			indexesToMatches(substringMatchIndexes(label, query)),
		);

		expect(segments).toEqual([
			{ text: "Детализа", highlighted: true },
			{ text: "ция и ясность запроса постановки задачи", highlighted: false },
		]);
	});
});
