import { describe, expect, it } from "vitest";
import {
	appendArchObjectListItem,
	readArchObjectListAtPath,
	removeArchObjectListItem,
	updateArchObjectListItem,
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

	it("appends a new item without overwriting the first", () => {
		const next = appendArchObjectListItem(base, "generalInfo.modelService", {
			workType: "Доработка",
			field_dEVFQVQn: "ms-2",
		});

		expect(readArchObjectListAtPath(next, "generalInfo.modelService")).toEqual([
			{
				workType: "Разработка",
				field_dEVFQVQn: "ms-1",
			},
			{
				workType: "Доработка",
				field_dEVFQVQn: "ms-2",
			},
		]);
	});

	it("updates item by index", () => {
		const withTwo = appendArchObjectListItem(base, "generalInfo.modelService", {
			workType: "Доработка",
			field_dEVFQVQn: "ms-2",
		});
		const next = updateArchObjectListItem(
			withTwo,
			"generalInfo.modelService",
			1,
			{ field_dEVFQVQn: "ms-2-updated" },
		);

		expect(
			readArchObjectListAtPath(next, "generalInfo.modelService")[1],
		).toMatchObject({
			workType: "Доработка",
			field_dEVFQVQn: "ms-2-updated",
		});
	});

	it("removes item by index", () => {
		const withTwo = appendArchObjectListItem(base, "generalInfo.modelService", {
			workType: "Доработка",
			field_dEVFQVQn: "ms-2",
		});
		const next = removeArchObjectListItem(
			withTwo,
			"generalInfo.modelService",
			0,
		);

		expect(readArchObjectListAtPath(next, "generalInfo.modelService")).toEqual([
			{
				workType: "Доработка",
				field_dEVFQVQn: "ms-2",
			},
		]);
	});
});
