import { V2_DEFAULT_TEMPLATE_SNAPSHOT } from "../../../../src/modules/anketa-v2/constants/v2-default-template-snapshot";
import {
	buildDefaultDictionariesFromJsonSchema,
	schemaDictionaryItemCode,
	V2_DICTIONARY_ITEM_CODE_MAX_LEN,
} from "../../../../src/modules/anketa-v2/utils/v2-schema-dictionary.util";

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
		const regulatory = defs.find((d) => d.code === "v2.generalInfo.field__U-C4tOE");
		expect(regulatory).toBeDefined();
		expect(regulatory!.items.length).toBe(5);
		for (const item of regulatory!.items) {
			expect(item.code.length).toBeLessThanOrEqual(V2_DICTIONARY_ITEM_CODE_MAX_LEN);
			expect(item.label.length).toBeGreaterThan(item.code.length);
		}
		expect(regulatory!.items.map((i) => i.code)).toEqual([
			"1",
			"2",
			"3",
			"4",
			"5",
		]);
	});
});
