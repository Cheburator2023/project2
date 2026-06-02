import { V2_ANKETA_MAIN_SECTION_IDS } from "@smart-anketa/api-contract";
import { enrichAnketaLayoutUiSchema } from "@smart-anketa/api-contract";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("enrichAnketaLayoutUiSchema", () => {
	const snapshotPath = join(
		__dirname,
		"../../../../src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
	);
	const snapshot = JSON.parse(readFileSync(snapshotPath, "utf-8")) as {
		jsonSchema: Record<string, unknown>;
		uiSchema: Record<string, unknown>;
	};

	it("marks main sections and stream subsections from jsonSchema", () => {
		const ui = enrichAnketaLayoutUiSchema(
			snapshot.uiSchema,
			snapshot.jsonSchema,
		);

		const general = (ui.generalInfo as Record<string, unknown>)?.[
			"ui:options"
		] as Record<string, unknown>;
		expect(general?.sectionRole).toBe("main");
		expect(general?.defaultExpanded).toBe(true);

		const detail = (ui.detailInfo as Record<string, unknown>)?.[
			"ui:options"
		] as Record<string, unknown>;
		expect(detail?.defaultExpanded).toBe(false);

		const processing = (
			(ui.streamModelControl as Record<string, unknown>)
				?.dataProcessing as Record<string, unknown>
		)?.["ui:options"] as Record<string, unknown>;
		expect(processing?.sectionRole).toBe("subsection");
		expect(processing?.showFilledCount).toBe(true);

		for (const id of V2_ANKETA_MAIN_SECTION_IDS.slice(1)) {
			const opts = (ui[id] as Record<string, unknown>)?.["ui:options"] as
				| Record<string, unknown>
				| undefined;
			expect(opts?.sectionRole).toBe("main");
			if (id !== V2_ANKETA_MAIN_SECTION_IDS[0]) {
				expect(opts?.defaultExpanded).toBe(false);
			}
		}
	});
});
