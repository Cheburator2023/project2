import { describe, expect, it, beforeEach } from "vitest";
import { createDefaultOverallUncertaintyConfig } from "@smart-anketa/api-contract";
import {
	applyOverallUncertaintyDraftToVersionSnapshot,
	clearOverallUncertaintyDraft,
	peekOverallUncertaintyDraft,
	setOverallUncertaintyDraft,
} from "./overallUncertaintyDraftStore";

describe("overallUncertaintyDraftStore", () => {
	beforeEach(() => {
		clearOverallUncertaintyDraft();
	});

	it("survives peek by template and merges into save snapshot", () => {
		const config = createDefaultOverallUncertaintyConfig();
		config.groups[0]!.coef = 0.42;
		config.groups[0]!.name = "Тест-группа";

		setOverallUncertaintyDraft({
			templateId: "tpl-1",
			config,
		});

		expect(peekOverallUncertaintyDraft({ templateId: "tpl-1" })?.groups[0]?.coef).toBe(
			0.42,
		);
		expect(peekOverallUncertaintyDraft({ templateId: "tpl-other" })).toBeNull();

		const snapshot = applyOverallUncertaintyDraftToVersionSnapshot({
			templateId: "tpl-1",
			jsonSchema: { type: "object", properties: {} },
			uiSchema: {},
			logic: { rules: [] },
		});

		const rule = snapshot.logic.rules.find(
			(item) => item.id === "v2-overall-uncertainty-config",
		);
		expect(rule).toBeTruthy();
		const payload = rule?.payload as {
			role?: string;
			config?: { groups?: Array<{ coef: number; name: string }> };
		};
		expect(payload.role).toBe("overall_uncertainty_config");
		expect(payload.config?.groups?.[0]?.coef).toBe(0.42);
		expect(payload.config?.groups?.[0]?.name).toBe("Тест-группа");
	});
});
