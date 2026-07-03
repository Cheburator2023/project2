import { describe, expect, it } from "vitest";
import {
	defaultWorkFormula,
	type V2TypicalWorkCardDto,
} from "@smart-anketa/api-contract";
import { cardToPatchDto } from "./useDebouncedTypicalWorkSave";

describe("cardToPatchDto", () => {
	const baseCard: V2TypicalWorkCardDto = {
		id: "work-1",
		name: "Test work",
		archComponentType: "Система-источник",
		workType: null,
		streamExecutor: "ИД. Внешний",
		triggerStatus: "appears",
		norms: [
			{
				id: "n-int",
				streamExecutor: "ИД. Внутренний",
				normValue: 0.5,
				validFrom: "2025-01-01",
				validTo: null,
			},
			{
				id: "n-ext",
				streamExecutor: "ИД. Внешний",
				normValue: 0.7,
				validFrom: "2025-01-01",
				validTo: null,
			},
		],
		rules: [
			{
				id: "r-int",
				streamExecutor: "ИД. Внутренний",
				paramCode: "type",
				paramName: "Type",
				operator: "=",
				valueCode: "internal",
				valueLabel: "Внутренний",
			},
			{
				id: "r-ext",
				streamExecutor: "ИД. Внешний",
				paramCode: "type",
				paramName: "Type",
				operator: "=",
				valueCode: "external",
				valueLabel: "Внешний",
			},
		],
		laborParams: [],
		formula: defaultWorkFormula(),
		rounding: { mode: "NONE", step: null },
	};

	it("sends only norms for the active streamExecutor", () => {
		const dto = cardToPatchDto(baseCard, "version-1");
		expect(dto.norms).toHaveLength(1);
		expect(dto.norms?.[0]?.normValue).toBe(0.7);
	});

	it("sends only rules for the active streamExecutor", () => {
		const dto = cardToPatchDto(baseCard, "version-1");
		expect(dto.rules).toHaveLength(1);
		expect(dto.rules?.[0]?.valueCode).toBe("external");
	});
});
