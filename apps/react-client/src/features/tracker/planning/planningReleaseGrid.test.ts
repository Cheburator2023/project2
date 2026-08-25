import { describe, expect, it } from "vitest";
import {
	buildPlanningReleaseTaskGridRows,
	planningReleaseGridRowId,
} from "@smart-anketa/api-contract";

describe("buildPlanningReleaseTaskGridRows", () => {
	it("keeps empty releases as groups so the table shows every release", () => {
		const rows = buildPlanningReleaseTaskGridRows(
			[{ taskId: "t1", releaseId: "r1", position: 0 }],
			[
				{ id: "r1", code: "REL-1", name: "Апрель" },
				{ id: "r2", code: "REL-2", name: "Май" },
			],
		);
		expect(
			rows.map((row) => [row.rowKind, row.title, row.children.length]),
		).toEqual([
			["release", "Апрель", 1],
			["release", "Май", 0],
		]);
		expect(planningReleaseGridRowId(rows[0]!)).toBe("release:r1");
		expect(planningReleaseGridRowId(rows[0]!.children[0]!)).toBe("task:t1");
	});
});
