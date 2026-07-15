import { V2_DEFAULT_TEMPLATE_SNAPSHOT } from "../../../../src/modules/anketa-v2/constants/v2-default-template-snapshot";
import {
	buildDefaultDictionariesFromJsonSchema,
	buildDictionariesFromUiSchemaReferences,
	collectDictionaryBindingsFromUiSchema,
	schemaDictionaryItemCode,
	V2_DICTIONARY_ITEM_CODE_MAX_LEN,
} from "../../../../src/modules/anketa-v2/utils/v2-schema-dictionary.util";
import { V2_ALL_DEFAULT_DICTIONARIES } from "../../../../src/modules/anketa-v2/constants/v2-default-dictionary-codes";
import { FACTORY_UI_ONLY_DICTIONARIES } from "../../../../src/modules/anketa-v2/constants/factory-ui-only-dictionaries";
import { buildWorkSchemaParamsFromTemplate } from "@smart-anketa/api-contract";

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
			"1_проведение_регулярной_валидации_регулятором_нормативно_не_установлено",
			"2_проведение_регулярной_валидации_регулятором_нормативно_не_установлено_модель_оценки_риска",
			"3_проведение_регулярной_валидации_регулятором_нормативно_не_установлено_заказчик_запрашивает_про",
			"4_банком_не_планируется_предоставление_модели_регулятору_но_регулярная_валидация_установлена_рег",
			"5_банком_планируется_предоставление_модели_регулятору_для_одобрения_к_использованию",
		]);
	});

	it("buildDictionariesFromUiSchemaReferences seeds legacy ui dictionary codes", () => {
		const { jsonSchema, uiSchema } = V2_DEFAULT_TEMPLATE_SNAPSHOT;
		const schemaCodes = new Set(
			buildDefaultDictionariesFromJsonSchema(jsonSchema).map((d) => d.code),
		);
		const uiDefs = buildDictionariesFromUiSchemaReferences(
			jsonSchema,
			uiSchema,
			schemaCodes,
			new Set(V2_DEFAULT_TEMPLATE_SNAPSHOT.dictionariesSnapshot.referencedDictionaryCodes ?? []),
		);
		const expectedLegacyCodes = [
			"v2.detailInfo.sourceSystems.items.field_p4zxdNZG",
			"v2.detailInfo.sourceSystems.items.field_K2ioHD8d",
			"v2.detailInfo.sourceSystems.items.field_HMnqITVb",
			"v2.detailInfo.sourceSystems.items.nda",
			"v2.detailInfo.dataProcess.workType",
			"v2.detailInfo.dataProcess.implComplexity",
			"v2.detailInfo.dataMart.deliveryMode",
			"v2.detailInfo.model.algorithmType",
			"v2.detailInfo.model.workType",
		];
		for (const code of expectedLegacyCodes) {
			expect(uiDefs.some((d) => d.code === code)).toBe(true);
		}
	});

	it("collectDictionaryBindingsFromUiSchema pairs ui path with dictionaryCode", () => {
		const bindings = collectDictionaryBindingsFromUiSchema(
			V2_DEFAULT_TEMPLATE_SNAPSHOT.uiSchema,
		);
		const confidential = bindings.find(
			(b) => b.dictionaryCode === "v2.detailInfo.sourceSystems.items.field_p4zxdNZG",
		);
		expect(confidential?.fieldPointer).toBe(
			"/detailInfo/sourceSystems/items/field_AKLVuyFy",
		);
	});

	it("uses the approved values for every factory field named Сложность реализации", () => {
		const params = buildWorkSchemaParamsFromTemplate({
			jsonSchema: V2_DEFAULT_TEMPLATE_SNAPSHOT.jsonSchema,
			uiSchema: V2_DEFAULT_TEMPLATE_SNAPSHOT.uiSchema,
		}).filter((param) => param.name === "Сложность реализации");
		expect(params).toHaveLength(3);
		for (const param of params) {
			expect(param.values?.map((value) => value.label).sort()).toEqual([
				"Высокая",
				"Неизвестно",
				"Низкая",
				"Средняя",
			].sort());
		}
	});

	it("FACTORY_UI_ONLY_DICTIONARIES покрыты заводским набором", () => {
		for (const def of FACTORY_UI_ONLY_DICTIONARIES) {
			expect(V2_ALL_DEFAULT_DICTIONARIES.some((d) => d.code === def.code)).toBe(
				true,
			);
		}
	});
});
