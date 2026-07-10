import { describe, expect, it } from "vitest";
import { readArchObjectListAtPath } from "./anketaArchObjectListPaths";
import {
	applyRjsfFormChangeToAnketaFormData,
	normalizeAnketaFormDataForRjsf,
} from "./anketaRjsfFormData.util";

describe("anketaRjsfFormData.util", () => {
	it("replaces arch object list arrays with empty objects for RJSF", () => {
		const normalized = normalizeAnketaFormDataForRjsf({
			generalInfo: {
				calcName: "Тест",
				modelService: [{ field_dEVFQVQn: "ms-1" }],
			},
		});

		expect(
			(normalized.generalInfo as { modelService: unknown }).modelService,
		).toEqual({});
		expect(
			(normalized.generalInfo as { calcName: string }).calcName,
		).toBe("Тест");
	});

	it("preserves arch object list arrays when applying RJSF onChange", () => {
		const storage = {
			generalInfo: {
				modelService: [{ field_dEVFQVQn: "ms-1" }, { field_dEVFQVQn: "ms-2" }],
			},
		};
		const rjsfData = {
			generalInfo: {
				calcName: "Новое имя",
				modelService: {},
			},
		};

		const next = applyRjsfFormChangeToAnketaFormData(storage, rjsfData);

		expect(readArchObjectListAtPath(next, "generalInfo.modelService")).toEqual([
			{ field_dEVFQVQn: "ms-1" },
			{ field_dEVFQVQn: "ms-2" },
		]);
		expect((next.generalInfo as { calcName: string }).calcName).toBe("Новое имя");
	});
});
