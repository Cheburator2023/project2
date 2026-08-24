import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RJSFSchema } from "@rjsf/utils";
import {
	V2_ARCH_PARAM_GROUP_IDS,
	V2_ARCH_PARAM_GROUP_LABELS,
	V2_ARCH_PARAM_GROUPING_KINDS,
	V2_ARCH_PARAM_NOT_IN_CALCULATION_KEYS,
	buildArchParamFieldGroups,
	classifiedArchParamKeys,
	classifyArchParamField,
	inferV2ArchParamGroupingKind,
	normalizeParamLabel,
	orderArchParamFieldKeys,
	type V2ArchParamGroupId,
	type V2ArchParamGroupingKind,
} from "@smart-anketa/api-contract";

const snapshotPath = join(
	__dirname,
	"../../../../src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

type SnapshotFile = {
	jsonSchema: RJSFSchema;
	uiSchema: Record<string, unknown>;
};

const SNAPSHOT_PATHS: Record<
	V2ArchParamGroupingKind,
	{ schema: string; ui: string; leaf?: "items" }
> = {
	modelService: {
		schema: "generalInfo.modelService",
		ui: "generalInfo.modelService",
	},
	dataMart: { schema: "detailInfo.dataMart", ui: "detailInfo.dataMart" },
	dataProcess: {
		schema: "detailInfo.dataProcess",
		ui: "detailInfo.dataProcess",
	},
	sourceSystem: {
		schema: "detailInfo.sourceSystems",
		ui: "detailInfo.sourceSystems",
		leaf: "items",
	},
	model: {
		schema: "detailInfo.modelsList",
		ui: "detailInfo.modelsList",
		leaf: "items",
	},
};

/** Короткие названия из таблицы классификации (без имён экземпляров). */
const USER_TABLE: Record<
	V2ArchParamGroupingKind,
	Partial<Record<V2ArchParamGroupId, readonly string[]>>
> = {
	modelService: {
		common: [
			"Тип работ",
			"Необходимость пилота, MVP",
			"Необходимость поддержки проведения пилота",
			"Тип БД для BI-системы",
			"Способ загрузки данных в BI-систему",
		],
		mdlctl: ["Класс моделей", "Вид контроля"],
		pirm: [
			"Первичное подключение ИС к РЕПО",
			"Хранение артефактов в РЕПО",
			"Перекладка артефактов между контурами",
			"Использование данных СХК через РЕПО",
			"Требуется оркестратор ПИМ",
			"Требуется логирование ПИМ",
			"Требуется визуализация в SuperSet",
			"SuperSet: сложность развёртывания инстанса",
			"Требуется расширение инфраструктуры SSDP",
		],
	},
	dataMart: {
		common: [
			"Тип работ",
			"Необходимо уточнение требований по составу выгружаемых данных",
			"Содержит сырые данные",
			"Слой хранения",
			"Количество контролей качества признаков",
		],
		idsrc_ext: [
			"Требуется хэширование/шифрование",
			"Наличие конфиденциальных данных",
			"Двусторонний обмен данными",
			"Способ предоставления данных заказчику",
		],
		idsrc_int: ["Необходима продуктивизация", "Количество метрик"],
		pirm: [
			"Реализуется в Хранилище признаков",
			"Хранилище признаков: подключение нового источника",
			"Требуется сохранять сырые данные",
			"Требуется парсинг сырых данных",
			"Количество признаков в Наборе",
			"Сложность реализации Набора признаков",
			"Требуется контроль качества Признаков",
		],
	},
	dataProcess: {
		common: ["Тип работ", "Сложность реализации"],
		idsrc_ext: [
			"Способ предоставления данных заказчику",
			"Двусторонний обмен данными",
			"Требуется хэширование/шифрование",
			"Наличие конфиденциальных данных",
		],
		idsrc_int: ["Требуется интеграция с промежуточной системой, СХК/СФП"],
		pirm: ["Тип процесса обработки данных"],
	},
	sourceSystem: {
		common: [
			"Тип системы-источника",
			"Риск появления дополнительных систем-источников",
			"Необходим новый тракт данных от источника",
			"Сложность реализации",
		],
		idsrc_ext: [
			"Необходимо подтвердить возможность интеграции",
			"Сложность предметной области",
			"Количество сущностей, исходных таблиц",
			"Детализация и ясность постановки задачи",
			"NDA",
			"Наличие конфиденциальных данных",
			"Пилот",
			"Наличие юр. основания для пилота",
			"Требуется хэширование/шифрование",
			"Режим обмена данными",
			"Тип загрузки данных",
			"Предусмотрено проведение конкурса",
			"Форма договора",
		],
		idsrc_int: ["Наличие реплики в DAPP"],
		pirm: [
			"Маркер: требуется разметка данных источника",
			"Маркер: требуется новая модель для автоматической разметки данных",
			"Маркер: сложность настройки шаблона разметки",
			"Маркер: размер новой модели",
			"Маркер: требуется регламентный импорт/экспорт",
			"Маркер: сложность реализации интеграции",
			"Маркер: требуются специальные условия хранения",
			"Маркер: правила обработки данных",
			"Маркер: требуется ручная обработка результатов",
			"Маркер: сложность развёртывания отдельного инстанса ручной разметки",
		],
	},
	model: {
		common: [
			"Тип работ",
			"Наличие готовых промышленных витрин",
			"Сложность алгоритма / тип ML задачи",
			"Каналы внедрения",
			"Роль модели",
			"Необходимость AutoML",
		],
		pirm: [
			"AutoML: встраивание внешнего кода",
			"AutoML: преобразование данных",
			"AutoML: постановка на регламент",
			"AutoML: новая библиотека",
			"Требуется новая библиотека / базовая модель",
		],
	},
};

function schemaAt(
	root: RJSFSchema,
	path: string,
	leaf?: "items",
): Record<string, unknown> {
	let cur: RJSFSchema | undefined = root;
	for (const seg of path.split(".")) {
		cur = (cur?.properties as Record<string, RJSFSchema> | undefined)?.[seg];
	}
	if (leaf) {
		cur = (cur as Record<string, RJSFSchema> | undefined)?.[leaf];
	}
	return (cur ?? {}) as Record<string, unknown>;
}

function uiAt(
	root: Record<string, unknown>,
	path: string,
	leaf?: "items",
): Record<string, unknown> {
	let cur: unknown = root;
	for (const seg of path.split(".")) {
		cur = (cur as Record<string, unknown> | undefined)?.[seg];
	}
	if (leaf) {
		cur = (cur as Record<string, unknown> | undefined)?.[leaf];
	}
	return (cur ?? {}) as Record<string, unknown>;
}

function schemaProperties(
	node: Record<string, unknown>,
): Record<string, { title?: string }> {
	const props = (node.properties ??
		(node.items as { properties?: unknown } | undefined)?.properties) as
		| Record<string, { title?: string }>
		| undefined;
	return props ?? {};
}

function schemaPropertyKeys(node: Record<string, unknown>): string[] {
	return Object.keys(schemaProperties(node));
}

function readUiOrder(node: Record<string, unknown>): string[] {
	const order = node["ui:order"];
	return Array.isArray(order)
		? order.filter((key): key is string => typeof key === "string")
		: [];
}

function wordsInOrder(haystack: string, needle: string): boolean {
	const a = normalizeParamLabel(haystack);
	const b = normalizeParamLabel(needle);
	if (!a || !b) return false;
	if (a === b || a.includes(b) || b.includes(a)) return true;
	const words = b.split(" ").filter((word) => word.length > 1);
	if (words.length === 0) return false;
	let from = 0;
	for (const word of words) {
		const found = a.indexOf(word, from);
		if (found < 0) return false;
		from = found + word.length;
	}
	return true;
}

function matchUserTitleToKey(
	props: Record<string, { title?: string }>,
	userTitle: string,
	used: Set<string>,
): string {
	const entries = Object.entries(props).filter(([key]) => !used.has(key));
	const exact = entries.filter(
		([, spec]) =>
			typeof spec.title === "string" &&
			normalizeParamLabel(spec.title) === normalizeParamLabel(userTitle),
	);
	if (exact.length === 1) return exact[0]![0];
	const fuzzy = entries.filter(
		([, spec]) =>
			typeof spec.title === "string" && wordsInOrder(spec.title, userTitle),
	);
	if (fuzzy.length === 1) return fuzzy[0]![0];
	const shortest = [...fuzzy].sort(
		(a, b) => (a[1].title?.length ?? 0) - (b[1].title?.length ?? 0),
	)[0];
	if (fuzzy.length > 1 && shortest) {
		const uniqueShort =
			fuzzy.filter(
				([, spec]) => spec.title?.length === shortest[1].title?.length,
			).length === 1;
		if (uniqueShort) return shortest[0];
	}
	throw new Error(
		`Не удалось однозначно сопоставить «${userTitle}»: exact=${exact.map((e) => e[0]).join(",")} fuzzy=${fuzzy.map((e) => e[0]).join(",")}`,
	);
}

describe("v2-arch-param-classification util", () => {
	it("держит фиксированный порядок групп", () => {
		expect([...V2_ARCH_PARAM_GROUP_IDS]).toEqual([
			"common",
			"idsrc_ext",
			"idsrc_int",
			"mdlctl",
			"pirm",
			"model_streams",
		]);
		expect(V2_ARCH_PARAM_GROUP_LABELS.pirm).toBe("ПиРМ");
	});

	it("кладёт неизвестные ключи в Общие и не создаёт пустые уникальные группы", () => {
		const groups = buildArchParamFieldGroups("model", [
			"workType",
			"custom_new",
			"autoML",
			"field_58TkWuwu",
		]);
		expect(groups.map((group) => group.id)).toEqual(["common", "pirm"]);
		expect(groups[0]?.keys).toEqual(["workType", "autoML", "custom_new"]);
	});

	it("не группирует чужие объекты по одному общему ключу", () => {
		expect(
			inferV2ArchParamGroupingKind({ propertyKeys: ["workType"] }),
		).toBeNull();
		expect(
			inferV2ArchParamGroupingKind({
				archComponent: "typicalWork",
				propertyKeys: ["name", "total"],
			}),
		).toBeNull();
	});
});

describe("классификация параметров арх. компонентов", () => {
	const file = JSON.parse(readFileSync(snapshotPath, "utf-8")) as SnapshotFile;

	it.each([...V2_ARCH_PARAM_GROUPING_KINDS])(
		"%s: все поля схемы классифицированы, ui:order совпадает с таблицей",
		(kind) => {
			const path = SNAPSHOT_PATHS[kind];
			const schemaNode = schemaAt(file.jsonSchema, path.schema, path.leaf);
			const uiNode = uiAt(file.uiSchema, path.ui, path.leaf);
			const keys = schemaPropertyKeys(schemaNode);
			expect(keys.sort()).toEqual([...classifiedArchParamKeys(kind)].sort());
			expect(readUiOrder(uiNode)).toEqual(orderArchParamFieldKeys(kind, keys));
			for (const key of V2_ARCH_PARAM_NOT_IN_CALCULATION_KEYS[kind]) {
				expect(classifyArchParamField(kind, key)).toBe("common");
			}
		},
	);

	it.each([...V2_ARCH_PARAM_GROUPING_KINDS])(
		"%s: состав таблицы классификации 1:1 по названиям",
		(kind) => {
			const path = SNAPSHOT_PATHS[kind];
			const schemaNode = schemaAt(file.jsonSchema, path.schema, path.leaf);
			const props = schemaProperties(schemaNode);
			const used = new Set<string>();
			const table = USER_TABLE[kind];
			for (const [groupId, titles] of Object.entries(table) as Array<
				[V2ArchParamGroupId, readonly string[]]
			>) {
				for (const title of titles) {
					const key = matchUserTitleToKey(props, title, used);
					used.add(key);
					expect({
						title,
						key,
						group: classifyArchParamField(kind, key),
					}).toEqual({
						title,
						key,
						group: groupId,
					});
				}
			}
			const leftover = Object.keys(props).filter((key) => !used.has(key));
			for (const key of leftover) {
				expect(props[key]?.title).toMatch(/^Название/);
				expect(classifyArchParamField(kind, key)).toBe("common");
			}
		},
	);
});
