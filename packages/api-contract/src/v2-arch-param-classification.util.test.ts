import { describe, expect, it } from "vitest";
import {
	V2_ARCH_PARAM_CLASSIFICATION,
	V2_ARCH_PARAM_GROUP_IDS,
	V2_ARCH_PARAM_GROUP_LABELS,
	V2_ARCH_PARAM_GROUPING_KINDS,
	V2_ARCH_PARAM_NOT_IN_CALCULATION_KEYS,
	buildArchParamFieldGroups,
	classifiedArchParamKeys,
	classifyArchParamField,
	inferV2ArchParamGroupingKind,
	mapArchParamFieldGroups,
	orderArchParamFieldKeys,
	resolveArchParamFieldGroupsForObject,
	resolveArchParamGroupLabelAtIndex,
} from "./v2-arch-param-classification.util";

describe("v2-arch-param-classification", () => {
	it("держит фиксированный порядок групп: Общие, затем стримы", () => {
		expect([...V2_ARCH_PARAM_GROUP_IDS]).toEqual([
			"common",
			"idsrc_ext",
			"idsrc_int",
			"mdlctl",
			"pirm",
			"model_streams",
		]);
		expect(V2_ARCH_PARAM_GROUP_LABELS.common).toBe("Общие");
		expect(V2_ARCH_PARAM_GROUP_LABELS.idsrc_ext).toBe(
			"Источники данных внешние",
		);
		expect(V2_ARCH_PARAM_GROUP_LABELS.idsrc_int).toBe(
			"Источники данных внутренние",
		);
		expect(V2_ARCH_PARAM_GROUP_LABELS.mdlctl).toBe("Контроль моделей");
		expect(V2_ARCH_PARAM_GROUP_LABELS.pirm).toBe("ПиРМ");
		expect(V2_ARCH_PARAM_GROUP_LABELS.model_streams).toBe("Модельные стримы");
	});

	it("не дублирует ключи между группами одного компонента", () => {
		for (const kind of V2_ARCH_PARAM_GROUPING_KINDS) {
			const keys = classifiedArchParamKeys(kind);
			expect(new Set(keys).size).toBe(keys.length);
		}
	});

	it("поля «не участвует в расчётах» относятся только к Общим", () => {
		for (const kind of V2_ARCH_PARAM_GROUPING_KINDS) {
			for (const key of V2_ARCH_PARAM_NOT_IN_CALCULATION_KEYS[kind]) {
				expect(classifyArchParamField(kind, key)).toBe("common");
				expect(V2_ARCH_PARAM_CLASSIFICATION[kind].common?.includes(key)).toBe(
					true,
				);
			}
		}
	});

	it("не оставляет пустых уникальных групп и кладёт неизвестные ключи в Общие", () => {
		const groups = buildArchParamFieldGroups("model", [
			"workType",
			"custom_new",
			"autoML",
			"field_58TkWuwu",
		]);
		expect(groups.map((group) => group.id)).toEqual(["common", "pirm"]);
		expect(groups[0]?.keys).toEqual(["workType", "autoML", "custom_new"]);
		expect(groups[1]?.keys).toEqual(["field_58TkWuwu"]);
	});

	it("сохраняет канонический порядок внутри группы независимо от входного", () => {
		expect(
			orderArchParamFieldKeys("modelService", [
				"field_SvNx6iEq",
				"field_UNSRK-JY",
				"workType",
				"modelClass",
				"field_dEVFQVQn",
			]),
		).toEqual([
			"field_dEVFQVQn",
			"workType",
			"modelClass",
			"field_SvNx6iEq",
			"field_UNSRK-JY",
		]);
	});

	it("ставит заголовок группы только на первое поле группы", () => {
		const keys = orderArchParamFieldKeys("dataProcess", [
			"field_HgUCNn6E",
			"field_yJ51GkCR",
			"deliveryMode",
			"field_qMxSfHk1",
		]);
		expect(keys).toEqual([
			"field_yJ51GkCR",
			"deliveryMode",
			"field_qMxSfHk1",
			"field_HgUCNn6E",
		]);
		expect(
			keys.map((key, index) =>
				resolveArchParamGroupLabelAtIndex("dataProcess", keys, index),
			),
		).toEqual([
			"Общие",
			"Источники данных внешние",
			"Источники данных внутренние",
			"ПиРМ",
		]);
	});

	it("распознаёт компонент по набору ключей, если нет archComponent", () => {
		expect(
			inferV2ArchParamGroupingKind({
				propertyKeys: ["field_LGUdr5mq", "type", "field_8pFvwc-v"],
			}),
		).toBe("sourceSystem");
		expect(
			inferV2ArchParamGroupingKind({
				archComponent: "typicalWork",
				propertyKeys: ["name", "total"],
			}),
		).toBeNull();
		expect(
			inferV2ArchParamGroupingKind({
				propertyKeys: ["workType"],
			}),
		).toBeNull();
		for (const kind of V2_ARCH_PARAM_GROUPING_KINDS) {
			expect(
				inferV2ArchParamGroupingKind({
					propertyKeys: classifiedArchParamKeys(kind),
				}),
			).toBe(kind);
		}
	});

	it("mapArchParamFieldGroups сохраняет элементы и не дублирует ключи", () => {
		const mapped = mapArchParamFieldGroups(
			"modelService",
			[{ name: "modelClass" }, { name: "workType" }, { name: "modelClass" }],
			(item) => item.name,
		);
		expect(mapped.map((group) => group.id)).toEqual(["common", "mdlctl"]);
		expect(mapped[0]?.items).toEqual([{ name: "workType" }]);
		expect(mapped[1]?.items).toEqual([{ name: "modelClass" }]);
	});

	it("resolveArchParamFieldGroupsForObject не группирует чужие объекты", () => {
		expect(
			resolveArchParamFieldGroupsForObject({
				propertyKeys: ["foo", "bar"],
			}),
		).toBeNull();
		expect(
			resolveArchParamFieldGroupsForObject({
				archComponent: "modelService",
				propertyKeys: ["workType", "modelClass"],
			})?.map((group) => group.id),
		).toEqual(["common", "mdlctl"]);
	});
});
