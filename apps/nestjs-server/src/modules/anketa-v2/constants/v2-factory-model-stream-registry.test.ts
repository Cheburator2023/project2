import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	V2_MODEL_STREAM_FACTORY_WORK_IDS,
	V2_MODEL_STREAM_EXECUTOR,
	V2_MODEL_STREAM_ALWAYS_SHOWN_WORK_IDS,
	V2_MODEL_STREAM_ALWAYS_ACTIVE_WORK_IDS,
	typicalWorkAssignedToExecutorStream,
	V2_IMPLEMENTATION_STREAM,
	V2_MODEL_IMPLEMENTATION_STREAM_CODES,
} from "@smart-anketa/api-contract";

type RegistryItem = {
	id: string;
	name: string;
	archComponentType: string;
	streams: string[];
	normsByStream: Record<string, number | null>;
};

type CatalogWork = {
	stream: string;
	stage: string;
	name: string;
	component: string;
	triggerMode?: string;
	triggerArchCount?: { kind: string } | null;
	triggerFormula?: { tokens?: unknown[] } | null;
	laborCoefficients?: Array<{
		paramCode: string;
		values: Array<{ label: string; coefficient: number }>;
	}>;
	laborArchCounts?: Array<{ kind: string }> | null;
	formulaText?: string;
};

describe("factory model stream registry assignments", () => {
	it("assigns 10 model works to mother stream only (current.json etalon)", () => {
		const registry = JSON.parse(
			readFileSync(
				join(__dirname, "v2-factory-template-typical-works.registry.json"),
				"utf8",
			),
		) as { works?: RegistryItem[]; items?: RegistryItem[] };
		const items = registry.works ?? registry.items ?? [];

		for (const workId of V2_MODEL_STREAM_FACTORY_WORK_IDS) {
			const item = items.find((entry) => entry.id === workId);
			expect(item, workId).toBeDefined();
			expect(item!.streams).toEqual([V2_MODEL_STREAM_EXECUTOR]);
			expect(item!.normsByStream[V2_MODEL_STREAM_EXECUTOR]).toEqual(
				expect.any(Number),
			);
			/** Mother umbrella still covers child implementation streams at runtime. */
			for (const code of V2_MODEL_IMPLEMENTATION_STREAM_CODES) {
				expect(
					typicalWorkAssignedToExecutorStream(item!.streams, code),
				).toBe(true);
			}
			expect(
				typicalWorkAssignedToExecutorStream(
					item!.streams,
					V2_IMPLEMENTATION_STREAM.IDSRC,
				),
			).toBe(false);
		}
	});

	it("keeps ALWAYS_SHOWN/ACTIVE empty — works appear only by trigger", () => {
		expect(V2_MODEL_STREAM_ALWAYS_SHOWN_WORK_IDS.size).toBe(0);
		expect(V2_MODEL_STREAM_ALWAYS_ACTIVE_WORK_IDS.size).toBe(0);
	});

	it("aligns catalog snapshot with CSV arch/triggers/labor/formulas", () => {
		const snapshot = JSON.parse(
			readFileSync(
				join(__dirname, "v2-factory-typical-works.snapshot.json"),
				"utf8",
			),
		) as { typicalWorks: CatalogWork[] };
		const registry = JSON.parse(
			readFileSync(
				join(__dirname, "v2-factory-template-typical-works.registry.json"),
				"utf8",
			),
		) as { works: RegistryItem[] };

		const modelWorks = snapshot.typicalWorks.filter(
			(row) => row.stream === V2_MODEL_STREAM_EXECUTOR,
		);
		expect(modelWorks).toHaveLength(10);

		const byStage = Object.fromEntries(
			modelWorks.map((row) => [`${row.stage}|${row.name}`, row]),
		);

		expect(byStage["01|Постановка задачи"]?.component).toBe("Модель");
		expect(byStage["01|Постановка задачи"]?.triggerArchCount?.kind).toBe(
			"model",
		);
		expect(byStage["01|Постановка задачи"]?.formulaText).toContain(
			"архкоэф(Модели",
		);

		expect(byStage["05B|Пилотирование модели"]?.triggerMode).toBe("formula");
		expect(
			byStage["05B|Пилотирование модели"]?.laborArchCounts?.some(
				(row) => row.kind === "model",
			),
		).toBe(true);
		expect(byStage["05B|Пилотирование модели"]?.formulaText).toContain(
			"архкоэф(Модели",
		);

		const prod = byStage[
			"07|Разработка витрины для применения модели"
		]?.laborCoefficients?.find(
			(row) => row.paramCode === "productionAdditionalReports",
		);
		expect(prod?.values[0]).toMatchObject({
			label: "Не требуется",
			coefficient: 0,
		});
		expect(prod?.values.find((row) => row.label === "3")?.coefficient).toBe(
			2.5,
		);

		expect(byStage["AutoML|разработка"]?.triggerArchCount?.kind).toBe(
			"modelService",
		);
		expect(byStage["09|Адаптация и внедрение модели"]?.triggerMode).toBe(
			"formula",
		);

		const reg01 = registry.works.find(
			(row) => row.id === V2_MODEL_STREAM_FACTORY_WORK_IDS[0],
		);
		expect(reg01?.archComponentType).toBe("Модель");
		expect(reg01?.name).toBe("01. Постановка задачи");
	});
});
