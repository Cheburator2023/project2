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
	enrichFactorySnapshotTriggerRule,
	normalizeParamLabel,
	parseCsvFormulaImportRows,
	parseCsvLaborCoefficients,
	parseModelStreamLaborCoefficients,
	resolveImplementationStreamLabel,
	stripParamNameSourceKeys,
	V2_IMPLEMENTATION_STREAM_LABELS,
	type CsvFormulaCatalogPatch,
	type CsvFormulaImportRow,
	type CsvFormulaLaborCoefficient,
	type CsvFormulaParamCandidate,
	type V2ImplementationStreamCode,
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
const DICTIONARY_OVERRIDES_PATH = join(
	__dirname,
	"factory-dictionary-mapping-overrides.json",
);
const ANKETA_SNAPSHOT_PATH = join(
	__dirname,
	"..",
	"src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);
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
	/** Если коэффициента нет у значения справочника — подставить это число. */
	let missingCoeff: number | null = null;
	/** Только сверка значений коэффициентов со справочниками формы, без импорта CSV. */
	let alignOnly = false;
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--write") write = true;
		else if (arg === "--align-only") alignOnly = true;
		else if (arg === "--csv" && argv[i + 1]) {
			csvPath = argv[++i];
		} else if (arg === "--missing-coeff" && argv[i + 1]) {
			const n = Number(String(argv[++i]).replace(",", "."));
			if (Number.isFinite(n)) missingCoeff = n;
		}
	}
	// Контроль моделей: методология просит нули для незаданных значений.
	if (
		missingCoeff == null &&
		/контроль\s*моделей/iu.test(csvPath)
	) {
		missingCoeff = 0;
	}
	return { csvPath, write, missingCoeff, alignOnly };
}

function canonicalizeImportStream(stream: string): string {
	const trimmed = stream.trim();
	const byCode = resolveImplementationStreamLabel(trimmed);
	if (byCode !== trimmed) return byCode;
	const byLabel = (
		Object.entries(V2_IMPLEMENTATION_STREAM_LABELS) as Array<
			[V2ImplementationStreamCode, string]
		>
	).find(([, label]) => label === trimmed);
	if (byLabel) return byLabel[1];
	return canonicalizeWorkStream(trimmed);
}

function streamsMatch(a: string, b: string): boolean {
	return canonicalizeImportStream(a) === canonicalizeImportStream(b);
}

/** CSV «Реализация…» ↔ registry «N. … [КОД]» для контроля моделей. */
const CONTROL_MODEL_WORK_ALIASES: Record<string, string> = {
	"реализация проверок качества модельных данных":
		"качество модельных данных",
	"реализация технического контроля": "технический контроль",
	"реализация оперативного контроля": "оперативный контроль",
	"реализация аналитического контроля": "аналитический контроль",
	"реализация контроля модельных значений": "контроль модельных значений",
	"оценка влияния моделей": "оценка влияния моделей",
};

function normalizeWorkNameForMatch(name: string): string {
	return stripWorkStagePrefix(name)
		.trim()
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/\[[^\]]+\]/g, "")
		.replace(/^\d+\.\s*/u, "")
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function controlModelNamesMatch(csvName: string, registryName: string): boolean {
	const left = normalizeWorkNameForMatch(csvName);
	const right = normalizeWorkNameForMatch(registryName);
	if (left === right) return true;
	const alias = CONTROL_MODEL_WORK_ALIASES[left];
	return Boolean(alias && right.includes(alias));
}

function rowMatchKey(parts: {
	stream: string;
	component: string;
	stage: string;
	name: string;
}): string {
	return [
		canonicalizeImportStream(parts.stream),
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
	snapshot: SnapshotFile,
	missingCoeff: number | null,
): CsvFormulaLaborCoefficient[] {
	const fallback = missingCoeff ?? 1;
	const own = new Map(
		(patch.laborCoefficients ?? []).map((group) => [
			normalizeParamLabel(group.paramName),
			group,
		]),
	);
	for (const group of parseModelStreamLaborCoefficients(
		row.laborCoefficientsRaw ?? "",
	)) {
		const key = normalizeParamLabel(group.paramName);
		if (!own.has(key)) own.set(key, group);
	}
	// «Класс модели» в CSV = «Класс моделей» в каталоге.
	for (const [key, group] of [...own.entries()]) {
		if (key === "класс модели" && !own.has("класс моделей")) {
			own.set("класс моделей", { ...group, paramName: "Класс моделей" });
		}
	}
	const findGroup = (paramName: string): CsvFormulaLaborCoefficient | undefined => {
		const normalized = normalizeParamLabel(paramName);
		const aliasKey =
			normalized === "класс модели" ? "класс моделей" : normalized;
		const direct =
			own.get(normalized) ??
			own.get(aliasKey) ??
			lookup.byComponentAndParam.get(
				laborCoefficientKey(row.component, paramName),
			) ??
			lookup.byParam.get(normalized) ??
			lookup.byParam.get(aliasKey);
		if (direct) return direct;
		// CSV часто сокращает имя («…») — матчим по общему префиксу.
		const ownPartial = [...own.entries()].find(([key]) => {
			const shorter = Math.min(key.length, normalized.length);
			return (
				shorter >= 12 &&
				(key.startsWith(normalized.slice(0, shorter)) ||
					normalized.startsWith(key.replace(/…/g, "").trim()))
			);
		})?.[1];
		return ownPartial;
	};

	const dictionaryLabels = (paramName: string): string[] => {
		const keys = [
			normalizeParamLabel(paramName),
			normalizeParamLabel(
				LABOR_PARAM_LABEL_ALIASES[normalizeParamLabel(paramName)] ??
					paramName,
			),
		];
		for (const dict of snapshot.dictionaries) {
			if (!keys.includes(normalizeParamLabel(dict.name))) continue;
			return (dict.values ?? [])
				.map((value) => value.label?.trim())
				.filter((label): label is string => Boolean(label));
		}
		// Класс моделей — часто под другим именем справочника.
		if (keys.includes("класс моделей") || keys.includes("класс модели")) {
			const dict = snapshot.dictionaries.find((item) =>
				/класс\s*модел/iu.test(item.name),
			);
			return (dict?.values ?? [])
				.map((value) => value.label?.trim())
				.filter((label): label is string => Boolean(label));
		}
		return [];
	};

	const resolved: CsvFormulaLaborCoefficient[] = [];
	for (const paramName of patch.laborParams ?? []) {
		const group = findGroup(paramName);
		const canonicalName =
			normalizeParamLabel(paramName) === "класс модели"
				? "Класс моделей"
				: paramName;
		const values = new Map<string, number>();
		for (const value of group?.values ?? []) {
			values.set(
				value.label,
				value.coefficient == null || !Number.isFinite(value.coefficient)
					? fallback
					: value.coefficient,
			);
		}
		const labelKey = (label: string) =>
			normalizeParamLabel(label.replace(/^\d+\s*[—–-]\s*/u, ""))
				.replace(/финансового/gu, "фин")
				.replace(/\bфин\b/gu, "фин");
		const hasLabel = (label: string) => {
			const key = labelKey(label);
			return [...values.keys()].some((k) => {
				const other = labelKey(k);
				return (
					other === key ||
					(key.length >= 10 && other.includes(key)) ||
					(other.length >= 10 && key.includes(other))
				);
			});
		};
		for (const label of dictionaryLabels(canonicalName)) {
			if (hasLabel(label)) continue;
			values.set(label, fallback);
		}
		// Булевы (только Да/Нет в таблице): дополняем пару fallback-ом.
		const valueKeys = [...values.keys()].map((k) => labelKey(k));
		const booleanOnly = valueKeys.every((k) => k === "да" || k === "нет");
		if (booleanOnly) {
			const hasDa = valueKeys.includes("да");
			const hasNet = valueKeys.includes("нет");
			if (hasDa && !hasNet) values.set("Нет", fallback);
			if (hasNet && !hasDa) values.set("Да", fallback);
		} else {
			// Полу-булевы вроде «только Да→K» среди прочих параметров.
			const hasDa = valueKeys.includes("да");
			const hasNet = valueKeys.includes("нет");
			const nonBool = valueKeys.filter((k) => k !== "да" && k !== "нет");
			if (hasDa && !hasNet && nonBool.length === 0) values.set("Нет", fallback);
		}
		// Регуляторные требования 1–5: незаданные уровни → fallback.
		if (normalizeParamLabel(canonicalName).includes("регуляторн")) {
			for (const n of ["1", "2", "3", "4", "5"]) {
				if (!hasLabel(n)) values.set(n, fallback);
			}
		}
		resolved.push({
			paramName: canonicalName,
			values: [...values.entries()].map(([label, coefficient]) => ({
				label,
				coefficient,
			})),
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
	const stream = canonicalizeImportStream(row.stream);
	const component = normalizeArchComponentType(row.component);
	const candidates = works
		.map((work, index) => ({ work, index }))
		.filter(({ work, index }) => {
			if (usedIndexes.has(index)) return false;
			if (!streamsMatch(work.stream, stream)) return false;
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
	const aliasHit = candidates.find(({ work }) =>
		controlModelNamesMatch(targetName, work.name),
	);
	if (aliasHit) return aliasHit.index;
	const results = fuzzysort.go(targetName, candidates, {
		key: (item) => stripWorkStagePrefix(item.work.name),
		threshold: -10000,
		limit: 1,
	});
	const best = results[0];
	if (best && best.score >= -800) return best.obj.index;

	// Опечатки в snapshot («инфрмационных» vs «информационных»).
	const targetNorm = normalizeWorkNameForMatch(targetName);
	let bestLevenshtein: { index: number; distance: number } | null = null;
	for (const candidate of candidates) {
		const candidateNorm = normalizeWorkNameForMatch(candidate.work.name);
		if (!targetNorm || !candidateNorm) continue;
		const maxLen = Math.max(targetNorm.length, candidateNorm.length);
		if (maxLen < 20) continue;
		let distance = 0;
		const a = targetNorm;
		const b = candidateNorm;
		const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
		for (let i = 1; i <= a.length; i++) {
			let diag = prev[0] ?? 0;
			prev[0] = i;
			for (let j = 1; j <= b.length; j++) {
				const next =
					a[i - 1] === b[j - 1]
						? diag
						: Math.min((prev[j] ?? j) + 1, (prev[j - 1] ?? i) + 1, diag + 1);
				diag = prev[j] ?? j;
				prev[j] = next;
			}
		}
		distance = prev[b.length] ?? maxLen;
		if (distance <= Math.max(2, Math.floor(maxLen * 0.08))) {
			if (!bestLevenshtein || distance < bestLevenshtein.distance) {
				bestLevenshtein = { index: candidate.index, distance };
			}
		}
	}
	return bestLevenshtein?.index ?? null;
}

const FORMULA_PARAM_CODE_ALIASES: Record<string, string> = {
	класс_моделей: "modelClass",
	класс_модели: "modelClass",
};

const LABOR_PARAM_LABEL_ALIASES: Record<string, string> = {
	"класс модели": "класс моделей",
};

function remapFormulaParamCodes(formulaText: string): string {
	return Object.entries(FORMULA_PARAM_CODE_ALIASES).reduce(
		(text, [from, to]) =>
			text.split(`коэф(${from})`).join(`коэф(${to})`),
		formulaText,
	);
}

function findRegistryWork(
	row: CsvFormulaImportRow,
	registryWorks: V2FactoryTemplateTypicalWorkRegistryItem[],
): V2FactoryTemplateTypicalWorkRegistryItem | null {
	const stream = canonicalizeImportStream(row.stream);
	const component = normalizeArchComponentType(row.component);
	const name = stripWorkStagePrefix(row.name).trim();
	const stage = row.stage.trim();

	for (const entry of registryWorks) {
		const entryStream = entry.streams.some((s) => streamsMatch(s, stream));
		if (!entryStream) continue;
		if (normalizeArchComponentType(entry.archComponentType) !== component) {
			continue;
		}
		if (stage && !entry.name.startsWith(`${stage}.`)) continue;
		if (
			stripWorkStagePrefix(entry.name).trim() === name ||
			controlModelNamesMatch(name, entry.name)
		) {
			return entry;
		}
	}

	const fuzzyCandidates = registryWorks.filter((entry) => {
		const entryStream = entry.streams.some((s) => streamsMatch(s, stream));
		if (!entryStream) return false;
		if (normalizeArchComponentType(entry.archComponentType) !== component) {
			return false;
		}
		if (stage && !entry.name.startsWith(`${stage}.`)) return false;
		return true;
	});
	const aliasHit = fuzzyCandidates.find((entry) =>
		controlModelNamesMatch(name, entry.name),
	);
	if (aliasHit) return aliasHit;
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

type DictionaryOverrides = {
	valueAliases?: Record<string, Record<string, string>>;
	dropCoefficientValues?: Record<string, string[]>;
};

/** Ключ сравнения значения справочника: без «N — » префикса, регистра и ё. */
function enumMatchKey(value: string): string {
	return value
		.toLocaleLowerCase("ru-RU")
		.replace(/ё/g, "е")
		.replace(/^\s*\d+\s*[-–—.)]+\s*/u, "")
		.replace(/[«»"'`]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

type FormField = { code: string; schemaFieldUid: string; title: string };

/** Поля формы с ui:options.schemaFieldUid: код, uid и заголовок. */
function buildFormFieldIndex(): FormField[] {
	const fields: FormField[] = [];
	if (!existsSync(ANKETA_SNAPSHOT_PATH)) return fields;
	const anketa = JSON.parse(
		readFileSync(ANKETA_SNAPSHOT_PATH, "utf-8"),
	) as Record<string, unknown>;
	const jsonSchema = anketa.jsonSchema as Record<string, unknown> | undefined;
	const uiSchema = anketa.uiSchema as Record<string, unknown> | undefined;
	if (!jsonSchema || !uiSchema) return fields;

	const resolveTitle = (path: string[]): string => {
		let node: Record<string, unknown> | undefined = jsonSchema;
		for (const segment of path) {
			const items = node?.items as Record<string, unknown> | undefined;
			const props = (node?.properties ?? items?.properties) as
				| Record<string, unknown>
				| undefined;
			node = props?.[segment] as Record<string, unknown> | undefined;
			if (!node) return "";
		}
		return typeof node.title === "string" ? node.title : "";
	};

	const visit = (node: unknown, path: string[]): void => {
		if (!node || typeof node !== "object" || Array.isArray(node)) return;
		const record = node as Record<string, unknown>;
		const options = record["ui:options"] as
			| Record<string, unknown>
			| undefined;
		const uid = options?.schemaFieldUid;
		const code = path.at(-1);
		if (typeof uid === "string" && uid && code) {
			const title = resolveTitle(path);
			if (title) fields.push({ code, schemaFieldUid: uid, title });
		}
		for (const [key, child] of Object.entries(record)) {
			if (key.startsWith("ui:")) continue;
			visit(child, key === "items" ? path : [...path, key]);
		}
	};
	visit(uiSchema, []);
	return fields;
}

/** schemaFieldUid → значения enum из формы (jsonSchema + uiSchema анкеты). */
function buildSchemaEnumIndex(): Map<string, string[]> {
	const index = new Map<string, string[]>();
	if (!existsSync(ANKETA_SNAPSHOT_PATH)) return index;
	const anketa = JSON.parse(
		readFileSync(ANKETA_SNAPSHOT_PATH, "utf-8"),
	) as Record<string, unknown>;
	const jsonSchema = anketa.jsonSchema as Record<string, unknown> | undefined;
	const uiSchema = anketa.uiSchema as Record<string, unknown> | undefined;
	if (!jsonSchema || !uiSchema) return index;

	const resolveEnum = (path: string[]): string[] | null => {
		let node: Record<string, unknown> | undefined = jsonSchema;
		for (const segment of path) {
			const items = node?.items as Record<string, unknown> | undefined;
			const props = (node?.properties ?? items?.properties) as
				| Record<string, unknown>
				| undefined;
			node = props?.[segment] as Record<string, unknown> | undefined;
			if (!node) return null;
		}
		const items = node.items as Record<string, unknown> | undefined;
		const values = (node.enum ?? items?.enum) as unknown;
		return Array.isArray(values) ? values.map(String) : null;
	};

	const visit = (node: unknown, path: string[]): void => {
		if (!node || typeof node !== "object" || Array.isArray(node)) return;
		const record = node as Record<string, unknown>;
		const options = record["ui:options"] as
			| Record<string, unknown>
			| undefined;
		const uid = options?.schemaFieldUid;
		if (typeof uid === "string" && uid) {
			const values = resolveEnum(path);
			if (values?.length) index.set(uid, values);
		}
		for (const [key, child] of Object.entries(record)) {
			if (key.startsWith("ui:")) continue;
			visit(child, key === "items" ? path : [...path, key]);
		}
	};
	visit(uiSchema, []);
	return index;
}

/**
 * Приводит значения коэффициентов трудоёмкости к справочнику формы:
 * алиасы методолога → снятые значения → сверка с enum поля схемы.
 * Значение, которого нет в форме, выбрасывается (в расчёте оно всё равно ×1).
 */
function alignLaborValuesToSchemaEnums(
	works: V2FactoryTypicalWork[],
	enumIndex: Map<string, string[]>,
	overrides: DictionaryOverrides,
): Array<Record<string, unknown>> {
	const changes: Array<Record<string, unknown>> = [];
	for (const work of works) {
		const component = work.component?.trim() ?? "";
		for (const group of work.laborCoefficients ?? []) {
			const paramName = stripParamNameSourceKeys(group.paramName).trim();
			const alias =
				overrides.valueAliases?.[`${component}|${paramName}`] ??
				overrides.valueAliases?.[paramName];
			const dropped = new Set(
				(overrides.dropCoefficientValues?.[paramName] ?? []).map(enumMatchKey),
			);
			const schemaValues = group.schemaFieldUid
				? enumIndex.get(group.schemaFieldUid)
				: undefined;
			const nextValues: typeof group.values = [];
			for (const row of group.values ?? []) {
				const label = alias?.[row.label] ?? row.label;
				if (dropped.has(enumMatchKey(label))) {
					changes.push({
						kind: "drop_value_by_override",
						work: work.name,
						component,
						paramName,
						value: row.label,
					});
					continue;
				}
				if (!schemaValues) {
					nextValues.push(label === row.label ? row : { ...row, label });
					continue;
				}
				const schemaLabel = schemaValues.find(
					(value) => enumMatchKey(value) === enumMatchKey(label),
				);
				if (!schemaLabel) {
					// Не выбрасываем: часть параметров сверяется с живым справочником
					// или числовыми диапазонами, а не со статичным enum схемы.
					changes.push({
						kind: "value_absent_in_form",
						work: work.name,
						component,
						paramName,
						value: row.label,
						formValues: schemaValues,
					});
					nextValues.push(label === row.label ? row : { ...row, label });
					continue;
				}
				if (schemaLabel !== row.label) {
					changes.push({
						kind: "align_value_to_form",
						work: work.name,
						component,
						paramName,
						before: row.label,
						after: schemaLabel,
					});
				}
				nextValues.push(
					schemaLabel === row.label ? row : { ...row, label: schemaLabel },
				);
			}
			group.values = nextValues;
		}
	}
	return changes;
}

/**
 * CSV даёт триггеры голым именем («Тип системы-источника»), без привязки к полю.
 * Восстанавливаем paramCode/schemaFieldUid по уже связанным параметрам снимка,
 * иначе триггер не находит поле схемы и работа не появляется.
 */
function rebindTriggerRulesToKnownParams(
	works: V2FactoryTypicalWork[],
	formFields: FormField[],
): Array<Record<string, unknown>> {
	const key = (paramName: string) =>
		normalizeParamLabel(stripParamNameSourceKeys(paramName));
	const bindings = new Map<
		string,
		{ paramName: string; paramCode: string; schemaFieldUid?: string }
	>();
	const remember = (group: {
		paramName: string;
		paramCode?: string;
		schemaFieldUid?: string;
	}) => {
		if (!group.paramCode) return;
		const nk = key(group.paramName);
		if (!nk || bindings.has(nk)) return;
		bindings.set(nk, {
			paramName: group.paramName,
			paramCode: group.paramCode,
			schemaFieldUid: group.schemaFieldUid,
		});
	};
	for (const work of works) {
		for (const rule of work.triggerRules ?? []) remember(rule);
	}
	for (const work of works) {
		for (const group of work.laborCoefficients ?? []) remember(group);
	}
	const formByTitle = new Map<string, FormField[]>();
	for (const field of formFields) {
		const nk = key(field.title);
		formByTitle.set(nk, [...(formByTitle.get(nk) ?? []), field]);
	}

	const changes: Array<Record<string, unknown>> = [];
	for (const work of works) {
		for (const rule of work.triggerRules ?? []) {
			if (rule.paramCode || rule.operator === "unresolved") continue;
			const nk = key(rule.paramName);
			// Запасной вариант: одноимённое поле формы, если оно там ровно одно.
			const unique = formByTitle.get(nk);
			const binding =
				bindings.get(nk) ??
				(unique?.length === 1
					? {
							paramName: rule.paramName,
							paramCode: unique[0].code,
							schemaFieldUid: unique[0].schemaFieldUid,
						}
					: undefined);
			if (!binding) {
				changes.push({
					kind: "trigger_binding_not_found",
					work: work.name,
					paramName: rule.paramName,
				});
				continue;
			}
			changes.push({
				kind: "rebind_trigger",
				work: work.name,
				paramName: rule.paramName,
				paramCode: binding.paramCode,
			});
			rule.paramName = binding.paramName;
			rule.paramCode = binding.paramCode;
			if (binding.schemaFieldUid) rule.schemaFieldUid = binding.schemaFieldUid;
		}
	}
	return changes;
}

function main() {
	const { csvPath, write, missingCoeff, alignOnly } = parseArgs(
		process.argv.slice(2),
	);

	if (!alignOnly && !existsSync(csvPath)) {
		console.error(`CSV not found: ${csvPath}`);
		process.exit(1);
	}
	if (!existsSync(SNAPSHOT_PATH)) {
		console.error(`Snapshot not found: ${SNAPSHOT_PATH}`);
		process.exit(1);
	}

	const csvText = alignOnly ? "" : readFileSync(csvPath, "utf-8");
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

	for (const csvRow of alignOnly ? [] : csvRows) {
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

			// Σ / Норматив_класса — формулу не трогаем, но нормативы/триггеры/коэфы пишем.
			const partialMetaOnly =
				Boolean(build?.skippedSpecial.length) &&
				build!.unmatchedParams.length === 0 &&
				!build!.parseError;
			if (partialMetaOnly) {
				let snapshotIndex =
					indexByKey.get(key) ??
					findFuzzySnapshotIndex(csvRow, snapshot.typicalWorks, usedIndexes);
				let matchKind: "exact" | "fuzzy" | "registry_append" =
					snapshotIndex != null && indexByKey.get(key) === snapshotIndex
						? "exact"
						: "fuzzy";
				if (snapshotIndex == null) {
					const registryHit = findRegistryWork(
						csvRow,
						V2_FACTORY_TEMPLATE_TYPICAL_WORKS_REGISTRY.works,
					);
					if (registryHit) {
						const registryStream =
							registryHit.streams.find((s) =>
								streamsMatch(s, csvRow.stream),
							) ??
							registryHit.streams[0] ??
							csvRow.stream;
						const partialPatch: CsvFormulaCatalogPatch = {
							formulaText: "N * коэф(modelClass)",
							roundingMode: "CEIL",
							roundingStep: 0.1,
							laborParams: csvRow.laborParams.filter(
								(p) => !/количество моделей/iu.test(p),
							),
							laborCoefficients: [],
							triggerParams: csvRow.triggerParams,
							triggerRules: csvRow.triggerRules.map((rule) =>
								enrichFactorySnapshotTriggerRule(rule),
							) as CsvFormulaCatalogPatch["triggerRules"],
							norm: csvRow.norm,
							normRaw: csvRow.normRaw,
							workType: csvRow.workType || undefined,
						};
						partialPatch.laborCoefficients = resolveLaborCoefficients(
							csvRow,
							partialPatch,
							laborCoefficientLookup,
							snapshot,
							missingCoeff,
						);
						const newRow = buildCatalogWorkFromCsv(
							{
								...csvRow,
								stream: registryStream,
								name: registryHit.name,
								originalName: registryHit.name,
							},
							partialPatch,
						);
						// Формулу Σ не выдумываем — оставляем пустой до ответа методолога.
						newRow.formulaText = "";
						snapshotIndex = registerSnapshotRow(
							snapshot,
							newRow,
							indexByKey,
						);
						matchKind = "registry_append";
						appended++;
						usedIndexes.add(snapshotIndex);
						patched++;
						results.push({
							status: "matched",
							csvKey: key,
							snapshotIndex,
							formulaText: "",
							roundingMode: "CEIL",
							roundingStep: 0.1,
							unmatchedParams: [],
							transformedSpecial: [
								`partial_meta_only:${build!.skippedSpecial.join("|")}`,
							],
							laborCoefficientParams:
								partialPatch.laborCoefficients?.length ?? 0,
							triggerRules: partialPatch.triggerRules?.length ?? 0,
							unresolvedTriggers: [],
							matchKind,
							fuzzyMatchedName: registryHit.name,
						});
						continue;
					}
				}
				if (snapshotIndex != null) {
					const target = snapshot.typicalWorks[snapshotIndex];
					const partialPatch: CsvFormulaCatalogPatch = {
						formulaText: target.formulaText ?? "",
						roundingMode: target.roundingMode ?? "CEIL",
						roundingStep: target.roundingStep ?? 0.1,
						laborParams: csvRow.laborParams.filter(
							(p) => !/количество моделей/iu.test(p),
						),
						laborCoefficients: [],
						triggerParams: csvRow.triggerParams,
						triggerRules: csvRow.triggerRules.map((rule) =>
							enrichFactorySnapshotTriggerRule(rule),
						) as CsvFormulaCatalogPatch["triggerRules"],
						norm: csvRow.norm,
						normRaw: csvRow.normRaw,
						workType: csvRow.workType || undefined,
					};
					partialPatch.laborCoefficients = resolveLaborCoefficients(
						csvRow,
						partialPatch,
						laborCoefficientLookup,
						snapshot,
						missingCoeff,
					);
					if (partialPatch.laborParams)
						target.laborParams = partialPatch.laborParams;
					target.laborCoefficients = partialPatch.laborCoefficients?.map(
						(group) => ({
							...group,
							...(normalizeParamLabel(group.paramName) === "класс модели" ||
							normalizeParamLabel(group.paramName) === "класс моделей"
								? { paramCode: "modelClass" }
								: {}),
						}),
					);
					target.triggerParams = partialPatch.triggerParams ?? [];
					target.triggerParam = target.triggerParams[0] ?? target.triggerParam;
					target.triggerRules = partialPatch.triggerRules;
					if (partialPatch.norm != null) {
						target.norm = partialPatch.norm;
						target.normRaw = partialPatch.normRaw ?? String(partialPatch.norm);
					}
					if (partialPatch.workType) target.workType = partialPatch.workType;
					usedIndexes.add(snapshotIndex);
					patched++;
					if (target.formulaText?.trim()) alreadyHadFormula++;
					results.push({
						status: "matched",
						csvKey: key,
						snapshotIndex,
						formulaText: target.formulaText ?? "",
						roundingMode: target.roundingMode ?? "CEIL",
						roundingStep: target.roundingStep ?? 0.1,
						unmatchedParams: [],
						transformedSpecial: [
							`partial_meta_only:${build!.skippedSpecial.join("|")}`,
						],
						laborCoefficientParams:
							partialPatch.laborCoefficients?.length ?? 0,
						triggerRules: partialPatch.triggerRules?.length ?? 0,
						unresolvedTriggers: [],
						matchKind,
						fuzzyMatchedName: target.name,
					});
					continue;
				}
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
			snapshot,
			missingCoeff,
		);
		// missingCoeff: незаданные значения справочника (по умолчанию 1; для контроля моделей — 0).

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
				const registryStream =
					registryHit.streams.find((s) => streamsMatch(s, csvRow.stream)) ??
					registryHit.streams[0] ??
					csvRow.stream;
				const newRow = buildCatalogWorkFromCsv(
					{
						...csvRow,
						stream: registryStream,
						name: registryHit.name,
						originalName: registryHit.name,
					},
					patch,
				);
				snapshotIndex = registerSnapshotRow(snapshot, newRow, indexByKey);
				matchKind = "registry_append";
				appended++;
			}
		}

		if (snapshotIndex == null) {
			// Новые строки методологии (напр. «Доработка документации» на 215–230).
			const newRow = buildCatalogWorkFromCsv(csvRow, patch);
			snapshotIndex = registerSnapshotRow(snapshot, newRow, indexByKey);
			matchKind = "registry_append";
			appended++;
		}

		const target = snapshot.typicalWorks[snapshotIndex];
		const hadFormula = Boolean(target.formulaText?.trim());
		if (hadFormula && matchKind !== "registry_append") alreadyHadFormula++;

		// Исправляем только опечатки в названии (не трогаем registry «… [КД]»).
		const csvName = stripWorkStagePrefix(csvRow.name) || csvRow.name.trim();
		if (
			csvName &&
			!controlModelNamesMatch(csvName, target.name) &&
			normalizeWorkNameForMatch(csvName).length > 20
		) {
			const a = normalizeWorkNameForMatch(csvName);
			const b = normalizeWorkNameForMatch(target.name);
			const maxLen = Math.max(a.length, b.length);
			let distance = 0;
			const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
			for (let i = 1; i <= a.length; i++) {
				let diag = prev[0] ?? 0;
				prev[0] = i;
				for (let j = 1; j <= b.length; j++) {
					const next =
						a[i - 1] === b[j - 1]
							? diag
							: Math.min(
									(prev[j] ?? j) + 1,
									(prev[j - 1] ?? i) + 1,
									diag + 1,
								);
					diag = prev[j] ?? j;
					prev[j] = next;
				}
			}
			distance = prev[b.length] ?? maxLen;
			if (distance > 0 && distance <= Math.max(2, Math.floor(maxLen * 0.08))) {
				target.name = csvName;
				target.originalName =
					csvRow.originalName.trim() || csvName || target.originalName;
			}
		}
		target.component = normalizeArchComponentType(
			target.component || csvRow.component,
		);

		target.roundingMode = patch.roundingMode;
		target.roundingStep = patch.roundingStep;
		if (patch.laborParams !== undefined) {
			target.laborParams = patch.laborParams.filter(
				(p) => p.trim() && p.trim() !== "—",
			);
		}
		const bindingKey = (paramName: string) =>
			normalizeParamLabel(stripParamNameSourceKeys(paramName));
		const staticBindings = new Map(
			(target.laborCoefficients ?? []).map((group) => [
				bindingKey(group.paramName),
				{
					paramCode: group.paramCode,
					schemaFieldUid: group.schemaFieldUid,
					paramName: group.paramName,
				},
			]),
		);
		const catalogByParam = new Map<
			string,
			{ paramCode?: string; schemaFieldUid?: string; paramName?: string }
		>();
		for (const work of snapshot.typicalWorks) {
			for (const group of work.laborCoefficients ?? []) {
				const nk = bindingKey(group.paramName);
				if (!catalogByParam.has(nk) && group.paramCode) {
					catalogByParam.set(nk, {
						paramCode: group.paramCode,
						schemaFieldUid: group.schemaFieldUid,
						paramName: group.paramName,
					});
				}
			}
		}
		target.laborCoefficients = patch.laborCoefficients?.map((group) => {
			const key = bindingKey(group.paramName);
			const binding =
				staticBindings.get(key) ??
				catalogByParam.get(key) ??
				(key === "класс модели"
					? staticBindings.get("класс моделей") ??
						catalogByParam.get("класс моделей")
					: undefined);
			const paramCode =
				binding?.paramCode ??
				FORMULA_PARAM_CODE_ALIASES[slugParamCode(group.paramName)];
			return {
				...group,
				// Сохраняем каноническое имя с @code из snapshot, если было.
				paramName: binding?.paramName ?? group.paramName,
				...(paramCode ? { paramCode } : {}),
				...(binding?.schemaFieldUid
					? { schemaFieldUid: binding.schemaFieldUid }
					: {}),
			};
		});
		const laborGroups = target.laborCoefficients ?? [];
		let formulaText = patch.formulaText;
		for (const group of laborGroups) {
			if (!group.paramCode) continue;
			const shortName = stripParamNameSourceKeys(group.paramName);
			const variants = new Set([
				slugParamCode(shortName),
				slugParamCode(shortName.replace(/ё/g, "е")),
				slugParamCode(shortName.replace(/е/g, "ё")),
				slugParamCode(group.paramName),
				slugParamCode(
					LABOR_PARAM_LABEL_ALIASES[normalizeParamLabel(shortName)] ??
						shortName,
				),
			]);
			for (const slug of variants) {
				if (!slug) continue;
				formulaText = formulaText
					.split(`коэф(${slug})`)
					.join(`коэф(${group.paramCode})`);
			}
		}
		// ё/е ломает truncate slug(80) — добираем оставшиеся slug только по
		// уверенному префиксному совпадению (не короче 20 символов).
		formulaText = formulaText.replace(
			/коэф\(([^)]+)\)/gu,
			(full, rawCode: string) => {
				if (
					/^(field_|modelClass|type|workType|pilot|complexity)/u.test(
						rawCode,
					)
				) {
					return full;
				}
				const codeNorm = rawCode.replace(/ё/g, "е");
				const hit = laborGroups.find((group) => {
					if (!group.paramCode) return false;
					const slug = slugParamCode(
						stripParamNameSourceKeys(group.paramName).replace(/ё/g, "е"),
					);
					const prefixLen = Math.min(slug.length, codeNorm.length);
					if (prefixLen < 20) return false;
					return (
						slug.startsWith(codeNorm.slice(0, prefixLen)) ||
						codeNorm.startsWith(slug.slice(0, prefixLen))
					);
				});
				return hit?.paramCode ? `коэф(${hit.paramCode})` : full;
			},
		);
		target.formulaText = remapFormulaParamCodes(formulaText);

		// Убрать склеенные labor-параметры («Новый вид контроля Применение…»).
		if (target.laborParams?.length) {
			target.laborParams = target.laborParams.filter((name, index, all) => {
				const norm = normalizeParamLabel(name);
				return !all.some((other, otherIndex) => {
					if (otherIndex === index) return false;
					const otherNorm = normalizeParamLabel(other);
					return (
						otherNorm.length >= 12 &&
						norm !== otherNorm &&
						norm.includes(otherNorm)
					);
				});
			});
		}
		if (target.laborCoefficients?.length) {
			target.laborCoefficients = target.laborCoefficients.filter((group) => {
				const norm = normalizeParamLabel(group.paramName);
				return !target.laborCoefficients!.some((other) => {
					if (other === group) return false;
					const otherNorm = normalizeParamLabel(other.paramName);
					return (
						otherNorm.length >= 12 &&
						norm !== otherNorm &&
						norm.includes(otherNorm)
					);
				});
			});
		}
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

	const dictionaryOverrides = existsSync(DICTIONARY_OVERRIDES_PATH)
		? (JSON.parse(
				readFileSync(DICTIONARY_OVERRIDES_PATH, "utf-8"),
			) as DictionaryOverrides)
		: {};
	const laborValueAlignment = alignLaborValuesToSchemaEnums(
		snapshot.typicalWorks,
		buildSchemaEnumIndex(),
		dictionaryOverrides,
	);
	const triggerRebinds = rebindTriggerRulesToKnownParams(
		snapshot.typicalWorks,
		buildFormFieldIndex(),
	);

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
			laborValueAlignment: laborValueAlignment.length,
			triggerRebinds: triggerRebinds.length,
		},
		results,
		laborValueAlignment,
		triggerRebinds,
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
