import { describe, it, expect } from "vitest";
import {
	buildTypicalWorkCopyName,
	planWorkAddition,
	workNeedsCopyForSchema,
	workSchemaLinkLabel,
} from "./assignWorkFromCatalog.util";
import type { V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";

const baseWork = (
	overrides: Partial<V2TypicalWorkListItemDto> = {},
): V2TypicalWorkListItemDto => ({
	id: "w1",
	name: "Настройка БД",
	archComponentType: "database",
	workType: null,
	triggerStatus: "appears",
	currentNorm: 10,
	streams: ["Источники данных"],
	...overrides,
});

describe("assignWorkFromCatalog.util", () => {
	it("marks work owned by another schema for copy", () => {
		const work = baseWork({
			templateId: "other",
			templateName: "Схема A",
		});
		expect(workNeedsCopyForSchema(work, "current")).toBe(true);
		expect(planWorkAddition(work, "current")).toEqual({
			action: "copy",
			work,
			reason: "привязана к схеме «Схема A»",
		});
	});

	it("builds copy name with target schema", () => {
		expect(buildTypicalWorkCopyName(baseWork(), "Моя схема")).toBe(
			"Настройка БД (копия · Моя схема)",
		);
	});

	it("labels current schema link", () => {
		expect(
			workSchemaLinkLabel(
				baseWork({ templateId: "tpl-1", templateName: "Demo" }),
				"tpl-1",
			),
		).toBe("Demo (текущая)");
	});
});
