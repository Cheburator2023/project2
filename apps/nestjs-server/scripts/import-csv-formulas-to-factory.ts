#!/usr/bin/env tsx
/**
 * Импорт формул из CSV методолога в v2-factory-typical-works.snapshot.json.
 *
 * По умолчанию dry-run: пишет отчёт в scripts/output/import-csv-formulas-report.json.
 * Запись снимка: --write
 *
 *   npm run import:csv-formulas -- [--write] [--csv path/to/file.csv]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fuzzysort from "fuzzysort";
import {
	csvRowToCatalogPatch,
	normalizeParamLabel,
	parseCsvFormulaImportRows,
	parseCsvLaborCoefficients,
	type CsvFormulaCatalogPatch,
	type CsvFormulaImportRow,
	type CsvFormulaLaborCoefficient,
	type CsvFormulaParamCandidate,
} from "@smart-anketa/api-contract";
import type { V2FactoryTypicalWork } from "../src/modules/anketa-v2/constants/v2-factory-typical-works-catalog";
import type { V2FactoryTemplateTypicalWorkRegistryItem } from "../src/modules/anketa-v2/constants/v2-factory-template-typical-works-registry";
import { V2_FACTORY_TEMPLATE_TYPICAL_WORKS_REGISTRY } from "../src/modules/anketa-v2/constants/v2-factory-template-typical-works-registry";
import {
	canonicalizeWorkStream,
	normalizeArchComponentType,
	resolveCatalogWorkComponent,
	slugParamCode,
	stripWorkStagePrefix,
} from "../src/modules/anketa-v2/utils/v2-typical-work-catalog.util";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");
const DEFAULT_CSV = join(
	REPO_ROOT,
	"llm",
	"Смарт_анкета_Объединённая_обновлённая_2.csv",
);
const SNAPSHOT_PATH = join(
	__dirname,
	"..",
	"src/modules/anketa-v2/constants/v2-factory-typical-works.snapshot.json",
);
const OVERRIDES_PATH = join(__dirname, "formula-param-overrides.json");
const OUTPUT_DIR = join(__dirname, "output");
const REPORT_PATH = join(OUTPUT_DIR, "import-csv-formulas-report.json");

type SnapshotFile = {
	meta: Record<string, unknown>;
	typicalWorks: V2FactoryTypicalWork[];
	dictionaries: Array<{
		name: string;
		values?: Array<{
			label: string;
			coeff?: number | null;
		}>;
	}>;
};

type MatchResult =
	| {
			status: "matched";
			csvKey: string;
			snapshotIndex: number;
			formulaText: string;
			roundingMode: string;
			roundingStep: number | null;
			unmatchedParams: string[];
			transformedSpecial: string[];
			laborCoefficientParams: number;
			triggerRules: number;
			unresolvedTriggers: string[];
			matchKind?: "exact" | "fuzzy" | "registry_append";
			fuzzyMatchedName?: string;
	  }
	| {
			status: "unmatched_csv";
			csvKey: string;
			csvRow: CsvFormulaImportRow;
			reason: string;
	  }
	| {
			status: "skipped";
			csvKey: string;
			reason: string;
	  };

function parseArgs(argv: string[]) {
	let csvPath = DEFAULT_CSV;
	let write = false;
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--write") write = true;
		else if (arg === "--csv" && argv[i + 1]) {
			csvPath = argv[++i];
		}
	}
	return { csvPath, write };
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

function snapshotRowKey(row: V2FactoryTypicalWork): string {
	return rowMatchKey({
		stream: row.stream,
		component: resolveCatalogWorkComponent(row),
		stage: row.stage,
		name: row.name,
	});
}

function csvRowKey(row: CsvFormulaImportRow): string {
	return rowMatchKey({
		stream: row.stream,
		component: row.component,
		stage: row.stage,
		name: row.name,
	});
}

function collectParamCandidates(
	snapshot: SnapshotFile,
	csvRows: CsvFormulaImportRow[],
): CsvFormulaParamCandidate[] {
	const byCode = new Map<string, CsvFormulaParamCandidate>();
	const add = (name: string) => {
		const trimmed = name.trim();
		if (!trimmed) return;
		const code = slugParamCode(trimmed);
		if (!byCode.has(code)) byCode.set(code, { name: trimmed, code });
	};

	for (const dict of snapshot.dictionaries) add(dict.name);
	for (const work of snapshot.typicalWorks) {
		for (const param of work.laborParams) add(param);
		for (const param of work.triggerParams) add(param);
		if (work.triggerParam) add(work.triggerParam);
	}
	for (const row of csvRows) {
		for (const param of row.laborParams) add(param);
		for (const group of parseCsvLaborCoefficients(row.formulaRaw)) {
			add(group.paramName);
		}
	}

	return [...byCode.values()];
}

type LaborCoefficientLookup = {
	byComponentAndParam: Map<string, CsvFormulaLaborCoefficient>;
	byParam: Map<string, CsvFormulaLaborCoefficient>;
};

function laborCoefficientKey(component: string, paramName: string): string {
	return `${normalizeArchComponentType(component)}|${normalizeParamLabel(paramName)}`;
}

function collectLaborCoefficientLookup(
	rows: CsvFormulaImportRow[],
	snapshot: SnapshotFile,
): LaborCoefficientLookup {
	const byComponentAndParam = new Map<string, CsvFormulaLaborCoefficient>();
	const byParam = new Map<string, CsvFormulaLaborCoefficient>();
	for (const row of rows) {
		for (const group of parseCsvLaborCoefficients(row.formulaRaw)) {
			const paramKey = normalizeParamLabel(group.paramName);
			const componentKey = laborCoefficientKey(row.component, group.paramName);
			if (!byComponentAndParam.has(componentKey)) {
				byComponentAndParam.set(componentKey, group);
			}
			if (!byParam.has(paramKey)) byParam.set(paramKey, group);
		}
	}

	const metricsDictionary = snapshot.dictionaries.find(
		(dictionary) => dictionary.name === "Размерность витрины (метрики)",
	);
	const metricValues = (metricsDictionary?.values ?? [])
		.filter(
			(value): value is { label: string; coeff: number } =>
				value.coeff != null && Number.isFinite(value.coeff),
		)
		.map((value) => ({
			label: value.label,
			// CSV задаёт K=1 для диапазона по умолчанию, справочник хранит
			// именно добавку к базе (0 / 0.2 / 0.4).
			coefficient: 1 + value.coeff,
		}));
	if (metricValues.length > 0) {
		byParam.set(normalizeParamLabel("Количество метрик"), {
			paramName: "Количество метрик",
			values: metricValues,
		});
	}

	return { byComponentAndParam, byParam };
}

function resolveLaborCoefficients(
	row: CsvFormulaImportRow,
	patch: CsvFormulaCatalogPatch,
	lookup: LaborCoefficientLookup,
): CsvFormulaLaborCoefficient[] {
	const own = new Map(
		(patch.laborCoefficients ?? []).map((group) => [
			normalizeParamLabel(group.paramName),
			group,
		]),
	);
	const resolved: CsvFormulaLaborCoefficient[] = [];
	for (const paramName of patch.laborParams ?? []) {
		const normalized = normalizeParamLabel(paramName);
		const group =
			own.get(normalized) ??
			lookup.byComponentAndParam.get(
				laborCoefficientKey(row.component, paramName),
			) ??
			lookup.byParam.get(normalized);
		if (!group) continue;
		resolved.push({
			paramName,
			values: group.values.map((value) => ({ ...value })),
		});
	}
	return resolved;
}

function findFuzzySnapshotIndex(
	row: CsvFormulaImportRow,
	works: V2FactoryTypicalWork[],
	usedIndexes: Set<number>,
	options: { requireComponent?: boolean } = {},
): number | null {
	const requireComponent = options.requireComponent !== false;
	const stream = canonicalizeWorkStream(row.stream);
	const component = normalizeArchComponentType(row.component);
	const candidates = works
		.map((work, index) => ({ work, index }))
		.filter(({ work, index }) => {
			if (usedIndexes.has(index)) return false;
			if (canonicalizeWorkStream(work.stream) !== stream) return false;
			if (requireComponent) {
				if (
					normalizeArchComponentType(resolveCatalogWorkComponent(work)) !==
					component
				) {
					return false;
				}
			}
			if (work.stage.trim() !== row.stage.trim()) return false;
			return true;
		});

	if (candidates.length === 0) return null;

	const targetName = stripWorkStagePrefix(row.name);
	const results = fuzzysort.go(targetName, candidates, {
		key: (item) => stripWorkStagePrefix(item.work.name),
		threshold: -10000,
		limit: 1,
	});
	const best = results[0];
	if (!best) return null;
	if (best.score < -800) return null;
	return best.obj.index;
}

function findRegistryWork(
	row: CsvFormulaImportRow,
	registryWorks: V2FactoryTemplateTypicalWorkRegistryItem[],
): V2FactoryTemplateTypicalWorkRegistryItem | null {
	const stream = canonicalizeWorkStream(row.stream);
	const component = normalizeArchComponentType(row.component);
	const name = stripWorkStagePrefix(row.name).trim();
	const stage = row.stage.trim();

	for (const entry of registryWorks) {
		const entryStream = entry.streams
			.map((s) => canonicalizeWorkStream(s))
			.find((s) => s === stream);
		if (!entryStream) continue;
		if (normalizeArchComponentType(entry.archComponentType) !== component) {
			continue;
		}
		if (!entry.name.startsWith(`${stage}.`)) continue;
		if (stripWorkStagePrefix(entry.name).trim() === name) {
			return entry;
		}
	}

	const fuzzyCandidates = registryWorks.filter((entry) => {
		const entryStream = entry.streams.some(
			(s) => canonicalizeWorkStream(s) === stream,
		);
		if (!entryStream) return false;
		if (normalizeArchComponentType(entry.archComponentType) !== component) {
			return false;
		}
		return entry.name.startsWith(`${stage}.`);
	});
	const results = fuzzysort.go(name, fuzzyCandidates, {
		key: (entry) => stripWorkStagePrefix(entry.name),
		threshold: -10000,
		limit: 1,
	});
	const best = results[0];
	if (!best || best.score < -600) return null;
	return best.obj;
}

function buildCatalogWorkFromCsv(
	row: CsvFormulaImportRow,
	patch: CsvFormulaCatalogPatch,
): V2FactoryTypicalWork {
	const laborParams = (patch.laborParams ?? row.laborParams).filter(
		(p) => p.trim() && p.trim() !== "—",
	);
	const triggerParams = patch.triggerParams?.length
		? patch.triggerParams
		: row.triggerParams;
	return {
		stream: row.stream.trim(),
		component: row.component.trim(),
		stage: row.stage.trim(),
		name: stripWorkStagePrefix(row.name) || row.name.trim(),
		originalName: row.originalName.trim() || row.name.trim(),
		workType: patch.workType ?? row.workType ?? "Опциональная",
		norm: patch.norm ?? row.norm,
		normRaw: patch.normRaw ?? row.normRaw,
		triggerParam: triggerParams[0] ?? "",
		triggerParams,
		triggerRules: patch.triggerRules,
		laborParams,
		laborCoefficients: patch.laborCoefficients,
		formulaText: patch.formulaText,
		roundingMode: patch.roundingMode,
		roundingStep: patch.roundingStep,
	};
}

function registerSnapshotRow(
	snapshot: SnapshotFile,
	row: V2FactoryTypicalWork,
	indexByKey: Map<string, number>,
): number {
	const index = snapshot.typicalWorks.length;
	snapshot.typicalWorks.push(row);
	const key = snapshotRowKey(row);
	indexByKey.set(key, index);
	return index;
}

function main() {
	const { csvPath, write } = parseArgs(process.argv.slice(2));

	if (!existsSync(csvPath)) {
		console.error(`CSV not found: ${csvPath}`);
		process.exit(1);
	}
	if (!existsSync(SNAPSHOT_PATH)) {
		console.error(`Snapshot not found: ${SNAPSHOT_PATH}`);
		process.exit(1);
	}

	const csvText = readFileSync(csvPath, "utf-8");
	const snapshot = JSON.parse(
		readFileSync(SNAPSHOT_PATH, "utf-8"),
	) as SnapshotFile;
	const overrides = existsSync(OVERRIDES_PATH)
		? (JSON.parse(readFileSync(OVERRIDES_PATH, "utf-8")) as Record<
				string,
				string
			>)
		: {};

	const csvRows = parseCsvFormulaImportRows(csvText);
	const paramCandidates = collectParamCandidates(snapshot, csvRows);
	const laborCoefficientLookup = collectLaborCoefficientLookup(
		csvRows,
		snapshot,
	);

	const indexByKey = new Map<string, number>();
	for (let i = 0; i < snapshot.typicalWorks.length; i++) {
		const key = snapshotRowKey(snapshot.typicalWorks[i]);
		if (!indexByKey.has(key)) indexByKey.set(key, i);
	}

	const usedIndexes = new Set<number>();
	const results: MatchResult[] = [];
	let patched = 0;
	let appended = 0;
	let alreadyHadFormula = 0;

	for (const csvRow of csvRows) {
		const key = csvRowKey(csvRow);
		if (!csvRow.formulaRaw.trim()) {
			results.push({ status: "skipped", csvKey: key, reason: "empty_formula" });
			continue;
		}

		const { patch, build } = csvRowToCatalogPatch(
			csvRow,
			paramCandidates,
			overrides,
		);
		if (!patch || !build) {
			const preservedIndex = indexByKey.get(key);
			const preserved =
				preservedIndex == null
					? undefined
					: snapshot.typicalWorks[preservedIndex];
			if (
				build?.skippedSpecial.some((item) => /Kдоля/iu.test(item)) &&
				preserved?.formulaText?.trim() &&
				(preserved.laborCoefficients?.length ?? 0) > 0
			) {
				usedIndexes.add(preservedIndex!);
				alreadyHadFormula++;
				results.push({
					status: "matched",
					csvKey: key,
					snapshotIndex: preservedIndex!,
					formulaText: preserved.formulaText,
					roundingMode: preserved.roundingMode ?? "CEIL",
					roundingStep: preserved.roundingStep ?? 0.1,
					unmatchedParams: [],
					transformedSpecial: [
						"Kдоля(Этап 217) → сохранена калибровочная формула snapshot",
					],
					laborCoefficientParams:
						preserved.laborCoefficients?.length ?? 0,
					triggerRules: preserved.triggerRules?.length ?? 0,
					unresolvedTriggers: [],
					matchKind: "exact",
				});
				continue;
			}
			const reason = !build
				? "unparseable_formula"
				: build.parseError
					? `parse_error:${build.parseError}`
					: build.unmatchedParams.length > 0
						? `unmatched_params:${build.unmatchedParams.join("|")}`
						: build.skippedSpecial.length > 0
							? `unsupported_formula:${build.skippedSpecial.join("|")}`
							: "invalid_formula";
			results.push({
				status: "unmatched_csv",
				csvKey: key,
				csvRow,
				reason,
			});
			continue;
		}
		patch.laborCoefficients = resolveLaborCoefficients(
			csvRow,
			patch,
			laborCoefficientLookup,
		);
		const coefficientParamNames = new Set(
			patch.laborCoefficients.map((group) =>
				normalizeParamLabel(group.paramName),
			),
		);
		const missingCoefficientParams = (patch.laborParams ?? []).filter(
			(paramName) => !coefficientParamNames.has(normalizeParamLabel(paramName)),
		);
		if (patch.formulaText !== "N" && missingCoefficientParams.length > 0) {
			results.push({
				status: "unmatched_csv",
				csvKey: key,
				csvRow,
				reason: `missing_coefficients:${missingCoefficientParams.join("|")}`,
			});
			continue;
		}

		let snapshotIndex = indexByKey.get(key) ?? null;
		let matchKind: "exact" | "fuzzy" | "registry_append" = "exact";

		if (snapshotIndex == null) {
			snapshotIndex = findFuzzySnapshotIndex(
				csvRow,
				snapshot.typicalWorks,
				usedIndexes,
			);
			if (snapshotIndex != null) matchKind = "fuzzy";
		}

		if (snapshotIndex == null) {
			const registryHit = findRegistryWork(
				csvRow,
				V2_FACTORY_TEMPLATE_TYPICAL_WORKS_REGISTRY.works,
			);
			if (registryHit) {
				const newRow = buildCatalogWorkFromCsv(csvRow, patch);
				snapshotIndex = registerSnapshotRow(snapshot, newRow, indexByKey);
				matchKind = "registry_append";
				appended++;
			}
		}

		if (snapshotIndex == null) {
			results.push({
				status: "unmatched_csv",
				csvKey: key,
				csvRow,
				reason: "no_snapshot_row",
			});
			continue;
		}

		const target = snapshot.typicalWorks[snapshotIndex];
		const hadFormula = Boolean(target.formulaText?.trim());
		if (hadFormula && matchKind !== "registry_append") alreadyHadFormula++;

		target.formulaText = patch.formulaText;
		target.roundingMode = patch.roundingMode;
		target.roundingStep = patch.roundingStep;
		if (patch.laborParams !== undefined) {
			target.laborParams = patch.laborParams.filter(
				(p) => p.trim() && p.trim() !== "—",
			);
		}
		target.laborCoefficients = patch.laborCoefficients;
		if (patch.triggerParams !== undefined) {
			target.triggerParams = patch.triggerParams;
			target.triggerParam = patch.triggerParams[0] ?? target.triggerParam;
		}
		target.triggerRules = patch.triggerRules;
		if (patch.norm != null) {
			target.norm = patch.norm;
			target.normRaw = patch.normRaw ?? String(patch.norm);
		}
		if (patch.workType) target.workType = patch.workType;

		usedIndexes.add(snapshotIndex);
		patched++;

		results.push({
			status: "matched",
			csvKey: key,
			snapshotIndex,
			formulaText: patch.formulaText,
			roundingMode: patch.roundingMode,
			roundingStep: patch.roundingStep,
			unmatchedParams: build.unmatchedParams,
			transformedSpecial: build.transformedSpecial,
			laborCoefficientParams: patch.laborCoefficients?.length ?? 0,
			triggerRules: patch.triggerRules?.length ?? 0,
			unresolvedTriggers: (patch.triggerRules ?? [])
				.filter((rule) => rule.operator === "unresolved")
				.map((rule) => rule.paramName),
			matchKind,
			...(matchKind === "fuzzy" || matchKind === "registry_append"
				? { fuzzyMatchedName: target.name }
				: {}),
		});
	}

	const withFormula = snapshot.typicalWorks.filter((w) =>
		w.formulaText?.trim(),
	).length;
	const withNorm = snapshot.typicalWorks.filter((w) => w.norm != null).length;
	const matchedResults = results.filter(
		(result): result is Extract<MatchResult, { status: "matched" }> =>
			result.status === "matched",
	);

	const report = {
		generatedAt: new Date().toISOString(),
		mode: write ? "write" : "dry-run",
		csvPath,
		snapshotPath: SNAPSHOT_PATH,
		counts: {
			csvRows: csvRows.length,
			matched: matchedResults.length,
			unmatched: results.filter((r) => r.status === "unmatched_csv").length,
			skipped: results.filter((r) => r.status === "skipped").length,
			appended,
			transformedSpecialFormulas: matchedResults.filter(
				(result) => result.transformedSpecial.length > 0,
			).length,
			unresolvedTriggerRules: matchedResults.reduce(
				(total, result) => total + result.unresolvedTriggers.length,
				0,
			),
			snapshotWithFormula: withFormula,
			patchedThisRun: patched,
			alreadyHadFormula,
		},
		results,
	};

	mkdirSync(OUTPUT_DIR, { recursive: true });
	writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf-8");

	if (write) {
		const counts = (snapshot.meta.counts ?? {}) as Record<string, number>;
		snapshot.meta = {
			...snapshot.meta,
			counts: {
				...counts,
				typicalWorks: snapshot.typicalWorks.length,
				typicalWorksWithNorm: withNorm,
				typicalWorksWithFormula: withFormula,
			},
		};
		writeFileSync(
			SNAPSHOT_PATH,
			`${JSON.stringify(snapshot, null, 2)}\n`,
			"utf-8",
		);
	}

	console.log(
		`[import-csv-formulas] ${write ? "WROTE" : "DRY-RUN"} matched=${report.counts.matched} appended=${appended} unmatched=${report.counts.unmatched} snapshotWithFormula=${withFormula} totalWorks=${snapshot.typicalWorks.length}`,
	);
	console.log(`Report: ${REPORT_PATH}`);
	if (!write) {
		console.log("Re-run with --write to update snapshot.");
	}
}

main();
