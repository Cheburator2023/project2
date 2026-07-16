#!/usr/bin/env tsx
/**
 * Статический импорт модельного стрима в factory bundle:
 * - 10 типовых работ в registry + catalog snapshot
 * - привязки параметров к field_* схемы
 * - streamExecutor «Модельный стрим» на блок detailInfo
 *
 *   npm run import:model-stream -- [--write]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	csvRowToCatalogPatch,
	normalizeParamLabel,
	parseCsvFormulaImportRows,
	slugParamCode,
	buildLinearArchCountSteps,
	formatArchCountFormulaSteps,
	MODEL_STREAM_SOURCE_COUNT_STEPS,
	splitCatalogLaborArchCounts,
	isArchCountLaborParamName,
	resolveArchCountLaborFromCatalog,
	type CsvFormulaImportRow,
} from "@smart-anketa/api-contract";
import type { V2FactoryTypicalWork } from "../src/modules/anketa-v2/constants/v2-factory-typical-works-catalog";
import type { V2FactoryTemplateTypicalWorkRegistryItem } from "../src/modules/anketa-v2/constants/v2-factory-template-typical-works-registry";
import {
	canonicalizeWorkStream,
	normalizeArchComponentType,
	resolveCatalogWorkComponent,
	stripWorkStagePrefix,
} from "../src/modules/anketa-v2/utils/v2-typical-work-catalog.util";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");
const WORKS_CSV = join(REPO_ROOT, "llm", "Смарт-анкета_Модельный стрим.csv");
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
const OVERRIDES_PATH = join(__dirname, "formula-param-overrides.json");
const BINDINGS_PATH = join(__dirname, "model-stream-param-bindings.json");
const OUTPUT_DIR = join(__dirname, "output");
const REPORT_PATH = join(OUTPUT_DIR, "import-model-stream-report.json");

const MODEL_STREAM = "Модельный стрим";

type RegistryFile = {
	meta: Record<string, unknown>;
	works: V2FactoryTemplateTypicalWorkRegistryItem[];
};

type SnapshotFile = {
	meta: Record<string, unknown>;
	typicalWorks: V2FactoryTypicalWork[];
	dictionaries: unknown[];
};

type ParamBinding = {
	paramCode: string;
	schemaFieldUid: string;
};

type AnketaSnapshotFile = {
	jsonSchema: Record<string, unknown>;
	uiSchema: Record<string, unknown>;
	logic: Record<string, unknown>;
	dictionariesSnapshot?: Record<string, unknown>;
};

const REGISTRY_SEED: Array<{
	id: string;
	displayName: string;
	archComponentType: string;
	norm: number;
}> = [
	{
		id: "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4001",
		displayName: "01. Постановка задачи",
		archComponentType: "Модельный сервис",
		norm: 33,
	},
	{
		id: "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4002",
		displayName: "02. Поиск данных",
		archComponentType: "Система-источник",
		norm: 15,
	},
	{
		id: "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4003",
		displayName: "04. Построение витрины для разработки",
		archComponentType: "Объект / Витрина данных",
		norm: 51,
	},
	{
		id: "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4004",
		displayName: "05A. Разработка пилотной модели (MVP)",
		archComponentType: "Модель",
		norm: 40,
	},
	{
		id: "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4005",
		displayName: "05. Разработка модели",
		archComponentType: "Модель",
		norm: 37,
	},
	{
		id: "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4006",
		displayName: "AutoML: разработка",
		archComponentType: "Модель",
		norm: 68,
	},
	{
		id: "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4007",
		displayName: "05B. Пилотирование модели",
		archComponentType: "Модельный сервис",
		norm: 34,
	},
	{
		id: "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4008",
		displayName: "07. Разработка витрины для применения модели",
		archComponentType: "Объект / Витрина данных",
		norm: 56,
	},
	{
		id: "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4009",
		displayName: "09. Адаптация и внедрение модели",
		archComponentType: "Модельный сервис",
		norm: 50,
	},
	{
		id: "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4010",
		displayName: "AutoML: внедрение",
		archComponentType: "Модель",
		norm: 68,
	},
];

function parseArgs(argv: string[]) {
	let write = false;
	for (const arg of argv) {
		if (arg === "--write") write = true;
	}
	return { write };
}

function rowMatchKey(parts: {
	stream: string;
	component: string;
	stage: string;
	name: string;
}): string {
	return [
		canonicalizeWorkStream(parts.stream),
		normalizeArchComponentType(parts.component),
		parts.stage.trim(),
		stripWorkStagePrefix(parts.name).trim(),
	].join("|");
}

function csvRowKey(row: CsvFormulaImportRow): string {
	return rowMatchKey({
		stream: row.stream,
		component: row.component,
		stage: row.stage,
		name: row.name,
	});
}

function normalizeModelStreamArchComponent(value: string): string {
	return normalizeArchComponentType(value)
		.replace(/\s*\/\s*/g, " / ")
		.replace(/\s+/g, " ")
		.trim();
}

function registryMatchesCsvRow(
	entry: V2FactoryTemplateTypicalWorkRegistryItem,
	row: CsvFormulaImportRow,
): boolean {
	if (!entry.streams.includes(MODEL_STREAM)) return false;
	if (
		normalizeModelStreamArchComponent(entry.archComponentType) !==
		normalizeModelStreamArchComponent(row.component)
	) {
		return false;
	}
	const entryBase = stripWorkStagePrefix(entry.name).trim();
	const rowBase = stripWorkStagePrefix(row.name).trim();
	return entryBase === rowBase || entry.name.trim() === row.name.trim();
}

function rewriteArchCountFormulaTokens(formulaText: string): string {
	const modelSteps = formatArchCountFormulaSteps(buildLinearArchCountSteps(15));
	const sourceSteps = formatArchCountFormulaSteps(MODEL_STREAM_SOURCE_COUNT_STEPS);
	return formulaText
		.replace(
			/коэф\(кол_во_моделей\)/giu,
			`архкоэф(Модели; ${modelSteps})`,
		)
		.replace(
			/коэф\(количество_моделей\)/giu,
			`архкоэф(Модели; ${modelSteps})`,
		)
		.replace(
			/коэф\(кол_во_источников_для_проработки\)/giu,
			`архкоэф(Система-источник; ${sourceSteps})`,
		);
}

function ensureRegistryWorks(registry: RegistryFile): number {
	let added = 0;
	for (const seed of REGISTRY_SEED) {
		const exists = registry.works.some(
			(entry) =>
				entry.id === seed.id ||
				(entry.streams.includes(MODEL_STREAM) &&
					stripWorkStagePrefix(entry.name).trim() ===
						stripWorkStagePrefix(seed.displayName).trim()),
		);
		if (exists) continue;
		registry.works.push({
			id: seed.id,
			name: seed.displayName,
			archComponentType: seed.archComponentType,
			workType: null,
			streams: [MODEL_STREAM],
			normsByStream: { [MODEL_STREAM]: seed.norm },
		});
		added += 1;
	}
	const counts = (registry.meta.counts ?? {}) as Record<string, number>;
	registry.meta.counts = {
		...counts,
		works: registry.works.length,
	};
	return added;
}

function resolveBindingForParam(
	paramName: string,
	overrides: Record<string, string>,
	bindings: Record<string, ParamBinding>,
	laborParams: string[] = [],
): ParamBinding | undefined {
	const trimmed = paramName.trim();
	const directOverride = overrides[trimmed];
	if (directOverride) return bindings[directOverride];

	const norm = normalizeParamLabel(trimmed);
	for (const [label, code] of Object.entries(overrides)) {
		const labelNorm = normalizeParamLabel(label);
		if (
			labelNorm === norm ||
			norm.startsWith(labelNorm) ||
			labelNorm.startsWith(norm)
		) {
			return bindings[code];
		}
	}

	const laborHit = laborParams.find((param) => {
		const paramNorm = normalizeParamLabel(param);
		return (
			paramNorm === norm ||
			norm.startsWith(paramNorm) ||
			paramNorm.startsWith(norm)
		);
	});
	if (laborHit) {
		const code = overrides[laborHit.trim()] ?? slugParamCode(laborHit);
		return bindings[code];
	}

	return bindings[slugParamCode(trimmed)];
}

function bindCatalogParamRef(
	paramName: string,
	overrides: Record<string, string>,
	bindings: Record<string, ParamBinding>,
	laborParams: string[],
): { paramCode?: string; schemaFieldUid?: string } {
	const binding = resolveBindingForParam(
		paramName,
		overrides,
		bindings,
		laborParams,
	);
	const overrideCode = overrides[paramName.trim()];
	return {
		...(overrideCode ? { paramCode: overrideCode } : {}),
		...(binding?.paramCode ? { paramCode: binding.paramCode } : {}),
		...(binding?.schemaFieldUid
			? { schemaFieldUid: binding.schemaFieldUid }
			: {}),
	};
}

function alignLaborCoefficientsToParams(work: V2FactoryTypicalWork): void {
	if (!work.laborCoefficients?.length) return;
	work.laborCoefficients = work.laborCoefficients.map((group) => {
		const groupNorm = normalizeParamLabel(group.paramName);
		const matchedParam = work.laborParams.find((param) => {
			const paramNorm = normalizeParamLabel(param);
			return (
				groupNorm === paramNorm ||
				groupNorm.startsWith(paramNorm) ||
				paramNorm.startsWith(groupNorm)
			);
		});
		return {
			...group,
			paramName: matchedParam ?? group.paramName,
		};
	});
}

function applyTriggerArchCountFromRules(work: V2FactoryTypicalWork): void {
	if (!work.triggerRules?.length) return;
	const schemaRules: NonNullable<V2FactoryTypicalWork["triggerRules"]> = [];
	for (const rule of work.triggerRules) {
		if (!isArchCountLaborParamName(rule.paramName)) {
			schemaRules.push(rule);
			continue;
		}
		const arch = resolveArchCountLaborFromCatalog(rule.paramName);
		if (!arch) continue;
		work.triggerArchCount = {
			kind: arch.kind,
			steps: [{ count: 1, coefficient: 1 }],
			combinator: "and",
		};
	}
	work.triggerRules = schemaRules;
	work.triggerParams = schemaRules.map((rule) => rule.paramName);
	work.triggerParam = work.triggerParams[0] ?? "";
}

function applyLaborArchCountCatalogSplit(work: V2FactoryTypicalWork): void {
	const split = splitCatalogLaborArchCounts({
		laborParams: work.laborParams,
		laborCoefficients: work.laborCoefficients,
	});
	work.laborParams = split.laborParams;
	work.laborCoefficients = split.laborCoefficients;
	if (split.laborArchCounts.length > 0) {
		work.laborArchCounts = split.laborArchCounts.map((row) => ({
			kind: row.kind,
			paramName: row.paramName ?? null,
			steps: row.steps,
		}));
	}
}

function applyParamBindings(
	work: V2FactoryTypicalWork,
	bindings: Record<string, ParamBinding>,
	overrides: Record<string, string>,
): void {
	alignLaborCoefficientsToParams(work);
	applyTriggerArchCountFromRules(work);

	if (work.triggerRules?.length) {
		work.triggerRules = work.triggerRules.map((rule) => ({
			...rule,
			...bindCatalogParamRef(
				rule.paramName,
				overrides,
				bindings,
				work.laborParams,
			),
		}));
	}

	if (work.laborCoefficients?.length) {
		work.laborCoefficients = work.laborCoefficients.map((group) => ({
			...group,
			...bindCatalogParamRef(
				group.paramName,
				overrides,
				bindings,
				work.laborParams,
			),
		}));
	}

	if (work.formulaText?.trim()) {
		for (const [label, code] of Object.entries(overrides)) {
			const slug = slugParamCode(label);
			work.formulaText = work.formulaText
				.split(`коэф(${slug})`)
				.join(`коэф(${code})`);
		}
	}
}

function patchAnketaSnapshot(anketa: AnketaSnapshotFile): boolean {
	let changed = false;
	const detailInfo = anketa.uiSchema.detailInfo as
		| Record<string, unknown>
		| undefined;
	if (!detailInfo) return false;

	const detailOptions = detailInfo["ui:options"] as
		| Record<string, unknown>
		| undefined;
	if (detailOptions?.streamExecutor !== MODEL_STREAM) {
		detailInfo["ui:options"] = {
			...(detailOptions ?? {}),
			streamBlock: true,
			streamExecutor: MODEL_STREAM,
		};
		changed = true;
	}

	const typicalTasks = detailInfo.detailTypicalTasks as
		| Record<string, unknown>
		| undefined;
	if (typicalTasks) {
		const taskOptions = typicalTasks["ui:options"] as
			| Record<string, unknown>
			| undefined;
		if (
			taskOptions?.archComponent !== "typicalWork" ||
			taskOptions?.streamExecutor !== MODEL_STREAM
		) {
			typicalTasks["ui:options"] = {
				...(taskOptions ?? {}),
				addable: false,
				orderable: false,
				removable: false,
				archComponent: "typicalWork",
				streamExecutor: MODEL_STREAM,
			};
			changed = true;
		}
	}

	return changed;
}

function updateSnapshotMeta(snapshot: SnapshotFile): void {
	const streams = new Set(
		((snapshot.meta.streams as string[] | undefined) ?? []).map((s) =>
			s.trim(),
		),
	);
	streams.add(MODEL_STREAM);

	const components = new Set(
		((snapshot.meta.components as string[] | undefined) ?? []).map((s) =>
			s.trim(),
		),
	);
	for (const work of snapshot.typicalWorks) {
		if (canonicalizeWorkStream(work.stream) === MODEL_STREAM) {
			components.add(normalizeArchComponentType(resolveCatalogWorkComponent(work)));
		}
	}

	const stages = new Set(
		((snapshot.meta.stages as string[] | undefined) ?? []).map((s) => s.trim()),
	);
	for (const work of snapshot.typicalWorks) {
		if (canonicalizeWorkStream(work.stream) === MODEL_STREAM && work.stage.trim()) {
			stages.add(work.stage.trim());
		}
	}

	const withFormula = snapshot.typicalWorks.filter((w) =>
		w.formulaText?.trim(),
	).length;
	const withNorm = snapshot.typicalWorks.filter((w) => w.norm != null).length;
	const counts = (snapshot.meta.counts ?? {}) as Record<string, number>;
	snapshot.meta = {
		...snapshot.meta,
		streams: [...streams],
		components: [...components],
		stages: [...stages],
		counts: {
			...counts,
			typicalWorks: snapshot.typicalWorks.length,
			typicalWorksWithNorm: withNorm,
			typicalWorksWithFormula: withFormula,
			streams: streams.size,
			components: components.size,
			stages: stages.size,
		},
	};
}

function main() {
	const { write } = parseArgs(process.argv.slice(2));

	for (const path of [WORKS_CSV, SNAPSHOT_PATH, REGISTRY_PATH, ANKETA_SNAPSHOT_PATH]) {
		if (!existsSync(path)) {
			console.error(`File not found: ${path}`);
			process.exit(1);
		}
	}

	const csvRows = parseCsvFormulaImportRows(readFileSync(WORKS_CSV, "utf-8"));
	const snapshot = JSON.parse(
		readFileSync(SNAPSHOT_PATH, "utf-8"),
	) as SnapshotFile;
	const registry = JSON.parse(
		readFileSync(REGISTRY_PATH, "utf-8"),
	) as RegistryFile;
	const anketa = JSON.parse(
		readFileSync(ANKETA_SNAPSHOT_PATH, "utf-8"),
	) as AnketaSnapshotFile;
	const overrides = JSON.parse(
		readFileSync(OVERRIDES_PATH, "utf-8"),
	) as Record<string, string>;
	const bindings = JSON.parse(
		readFileSync(BINDINGS_PATH, "utf-8"),
	) as Record<string, ParamBinding>;

	const registryAdded = ensureRegistryWorks(registry);

	const indexByKey = new Map<string, number>();
	for (let i = 0; i < snapshot.typicalWorks.length; i++) {
		const key = rowMatchKey({
			stream: snapshot.typicalWorks[i].stream,
			component: resolveCatalogWorkComponent(snapshot.typicalWorks[i]),
			stage: snapshot.typicalWorks[i].stage,
			name: snapshot.typicalWorks[i].name,
		});
		if (!indexByKey.has(key)) indexByKey.set(key, i);
	}

	const paramCandidates = csvRows.flatMap((row) =>
		row.laborParams.map((name) => ({ name, code: slugParamCode(name) })),
	);

	const reportRows: Array<Record<string, unknown>> = [];
	let matched = 0;
	let appended = 0;

	for (const csvRow of csvRows) {
		const key = csvRowKey(csvRow);
		const { patch, build } = csvRowToCatalogPatch(
			csvRow,
			paramCandidates,
			overrides,
		);

		if (!patch || !build || build.unmatchedParams.length > 0) {
			reportRows.push({
				csvKey: key,
				status: "unmatched",
				reason: build?.unmatchedParams.length
					? `unmatched_params:${build.unmatchedParams.join("|")}`
					: "invalid_formula",
				parseError: build?.parseError,
			});
			continue;
		}

		let index = indexByKey.get(key) ?? null;
		if (index == null) {
			const registryHit = registry.works.find((entry) =>
				registryMatchesCsvRow(entry, csvRow),
			);
			if (!registryHit) {
				reportRows.push({
					csvKey: key,
					status: "unmatched",
					reason: "no_registry_row",
				});
				continue;
			}
			const newRow: V2FactoryTypicalWork = {
				stream: MODEL_STREAM,
				component: csvRow.component,
				stage: csvRow.stage,
				name: stripWorkStagePrefix(csvRow.name),
				originalName: csvRow.originalName,
				workType: patch.workType ?? "Опциональная",
				norm: patch.norm ?? csvRow.norm,
				normRaw: patch.normRaw ?? csvRow.normRaw,
				triggerParam: patch.triggerParams?.[0] ?? "",
				triggerParams: patch.triggerParams ?? csvRow.triggerParams,
				triggerRules: patch.triggerRules,
				laborParams: patch.laborParams ?? csvRow.laborParams,
				laborCoefficients: patch.laborCoefficients,
				formulaText: patch.formulaText,
				roundingMode: patch.roundingMode,
				roundingStep: patch.roundingStep,
			};
			index = snapshot.typicalWorks.length;
			snapshot.typicalWorks.push(newRow);
			indexByKey.set(key, index);
			appended += 1;
			applyParamBindings(newRow, bindings, overrides);
			applyLaborArchCountCatalogSplit(newRow);
		}

		const target = snapshot.typicalWorks[index];
		target.stream = MODEL_STREAM;
		target.roundingMode = patch.roundingMode;
		target.roundingStep = patch.roundingStep;
		target.laborParams = patch.laborParams ?? csvRow.laborParams;
		target.laborCoefficients = patch.laborCoefficients;
		target.formulaText = patch.formulaText;
		target.triggerParams = patch.triggerParams ?? csvRow.triggerParams;
		target.triggerParam = target.triggerParams[0] ?? "";
		target.triggerRules = patch.triggerRules;
		if (patch.norm != null) {
			target.norm = patch.norm;
			target.normRaw = patch.normRaw ?? String(patch.norm);
		}
		if (target.formulaText) {
			target.formulaText = rewriteArchCountFormulaTokens(target.formulaText);
		}
		applyParamBindings(target, bindings, overrides);
		applyLaborArchCountCatalogSplit(target);
		matched += 1;
		reportRows.push({
			csvKey: key,
			status: "matched",
			snapshotIndex: index,
			formulaText: target.formulaText,
			appended: appended > 0 && index === snapshot.typicalWorks.length - 1,
		});
	}

	updateSnapshotMeta(snapshot);
	const anketaChanged = patchAnketaSnapshot(anketa);

	const report = {
		generatedAt: new Date().toISOString(),
		mode: write ? "write" : "dry-run",
		counts: {
			csvRows: csvRows.length,
			matched,
			unmatched: reportRows.filter((row) => row.status === "unmatched").length,
			registryAdded,
			appended,
			anketaPatched: anketaChanged,
			totalWorks: snapshot.typicalWorks.length,
		},
		rows: reportRows,
	};

	mkdirSync(OUTPUT_DIR, { recursive: true });
	writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf-8");

	if (write) {
		writeFileSync(
			SNAPSHOT_PATH,
			`${JSON.stringify(snapshot, null, 2)}\n`,
			"utf-8",
		);
		writeFileSync(
			REGISTRY_PATH,
			`${JSON.stringify(registry, null, 2)}\n`,
			"utf-8",
		);
		if (anketaChanged) {
			writeFileSync(
				ANKETA_SNAPSHOT_PATH,
				`${JSON.stringify(anketa, null, 2)}\n`,
				"utf-8",
			);
		}
	}

	console.log(
		`[import-model-stream] ${write ? "WROTE" : "DRY-RUN"} matched=${matched}/${csvRows.length} registryAdded=${registryAdded} appended=${appended} anketaPatched=${anketaChanged}`,
	);
	console.log(`Report: ${REPORT_PATH}`);
	if (!write) {
		console.log("Re-run with --write to update snapshots.");
	}
	if (report.counts.unmatched > 0) {
		process.exitCode = 1;
	}
}

main();
