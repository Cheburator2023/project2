import { describe, expect, it } from "vitest";
import {
	appendArchObjectListItem,
	canAppendArchObjectListItem,
	readArchObjectListAtPath,
	removeArchObjectListItem,
	updateArchObjectListItem,
	writeArchObjectListAtPath,
} from "./anketaArchObjectListPaths";

describe("anketaArchObjectListPaths", () => {
	const base = {
		generalInfo: {
			modelService: {
				workType: "Разработка",
				field_dEVFQVQn: "ms-1",
			},
		},
	};

	it("reads legacy singleton object as one-item list", () => {
		expect(readArchObjectListAtPath(base, "generalInfo.modelService")).toEqual([
			{
				workType: "Разработка",
				field_dEVFQVQn: "ms-1",
			},
		]);
	});

	it("does not append a second modelService item (max 1)", () => {
		expect(canAppendArchObjectListItem(base, "generalInfo.modelService")).toBe(
			false,
		);

		const next = appendArchObjectListItem(base, "generalInfo.modelService", {
			workType: "Доработка",
			field_dEVFQVQn: "ms-2",
		});

		expect(readArchObjectListAtPath(next, "generalInfo.modelService")).toEqual([
			{
				workType: "Разработка",
				field_dEVFQVQn: "ms-1",
			},
		]);
	});

	it("clamps modelService list to max 1 on write", () => {
		const next = writeArchObjectListAtPath(base, "generalInfo.modelService", [
			{ field_dEVFQVQn: "ms-1" },
			{ field_dEVFQVQn: "ms-2" },
		]);

		expect(readArchObjectListAtPath(next, "generalInfo.modelService")).toEqual([
			{ field_dEVFQVQn: "ms-1" },
		]);
	});

	it("appends unlimited items for dataProcess", () => {
		const withOne = {
			detailInfo: {
				dataProcess: [{ name: "p1" }],
			},
		};
		const next = appendArchObjectListItem(withOne, "detailInfo.dataProcess", {
			name: "p2",
		});

		expect(readArchObjectListAtPath(next, "detailInfo.dataProcess")).toEqual([
			{ name: "p1" },
			{ name: "p2" },
		]);
	});

	it("updates item by index", () => {
		const withTwo = writeArchObjectListAtPath(
			{ detailInfo: {} },
			"detailInfo.dataProcess",
			[
				{ name: "p1" },
				{ name: "p2" },
			],
		);
		const next = updateArchObjectListItem(
			withTwo,
			"detailInfo.dataProcess",
			1,
			{ name: "p2-updated" },
		);

		expect(
			readArchObjectListAtPath(next, "detailInfo.dataProcess")[1],
		).toMatchObject({
			name: "p2-updated",
		});
	});

	it("removes item by index", () => {
		const withTwo = writeArchObjectListAtPath(
			{ detailInfo: {} },
			"detailInfo.dataProcess",
			[
				{ name: "p1" },
				{ name: "p2" },
			],
		);
		const next = removeArchObjectListItem(withTwo, "detailInfo.dataProcess", 0);

		expect(readArchObjectListAtPath(next, "detailInfo.dataProcess")).toEqual([
			{ name: "p2" },
		]);
	});
});
