import { readFileSync } from "node:fs";
import { join } from "node:path";
import { V2_DEFAULT_TEMPLATE_SNAPSHOT } from "../../../../src/modules/anketa-v2/constants/v2-default-template-snapshot";

const snapshotPath = join(
	__dirname,
	"../../../../src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

function stripDraft07Schema(schema: Record<string, unknown>) {
	const { $schema: _omit, ...rest } = schema;
	return rest;
}

describe("v2 factory snapshot", () => {
	const file = JSON.parse(readFileSync(snapshotPath, "utf-8")) as {
		jsonSchema: Record<string, unknown>;
		uiSchema: Record<string, unknown>;
		logic: { rules?: unknown[] };
		dictionariesSnapshot?: { referencedDictionaryCodes?: string[] };
	};

	it("содержит базовые секции анкеты", () => {
		for (const key of [
			"meta",
			"workflow",
			"summary",
			"detailInfo",
			"generalInfo",
			"streamDataSources",
		]) {
			expect(file.jsonSchema.properties).toHaveProperty(key);
		}
	});

	it("runtime snapshot совпадает с файлом (v35 as-is)", () => {
		expect(V2_DEFAULT_TEMPLATE_SNAPSHOT.jsonSchema).toEqual(
			stripDraft07Schema(file.jsonSchema),
		);
		expect(V2_DEFAULT_TEMPLATE_SNAPSHOT.uiSchema).toEqual(file.uiSchema);
		expect(V2_DEFAULT_TEMPLATE_SNAPSHOT.logic).toEqual(file.logic);
		expect(V2_DEFAULT_TEMPLATE_SNAPSHOT.dictionariesSnapshot).toEqual(
			file.dictionariesSnapshot ?? {
				referencedDictionaryCodes: expect.any(Array),
			},
		);
	});

	it("logic содержит правила типовых работ", () => {
		expect(Array.isArray(file.logic.rules)).toBe(true);
		expect(file.logic.rules?.length).toBeGreaterThan(0);
	});

	it("dictionariesSnapshot из v35", () => {
		expect(file.dictionariesSnapshot?.referencedDictionaryCodes?.length).toBe(
			71,
		);
	});
});
