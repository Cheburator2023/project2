import { describe, expect, it } from "vitest";
import type { V2QuestionnaireGridRow } from "../types/v2QuestionnaireGrid.types";
import {
	collectVersionIdsFromGridRows,
	mergeVisibleSelection,
	shouldSelectGridRow,
} from "./v2RegistrySelection";
import type { V2QuestionnaireVersionRow } from "../types/v2QuestionnaireGrid.types";

function version(id: string): V2QuestionnaireVersionRow {
	return { id, rowKind: "version", displayLabel: id } as V2QuestionnaireVersionRow;
}

describe("v2 registry cross-page selection", () => {
	it("keeps ids from other pages when the current page selection changes", () => {
		const previous = new Set(["old-page", "keep", "drop-on-this-page"]);
		const next = mergeVisibleSelection(
			previous,
			["drop-on-this-page", "new-on-this-page"],
			["new-on-this-page"],
		);
		expect([...next].sort()).toEqual(["keep", "new-on-this-page", "old-page"]);
	});

	it("collects version ids from series groups", () => {
		const rows: V2QuestionnaireGridRow[] = [
			{
				rowKind: "series",
				seriesId: "s1",
				displayLabel: "A",
				calcName: "A",
				children: [version("a1"), version("a2")],
			},
			version("b1"),
		];
		expect(collectVersionIdsFromGridRows(rows)).toEqual(["a1", "a2", "b1"]);
	});

	it("selects a series only when every child is selected", () => {
		const series: V2QuestionnaireGridRow = {
			rowKind: "series",
			seriesId: "s1",
			displayLabel: "A",
			calcName: "A",
			children: [version("a1"), version("a2")],
		};
		expect(shouldSelectGridRow(series, new Set(["a1"]))).toBe(false);
		expect(shouldSelectGridRow(series, new Set(["a1", "a2"]))).toBe(true);
	});
});
