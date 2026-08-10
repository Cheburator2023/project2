#!/usr/bin/env tsx
/**
 * Импорт типовых работ стрима ПиРМ из llm export в factory bundle:
 * - registry
 * - catalog snapshot
 * - привязка boundWorkIds + logic rule в эталонной схеме
 *
 *   npx tsx scripts/import-pirm-to-factory.ts --write
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	patchV2TypicalWorksLogicRules,
	syncTypicalWorksCatalogLogicSnapshot,
	V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_CODE,
	V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_NAME,
} from "@smart-anketa/api-contract";
import type { V2FactoryTypicalWork } from "../src/modules/anketa-v2/constants/v2-factory-typical-works-catalog";
import type { V2FactoryTemplateTypicalWorkRegistryItem } from "../src/modules/anketa-v2/constants/v2-factory-template-typical-works-registry";
import { normalizeArchComponentType } from "../src/modules/anketa-v2/utils/v2-typical-work-catalog.util";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");
const EXPORT_PATH = join(
	REPO_ROOT,
	"llm/v2_model_stream_works_and_total/typical-works-ПиРМ.json",
);
const SNAPSHOT_PATH = join(
	__dirname,
	"..",
	"src/modules/anketa-v2/constants/v2-factory-typical-works.snapshot.json",
);
const REGISTRY_PATH = join(
	__dirname,
	"..",
	"src/modules/anketa-v2/constants/v2-factory-template-typical-works.registry.json",
);
const ANKETA_SNAPSHOT_PATH = join(
	__dirname,
	"..",
	"src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

const PIRM_STREAM = "ПиРМ";
const PIRM_OUTPUT_PATH = "field_aJEu5ziT.sourceTypicalTasks";

type ExportFile = {
	typicalWorks: Array<{
		id: string;
		name: string;
		archComponentType: string;
		workType: string | null;
	}>;
	typicalWorkNorms: Array<{
		workId: string;
		streamExecutor: string;
		normValue: string;
	}>;
	typicalWorkRules: Array<{
		workId: string;
		streamExecutor: string;
		paramCode: string;
		paramName: string;
		operator: string;
		valueCode: string | null;
		valueLabel: string | null;
		valueCodes: Array<{ code: string; label: string }> | null;
	}>;
};

type RegistryFile = {
	meta: Record<string, unknown> & {
		counts?: { works?: number };
	};
	works: V2FactoryTemplateTypicalWorkRegistryItem[];
};

type SnapshotFile = {
	meta: Record<string, unknown>;
	typicalWorks: V2FactoryTypicalWork[];
	dictionaries: unknown[];
};

type AnketaSnapshotFile = {
	jsonSchema: Record<string, unknown>;
	uiSchema: Record<string, unknown>;
	logic: Record<string, unknown>;
	dictionariesSnapshot?: Record<string, unknown>;
};

function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(path, "utf8")) as T;
}

function updateSnapshotMeta(snapshot: SnapshotFile): void {
	const streams = new Set<string>();
	const components = new Set<string>();
	const stages = new Set<string>();
	let withNorm = 0;
	let withFormula = 0;
	for (const row of snapshot.typicalWorks) {
		if (row.stream?.trim()) streams.add(row.stream.trim());
		if (row.component?.trim()) components.add(row.component.trim());
		if (row.stage?.trim()) stages.add(row.stage.trim());
		if (row.norm != null) withNorm += 1;
		if (row.formulaText?.trim()) withFormula += 1;
	}
	snapshot.meta = {
		...snapshot.meta,
		counts: {
			typicalWorks: snapshot.typicalWorks.length,
			typicalWorksWithNorm: withNorm,
			dictionaries: Array.isArray(snapshot.dictionaries)
				? snapshot.dictionaries.length
				: 0,
			streams: streams.size,
			components: components.size,
			stages: stages.size,
			typicalWorksWithFormula: withFormula,
		},
		streams: [...streams],
		components: [...components],
		stages: [...stages],
	};
}

function catalogKey(stream: string, component: string, name: string): string {
	return `${stream}|${normalizeArchComponentType(component)}|${name.trim()}`;
}

function buildTriggerRules(
	rules: ExportFile["typicalWorkRules"],
): NonNullable<V2FactoryTypicalWork["triggerRules"]> {
	if (rules.length === 0) {
		return [
			{
				paramName: V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_NAME,
				paramCode: V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_CODE,
				operator: "exists",
				values: [],
			},
		];
	}

	return rules.map((rule) => {
		const values: string[] = [];
		if (rule.valueCodes?.length) {
			for (const item of rule.valueCodes) {
				if (item.label?.trim()) values.push(item.label.trim());
				else if (item.code?.trim()) values.push(item.code.trim());
			}
		} else if (rule.valueLabel?.trim()) {
			values.push(rule.valueLabel.trim());
		} else if (rule.valueCode?.trim()) {
			values.push(rule.valueCode.trim());
		}

		const operator =
			values.length === 0
				? ("exists" as const)
				: rule.operator === "!=" || rule.operator === "in"
					? (rule.operator as "=" | "!=" | "in")
					: ("=" as const);

		return {
			paramName: rule.paramName.trim(),
			paramCode: rule.paramCode.trim() || undefined,
			operator,
			values,
		};
	});
}

function patchAnketaSnapshot(
	anketa: AnketaSnapshotFile,
	workIds: string[],
): boolean {
	const uiRoot = anketa.uiSchema as Record<string, unknown>;
	const pirm = (uiRoot.field_aJEu5ziT ?? {}) as Record<string, unknown>;
	const tasks = (pirm.sourceTypicalTasks ?? {}) as Record<string, unknown>;
	const prevOpts = (tasks["ui:options"] ?? {}) as Record<string, unknown>;
	const nextOpts = {
		...prevOpts,
		archComponent: "typicalWork",
		streamExecutor: PIRM_STREAM,
		boundWorkIds: [...workIds],
	};

	uiRoot.field_aJEu5ziT = {
		...pirm,
		sourceTypicalTasks: {
			...tasks,
			"ui:options": nextOpts,
			"ui:readonly": true,
			"ui:description":
				"Список заполняется автоматически при срабатывании триггеров типовых работ.\n\nПоля: Название типовой работы · Базовая оценка · Коэффициент · Итог\nСуммарный итог — при нескольких работах",
		},
	};

	const patchedLogic = patchV2TypicalWorksLogicRules(
		anketa.logic as never,
		{
			jsonSchema: anketa.jsonSchema,
			uiSchema: anketa.uiSchema,
		},
	);
	anketa.logic = syncTypicalWorksCatalogLogicSnapshot(
		patchedLogic,
		{
			jsonSchema: anketa.jsonSchema,
			uiSchema: anketa.uiSchema,
		},
	) as Record<string, unknown>;

	const ruleId = `typical-works-catalog-${PIRM_OUTPUT_PATH.replace(/\./g, "-")}`;
	const hasRule = (anketa.logic.rules as Array<{ id?: string }> | undefined)?.some(
		(rule) => rule.id === ruleId,
	);
	return Boolean(hasRule);
}

function main(): void {
	const write = process.argv.includes("--write");
	const exported = readJson<ExportFile>(EXPORT_PATH);
	const registry = readJson<RegistryFile>(REGISTRY_PATH);
	const snapshot = readJson<SnapshotFile>(SNAPSHOT_PATH);
	const anketa = readJson<AnketaSnapshotFile>(ANKETA_SNAPSHOT_PATH);

	const normsByWork = new Map(
		exported.typicalWorkNorms.map((row) => [
			row.workId,
			Number(row.normValue),
		]),
	);
	const rulesByWork = new Map<string, ExportFile["typicalWorkRules"]>();
	for (const rule of exported.typicalWorkRules) {
		const list = rulesByWork.get(rule.workId) ?? [];
		list.push(rule);
		rulesByWork.set(rule.workId, list);
	}

	const registryById = new Map(registry.works.map((work) => [work.id, work]));
	const snapshotIndex = new Map<string, number>();
	snapshot.typicalWorks.forEach((row, index) => {
		snapshotIndex.set(
			catalogKey(row.stream, row.component, row.name),
			index,
		);
	});

	let registryAdded = 0;
	let registryUpdated = 0;
	let snapshotAdded = 0;
	let snapshotUpdated = 0;
	const workIds: string[] = [];

	for (const work of exported.typicalWorks) {
		const id = work.id.trim();
		const name = work.name.trim();
		const archComponentType = normalizeArchComponentType(
			work.archComponentType,
		);
		const workType = work.workType?.trim() || null;
		const norm = normsByWork.get(id) ?? null;
		workIds.push(id);

		const existingRegistry = registryById.get(id);
		const registryEntry: V2FactoryTemplateTypicalWorkRegistryItem = {
			id,
			name,
			archComponentType,
			workType,
			streams: [PIRM_STREAM],
			normsByStream: {
				[PIRM_STREAM]: norm,
			},
		};
		if (!existingRegistry) {
			registry.works.push(registryEntry);
			registryById.set(id, registryEntry);
			registryAdded += 1;
		} else {
			Object.assign(existingRegistry, registryEntry);
			registryUpdated += 1;
		}

		const triggerRules = buildTriggerRules(rulesByWork.get(id) ?? []);
		const triggerParams = triggerRules.map((rule) => rule.paramName);
		const catalogRow: V2FactoryTypicalWork = {
			stream: PIRM_STREAM,
			component: archComponentType,
			stage: "",
			name,
			originalName: name,
			workType: workType ?? "Опциональная",
			norm,
			normRaw: norm == null ? "" : String(norm),
			triggerParam: triggerParams[0] ?? "",
			triggerParams,
			triggerRules,
			laborParams: [],
			formulaText: "N",
			roundingMode: "CEIL",
			roundingStep: 0.1,
		};

		const key = catalogKey(PIRM_STREAM, archComponentType, name);
		const index = snapshotIndex.get(key);
		if (index == null) {
			snapshotIndex.set(key, snapshot.typicalWorks.length);
			snapshot.typicalWorks.push(catalogRow);
			snapshotAdded += 1;
		} else {
			snapshot.typicalWorks[index] = {
				...snapshot.typicalWorks[index],
				...catalogRow,
			};
			snapshotUpdated += 1;
		}
	}

	registry.meta = {
		...registry.meta,
		counts: {
			...(typeof registry.meta.counts === "object" && registry.meta.counts
				? registry.meta.counts
				: {}),
			works: registry.works.length,
		},
	};
	updateSnapshotMeta(snapshot);
	const anketaOk = patchAnketaSnapshot(anketa, workIds);

	console.log(
		JSON.stringify(
			{
				mode: write ? "write" : "dry-run",
				works: workIds.length,
				registryAdded,
				registryUpdated,
				snapshotAdded,
				snapshotUpdated,
				anketaRuleReady: anketaOk,
				registryTotal: registry.works.length,
				snapshotTotal: snapshot.typicalWorks.length,
			},
			null,
			2,
		),
	);

	if (!write) {
		console.log("Pass --write to persist factory bundle changes.");
		return;
	}

	writeFileSync(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
	writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
	writeFileSync(
		ANKETA_SNAPSHOT_PATH,
		`${JSON.stringify(anketa, null, "\t")}\n`,
		"utf8",
	);
	console.log("Wrote registry, typical-works snapshot, anketa snapshot.");
}

main();
