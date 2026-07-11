import { describe, expect, it } from "vitest";
import { compareAgGridDateFilterValue } from "./agGridDateFilterParams";

function localMidnight(isoDay: string): Date {
	const [year, month, day] = isoDay.split("-").map(Number);
	return new Date(year, month - 1, day);
}

describe("compareAgGridDateFilterValue", () => {
	it("returns 0 for the same local calendar day", () => {
		const filter = localMidnight("2026-07-07");
		const cellValue = new Date(2026, 6, 7, 15, 30).toISOString();
		expect(compareAgGridDateFilterValue(filter, cellValue)).toBe(0);
	});

	it("returns -1 when cell day is before filter day", () => {
		const filter = localMidnight("2026-07-07");
		const cellValue = new Date(2026, 5, 1).toISOString();
		expect(compareAgGridDateFilterValue(filter, cellValue)).toBe(-1);
	});

	it("returns 1 when cell day is after filter day", () => {
		const filter = localMidnight("2026-07-07");
		const cellValue = new Date(2026, 6, 8).toISOString();
		expect(compareAgGridDateFilterValue(filter, cellValue)).toBe(1);
	});
});
