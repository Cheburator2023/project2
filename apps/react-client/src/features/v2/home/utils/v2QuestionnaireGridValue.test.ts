import { describe, expect, it } from "vitest";
import {
	collectSelectedVersionRows,
	resolveVersionRow,
} from "./v2QuestionnaireGridValue";
import type { V2QuestionnaireVersionRow } from "../types/v2QuestionnaireGrid.types";

function version(id: string, version = "1"): V2QuestionnaireVersionRow {
	return {
		id,
		rowKind: "version",
		displayLabel: `v${version}`,
		version,
		seriesId: "s1",
		calcName: "Копия",
	} as V2QuestionnaireVersionRow;
}

describe("collectSelectedVersionRows", () => {
	it("expands a series group into all child versions", () => {
		const v1 = version("a1", "1");
		const v2 = version("a2", "2");
		const rows = collectSelectedVersionRows([
			{
				rowKind: "series",
				seriesId: "s1",
				displayLabel: "Копия",
				calcName: "Копия",
				children: [v1, v2],
			},
		]);
		expect(rows.map((r) => r.id)).toEqual(["a1", "a2"]);
	});

	it("dedupes group + already selected child", () => {
		const v1 = version("a1", "1");
		const rows = collectSelectedVersionRows([
			{
				rowKind: "series",
				seriesId: "s1",
				displayLabel: "Копия",
				calcName: "Копия",
				children: [v1],
			},
			v1,
		]);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.id).toBe("a1");
	});

	it("resolveVersionRow ignores series groups", () => {
		expect(
			resolveVersionRow({
				rowKind: "series",
				seriesId: "s1",
				displayLabel: "Копия",
				calcName: "Копия",
				children: [],
			}),
		).toBeNull();
	});
});
