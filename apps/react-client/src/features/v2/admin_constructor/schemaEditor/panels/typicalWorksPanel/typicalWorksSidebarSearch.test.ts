import { describe, expect, it } from "vitest";
import type { V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";
import {
	filterTypicalWorkSidebarGroups,
	typicalWorkSidebarDisplayLabel,
} from "./typicalWorksUi";

function work(
	overrides: Partial<V2TypicalWorkListItemDto> & Pick<V2TypicalWorkListItemDto, "id" | "name">,
): V2TypicalWorkListItemDto {
	return {
		archComponentType: "Система-источник",
		workType: null,
		triggerStatus: "no_triggers",
		currentNorm: null,
		streams: ["Источники данных"],
		...overrides,
	};
}

describe("filterTypicalWorkSidebarGroups", () => {
	const groups = [
		{
			archComponentType: "Система-источник",
			works: [
				work({ id: "w1", name: "Базовая оценка источника" }),
				work({ id: "w2", name: "Новый тракт данных" }),
			],
		},
		{
			archComponentType: "Модель",
			works: [work({ id: "w3", name: "AutoML настройка", archComponentType: "Модель" })],
		},
	];

	const allWorks = groups.flatMap((group) => group.works);

	it("returns all groups when query is empty", () => {
		expect(filterTypicalWorkSidebarGroups(groups, "", allWorks)).toEqual(groups);
	});

	it("filters by fuzzy work name", () => {
		const filtered = filterTypicalWorkSidebarGroups(groups, "базовая", allWorks);
		expect(filtered).toHaveLength(1);
		expect(filtered[0]?.works.map((item) => item.id)).toEqual(["w1"]);
	});

	it("filters by arch component label", () => {
		const filtered = filterTypicalWorkSidebarGroups(groups, "модель", allWorks);
		expect(filtered).toHaveLength(1);
		expect(filtered[0]?.works.map((item) => item.id)).toEqual(["w3"]);
	});

	it("disambiguates duplicate names in display label", () => {
		const dupes = [
			work({ id: "aaaaaaaa-bbbb-cccc", name: "Дубликат" }),
			work({ id: "dddddddd-eeee-ffff", name: "Дубликат" }),
		];
		expect(typicalWorkSidebarDisplayLabel(dupes[0]!, dupes)).toBe(
			"Дубликат · aaaaaaaa",
		);
	});
});
