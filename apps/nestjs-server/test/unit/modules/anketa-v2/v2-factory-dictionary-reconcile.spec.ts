import { V2_ALL_DEFAULT_DICTIONARIES } from "../../../../src/modules/anketa-v2/constants/v2-default-dictionary-codes";
import { V2_FACTORY_TYPICAL_WORKS_SNAPSHOT } from "../../../../src/modules/anketa-v2/constants/v2-factory-typical-works-catalog";
import { V2DictionarySeedService } from "../../../../src/modules/anketa-v2/services/v2-dictionary-seed.service";
import { V2TypicalWorkParamCatalogService } from "../../../../src/modules/anketa-v2/services/v2-typical-work-param-catalog.service";
import { slugParamCode } from "../../../../src/modules/anketa-v2/utils/v2-typical-work-catalog.util";

describe("factory dictionary reconciliation", () => {
	it("replaces stale schema dictionary items with the repaired factory values", async () => {
		const code = "v2.detailInfo.sourceSystems.items.field_K2ioHD8d";
		const definition = V2_ALL_DEFAULT_DICTIONARIES.find(
			(item) => item.code === code,
		);
		expect(definition?.items.map((item) => item.label)).toEqual([
			"Односторонний",
			"Двусторонний",
			"Неизвестно",
		]);

		const dictionaryRepository = {
			findOne: jest.fn(async ({ where }: { where: { code: string } }) =>
				where.code === code ? { id: "dictionary-id", code } : null,
			),
		};
		const stale = {
			id: "stale-id",
			dictionaryId: "dictionary-id",
			code: "точечное",
			label: "Точечное",
			order: 0,
			isActive: true,
			parentCode: null,
			payload: null,
		};
		const itemRepository = {
			find: jest.fn(async () => [stale]),
			create: jest.fn((value) => value),
			save: jest.fn(async (value) => value),
			remove: jest.fn(async (value) => value),
		};
		const service = new V2DictionarySeedService(
			dictionaryRepository as never,
			itemRepository as never,
			{} as never,
		);

		await service.syncDefaultDictionaryItems();

		const insertedLabels = itemRepository.save.mock.calls.map(
			([value]) => value.label,
		);
		expect(insertedLabels).toEqual([
			"Односторонний",
			"Двусторонний",
			"Неизвестно",
		]);
		expect(itemRepository.remove).toHaveBeenCalledWith([stale]);
	});

	it("synchronizes factory typical-work parameter labels and coefficients", async () => {
		const dictionary = V2_FACTORY_TYPICAL_WORKS_SNAPSHOT.dictionaries.find(
			(item) => item.name === "Канал внедрения",
		);
		expect(dictionary).toBeDefined();
		const targetCode = slugParamCode(dictionary!.name);
		const paramRepository = {
			findOne: jest.fn(async ({ where }: { where: { code: string } }) => ({
				id: `param:${where.code}`,
				code: where.code,
				name: where.code,
				description: null,
			})),
			save: jest.fn(async (value) => value),
		};
		const stale = {
			id: "stale-value",
			paramId: `param:${targetCode}`,
			code: "точечное",
			label: "Точечное",
			coefficient: "1.00",
			sortOrder: 0,
			validFrom: "2020-01-01",
			validTo: null,
		};
		const valueRepository = {
			find: jest.fn(
				async ({ where }: { where: { paramId: string } }) =>
					where.paramId === `param:${targetCode}` ? [stale] : [],
			),
			create: jest.fn((value) => value),
			save: jest.fn(async (value) => value),
			remove: jest.fn(async (value) => value),
		};
		const service = new V2TypicalWorkParamCatalogService(
			paramRepository as never,
			valueRepository as never,
		);

		await service.ensureSeededFromFactorySnapshot();

		const targetValues = valueRepository.save.mock.calls
			.map(([value]) => value)
			.filter((value) => value.paramId === `param:${targetCode}`);
		expect(targetValues.map((value) => value.label)).toEqual(
			dictionary!.values.map((value) => value.label),
		);
		expect(targetValues.map((value) => value.coefficient)).toEqual(
			dictionary!.values.map((value) =>
				value.coeff == null ? null : String(value.coeff),
			),
		);
		expect(valueRepository.remove).toHaveBeenCalledWith([stale]);
	});
});
