import { V2_DEFAULT_TEMPLATE_SNAPSHOT } from "../../../../src/modules/anketa-v2/constants/v2-default-template-snapshot";
import {
	buildDefaultDictionariesFromJsonSchema,
	schemaDictionaryItemCode,
	V2_DICTIONARY_ITEM_CODE_MAX_LEN,
} from "../../../../src/modules/anketa-v2/utils/v2-schema-dictionary.util";
import { FACTORY_DICTIONARY_CODE_SET } from "../../../../src/modules/anketa-v2/constants/factory-dictionary-codes";
import { FACTORY_UI_ONLY_DICTIONARIES } from "../../../../src/modules/anketa-v2/constants/factory-ui-only-dictionaries";
import { V2_ALL_DEFAULT_DICTIONARIES } from "../../../../src/modules/anketa-v2/constants/v2-default-dictionary-codes";

describe("v2-schema-dictionary.util", () => {
	it("schemaDictionaryItemCode keeps codes within varchar limit", () => {
		const longLabel =
			"3. Проведение регулярной валидации Регулятором нормативно не установлено. Заказчик запрашивает проведение первичной валидации модели";
		const seen = new Set<string>();
		const code = schemaDictionaryItemCode(longLabel, 2, seen);
		expect(code).toBe("3");
		expect(code.length).toBeLessThanOrEqual(V2_DICTIONARY_ITEM_CODE_MAX_LEN);
	});

	it("buildDefaultDictionariesFromJsonSchema uses short codes and full labels", () => {
		const defs = buildDefaultDictionariesFromJsonSchema(
			V2_DEFAULT_TEMPLATE_SNAPSHOT.jsonSchema,
		);
		const complexity = defs.find((d) => d.code === "v2.generalInfo.complexity");
		expect(complexity).toBeDefined();
		expect(complexity!.items.length).toBe(5);
		for (const item of complexity!.items) {
			expect(item.code.length).toBeLessThanOrEqual(V2_DICTIONARY_ITEM_CODE_MAX_LEN);
			expect(item.label.length).toBeGreaterThan(item.code.length);
		}
		expect(complexity!.items.map((i) => i.code)).toEqual([
			"1_низкая_1_00",
			"2_средняя_1_25",
			"3_повышенная_1_50",
			"4_высокая_2_00",
			"5_максимальная_2_50",
		]);
	});

	it("FACTORY_UI_ONLY_DICTIONARIES covers ui-only allowlist codes", () => {
		for (const def of FACTORY_UI_ONLY_DICTIONARIES) {
			expect(FACTORY_DICTIONARY_CODE_SET.has(def.code)).toBe(true);
			expect(def.items.length).toBeGreaterThan(0);
			expect(V2_ALL_DEFAULT_DICTIONARIES.some((d) => d.code === def.code)).toBe(
				true,
			);
		}
	});
});
