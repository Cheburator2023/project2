import { describe, expect, it } from "vitest";
import type { V2TypicalWorkCardDto } from "@smart-anketa/api-contract";
import {
	buildNormalizedEditorSnapshotDump,
	buildSnapshotChangesReport,
	formatEditorSnapshotDumpJson,
	typicalWorkEntityKey,
	typicalWorkStableKey,
} from "./schemaEditorEtalonDiff";

describe("schemaEditorEtalonDiff", () => {
	const baseCard = (
		overrides: Partial<V2TypicalWorkCardDto> &
			Pick<V2TypicalWorkCardDto, "id" | "name">,
	): V2TypicalWorkCardDto =>
		({
			archComponentType: "Компонент",
			workType: null,
			streamExecutor: "de",
			triggerStatus: "ok",
			norms: [],
			rules: [
				{
					id: "rule-1",
					streamExecutor: "de",
					paramCode: "__always__",
					paramName: "Нет — работа выводится всегда",
					operator: "=",
					valueCode: null,
					valueLabel: null,
				},
			],
			laborParams: [],
			formula: { tokens: [], text: "N" },
			rounding: { mode: "NONE", step: null },
			assignmentId: `${overrides.id}-asg`,
			assignmentStatus: "free",
			usedOnSchemasCount: 0,
			formulaBadge: "simple",
			...overrides,
		}) as V2TypicalWorkCardDto;

	it("maps work ids to stable keys so clones compare equal", () => {
		const etalonWorks = [
			baseCard({
				id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
				name: "Airflow",
			}),
		];
		const cloneWorks = [
			baseCard({
				id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
				name: "Airflow",
				usedOnSchemasCount: 3,
				assignmentStatus: "used_on_schemas",
			}),
		];

		const etalon = formatEditorSnapshotDumpJson({
			jsonSchema: { properties: {} },
			uiSchema: {
				block: {
					"ui:options": {
						boundWorkIds: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
					},
				},
			},
			logic: { rules: [] },
			dictionariesSnapshot: null,
			typicalWorks: etalonWorks,
		});
		const current = formatEditorSnapshotDumpJson({
			jsonSchema: { properties: {} },
			uiSchema: {
				block: {
					"ui:options": {
						boundWorkIds: ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
					},
				},
			},
			logic: { rules: [] },
			dictionariesSnapshot: null,
			typicalWorks: cloneWorks,
		});

		expect(typicalWorkStableKey(etalonWorks[0])).toBe("Компонент|Airflow|de");
		expect(typicalWorkEntityKey(etalonWorks[0])).toBe("Компонент|Airflow");
		expect(etalon).toBe(current);
	});

	it("maps factory registry ids via workRefIndex against clone uuids", () => {
		const factoryId = "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4001";
		const cloneId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
		const workRefIndex = [
			{
				id: factoryId,
				name: "01. Постановка задачи",
				archComponentType: "Модельный сервис",
			},
		];
		const cloneWorks = [
			baseCard({
				id: cloneId,
				name: "01. Постановка задачи",
				archComponentType: "Модельный сервис",
				streamExecutor: "Моделирование RnD",
			}),
		];
		const etalonWorks = [
			baseCard({
				id: factoryId,
				name: "01. Постановка задачи",
				archComponentType: "Модельный сервис",
				streamExecutor: "Моделирование RnD",
			}),
		];

		const report = buildSnapshotChangesReport({
			etalonLabel: "builtin",
			etalon: {
				jsonSchema: {},
				uiSchema: {},
				logic: {
					rules: [
						{
							id: "catalog",
							payload: { allowedWorkIds: [factoryId] },
						},
					],
				},
				typicalWorks: etalonWorks,
				workRefIndex,
			},
			current: {
				jsonSchema: {},
				uiSchema: {},
				logic: {
					rules: [
						{
							id: "catalog",
							payload: { allowedWorkIds: [cloneId] },
						},
					],
				},
				typicalWorks: cloneWorks,
				workRefIndex,
			},
		});

		expect(report).toContain("Отличий нет");
	});

	it("reports typical work rule changes", () => {
		const workId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		const etalon = baseCard({
			id: workId,
			name: "Airflow",
			rules: [
				{
					id: "r1",
					streamExecutor: "de",
					paramCode: "__always__",
					paramName: "Нет — работа выводится всегда",
					operator: "=",
					valueCode: null,
					valueLabel: null,
				},
			],
		});
		const current = baseCard({
			id: workId,
			name: "Airflow",
			rules: [
				{
					id: "r2",
					streamExecutor: "de",
					paramCode: "complexity",
					paramName: "Сложность",
					operator: "=",
					valueCode: "high",
					valueLabel: "Высокая",
				},
			],
		});

		const report = buildSnapshotChangesReport({
			etalon: {
				jsonSchema: {},
				uiSchema: {},
				logic: { rules: [] },
				typicalWorks: [etalon],
			},
			current: {
				jsonSchema: {},
				uiSchema: {},
				logic: { rules: [] },
				typicalWorks: [current],
			},
		});

		expect(report).toContain("typicalWorks");
		expect(report).toContain("rules");
		expect(report).not.toContain("Отличий нет");
	});

	it("ignores reconcile paramName suffix and paramCode rewrites", () => {
		const workId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		const etalon = baseCard({
			id: workId,
			name: "Airflow",
			rules: [
				{
					id: "r1",
					streamExecutor: "de",
					paramCode: "необходимость_пилота_mvp",
					paramName: "Необходимость пилота (MVP)",
					operator: "=",
					valueCode: "yes",
					valueLabel: "Да",
				},
			],
		});
		const current = baseCard({
			id: workId,
			name: "Airflow",
			rules: [
				{
					id: "r2",
					streamExecutor: "de",
					paramCode: "field_o_HRj6VO",
					paramName:
						"Необходимость пилота (MVP) @ field_o_HRj6VO|необходимость_пилота_mvp",
					operator: "=",
					valueCode: null,
					valueLabel: null,
				},
			],
		});

		const report = buildSnapshotChangesReport({
			etalon: {
				jsonSchema: {},
				uiSchema: {},
				logic: { rules: [] },
				typicalWorks: [etalon],
			},
			current: {
				jsonSchema: {},
				uiSchema: {},
				logic: { rules: [] },
				typicalWorks: [current],
			},
		});

		expect(report).toContain("Отличий нет");
	});

	it("reports only real changes without dumping etalon", () => {
		const report = buildSnapshotChangesReport({
			etalonLabel: "Эталон X",
			etalon: {
				jsonSchema: { title: "A" },
				uiSchema: {},
				logic: { rules: [] },
				typicalWorks: [],
			},
			current: {
				jsonSchema: { title: "B" },
				uiSchema: {},
				logic: { rules: [] },
				typicalWorks: [],
			},
		});

		expect(report).toContain("Изменения относительно: Эталон X");
		expect(report).toContain("~ jsonSchema.title");
		expect(report).toContain('"A" → "B"');
		expect(report).not.toContain('"jsonSchema":');
		expect(
			buildNormalizedEditorSnapshotDump({
				jsonSchema: { title: "A" },
				uiSchema: {},
				logic: { rules: [] },
				typicalWorks: [],
			}),
		).not.toEqual(
			buildNormalizedEditorSnapshotDump({
				jsonSchema: { title: "B" },
				uiSchema: {},
				logic: { rules: [] },
				typicalWorks: [],
			}),
		);
	});

	it("prints full allowedWorkIds without truncation", () => {
		const ids = [
			"Модельный сервис|1. Качество модельных данных [КД]",
			"Модельный сервис|2. Технический контроль [ТМ]",
			"Модельный сервис|3. Оперативный контроль [ОК]",
			"Модельный сервис|4. Аналитический контроль [АК]",
			"Модельный сервис|5. Контроль модельных значений [КМЗ]",
			"Модельный сервис|Оценка влияния моделей [ОВ]",
			"Модельный сервис|Разработка интеграционного решения",
			"Модельный сервис|Дополнительная длинная работа для проверки полного вывода",
		];
		const report = buildSnapshotChangesReport({
			etalon: {
				jsonSchema: {},
				uiSchema: {},
				logic: { rules: [] },
				typicalWorks: [],
			},
			current: {
				jsonSchema: {},
				uiSchema: {
					streamModelControl: {
						field_G0AoYAl8: {
							"ui:options": { boundWorkIds: ids },
						},
					},
				},
				logic: { rules: [] },
				typicalWorks: [],
			},
		});

		expect(report).not.toContain("…");
		for (const id of ids) {
			expect(report).toContain(id);
		}
	});

	it("reports no changes for identical normalized dumps", () => {
		const dump = {
			jsonSchema: { title: "Same" },
			uiSchema: {},
			logic: { rules: [] },
			typicalWorks: [] as V2TypicalWorkCardDto[],
		};
		const report = buildSnapshotChangesReport({
			etalon: dump,
			current: dump,
		});
		expect(report).toContain("Отличий нет");
	});
});
