#!/usr/bin/env tsx
/**
 * Repairs factory schema dictionary enums from the approved UI parameter CSV.
 *
 * Dry-run by default:
 *   npm run repair:factory-dictionaries
 * Apply:
 *   npm run repair:factory-dictionaries -- --write
 */
import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type JsonRecord = Record<string, unknown>;

type CsvParameter = {
	rowNumber: string;
	section: string;
	component: string;
	title: string;
	type: string;
	values: string[];
};

type SchemaField = {
	pointer: string;
	title: string;
	node: JsonRecord;
	ancestorTitles: string[];
};

type Overrides = {
	pointers?: Record<string, string>;
	ignoreRows?: string[];
	valueAliases?: Record<string, Record<string, string>>;
	dropCoefficientValues?: Record<string, string[]>;
};

type TypicalWork = {
	stream?: string;
	component?: string;
	stage?: string;
	name?: string;
	triggerRules?: Array<{
		paramName?: string;
		operator?: string;
		values?: string[];
	}>;
	triggerParams?: string[];
	laborParams?: string[];
	laborCoefficients?: Array<{
		paramName?: string;
		values?: Array<{ label?: string; coefficient?: number }>;
	}>;
	formulaText?: string;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = join(__dirname, "..");
const REPO_ROOT = join(SERVER_ROOT, "..", "..");
const DEFAULT_CSV_PATH = join(REPO_ROOT, "Параметры СА по блокам (3).csv");
const SNAPSHOT_PATH = join(
	SERVER_ROOT,
	"src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);
const WORKS_SNAPSHOT_PATH = join(
	SERVER_ROOT,
	"src/modules/anketa-v2/constants/v2-factory-typical-works.snapshot.json",
);
const OVERRIDES_PATH = join(
	__dirname,
	"factory-dictionary-mapping-overrides.json",
);
const REPORT_PATH = join(
	__dirname,
	"output/repair-factory-dictionaries-report.json",
);

function parseArgs(argv: string[]) {
	let write = false;
	let csvPath = DEFAULT_CSV_PATH;
	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index];
		if (arg === "--write") write = true;
		if (arg === "--csv" && argv[index + 1]) {
			csvPath = resolve(argv[++index]!);
		}
	}
	return { write, csvPath };
}

/** RFC4180-compatible enough for semicolon CSV with multiline quoted values. */
export function parseDelimitedCsv(text: string, delimiter = ";"): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let quoted = false;
	const source = text.replace(/^\uFEFF/, "");

	for (let index = 0; index < source.length; index++) {
		const char = source[index]!;
		if (quoted) {
			if (char === '"' && source[index + 1] === '"') {
				field += '"';
				index++;
			} else if (char === '"') {
				quoted = false;
			} else {
				field += char;
			}
			continue;
		}
		if (char === '"') quoted = true;
		else if (char === delimiter) {
			row.push(field);
			field = "";
		} else if (char === "\n") {
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
		} else if (char !== "\r") {
			field += char;
		}
	}
	if (field || row.length) {
		row.push(field);
		rows.push(row);
	}
	return rows;
}

function clean(value: unknown): string {
	return String(value ?? "")
		.replace(/\s+/g, " ")
		.trim();
}

export function normalizeLabel(value: unknown): string {
	return clean(value)
		.toLocaleLowerCase("ru-RU")
		.replace(/ё/g, "е")
		.replace(/[«»"'`]/g, "")
		.replace(/[?.!,;:()[\]{}/\\]/g, " ")
		.replace(/[—–-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function parseCsvParameters(text: string): CsvParameter[] {
	const [, ...rows] = parseDelimitedCsv(text);
	return rows
		.filter((row) => /^\d+$/.test(clean(row[0])))
		.map((row) => ({
			rowNumber: clean(row[0]),
			section: clean(row[1]),
			component: clean(row[2]),
			title: clean(row[3]),
			type: clean(row[4]),
			values: String(row[5] ?? "")
				.split(/\r?\n/)
				.map(clean)
				.filter(Boolean),
		}));
}

function isDictionaryParameter(parameter: CsvParameter): boolean {
	return (
		normalizeLabel(parameter.type).includes("справочник") &&
		parameter.values.length > 0
	);
}

function escapePointerSegment(segment: string): string {
	return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}

function collectSchemaFields(jsonSchema: JsonRecord): SchemaField[] {
	const fields: SchemaField[] = [];
	const visit = (
		node: unknown,
		pointer: string,
		ancestorTitles: string[],
	): void => {
		if (!node || typeof node !== "object" || Array.isArray(node)) return;
		const record = node as JsonRecord;
		const title = clean(record.title);
		if (pointer !== "/" && title) {
			fields.push({ pointer, title, node: record, ancestorTitles });
		}
		const nextAncestors = title ? [...ancestorTitles, title] : ancestorTitles;
		const properties = record.properties;
		if (properties && typeof properties === "object" && !Array.isArray(properties)) {
			for (const [key, child] of Object.entries(properties as JsonRecord)) {
				const childPointer =
					pointer === "/"
						? `/${escapePointerSegment(key)}`
						: `${pointer}/${escapePointerSegment(key)}`;
				visit(child, childPointer, nextAncestors);
			}
		}
		const items = record.items;
		if (items && typeof items === "object" && !Array.isArray(items)) {
			visit(items, `${pointer}/items`, nextAncestors);
		}
	};
	visit(jsonSchema, "/", []);
	return fields;
}

function sectionMatches(parameter: CsvParameter, field: SchemaField): boolean {
	const section = normalizeLabel(parameter.section);
	return field.ancestorTitles.some((title) => normalizeLabel(title) === section);
}

function componentMatches(parameter: CsvParameter, field: SchemaField): boolean {
	const component = normalizeLabel(parameter.component);
	if (!component) return true;
	if (
		[
			"типовые работы",
			"нетиповые работы",
			"локальные параметры стрима",
			"параметры",
		].includes(component)
	) {
		return true;
	}
	const aliases = [
		component,
		component.replace(/^арх компонент /, ""),
		component.replace(/система источник/, "системы источники"),
		component.replace(/объект витрина данных/, "объект данных"),
	];
	return field.ancestorTitles.some((title) => {
		const normalizedTitle = normalizeLabel(title);
		return aliases.some(
			(alias) =>
				normalizedTitle === alias ||
				normalizedTitle.includes(alias) ||
				alias.includes(normalizedTitle),
		);
	});
}

function findCandidates(
	parameter: CsvParameter,
	fields: SchemaField[],
): SchemaField[] {
	const title = normalizeLabel(parameter.title);
	const byTitle = fields.filter((field) => normalizeLabel(field.title) === title);
	const bySection = byTitle.filter((field) => sectionMatches(parameter, field));
	const byComponent = bySection.filter((field) =>
		componentMatches(parameter, field),
	);
	return byComponent.length > 0 ? byComponent : bySection;
}

function resolvePointerNode(root: JsonRecord, pointer: string): JsonRecord | null {
	let current: unknown = root;
	for (const rawSegment of pointer.split("/").filter(Boolean)) {
		const segment = rawSegment.replace(/~1/g, "/").replace(/~0/g, "~");
		if (!current || typeof current !== "object" || Array.isArray(current)) {
			return null;
		}
		if (segment === "items") {
			current = (current as JsonRecord).items;
		} else {
			const properties = (current as JsonRecord).properties;
			current =
				properties && typeof properties === "object"
					? (properties as JsonRecord)[segment]
					: undefined;
		}
	}
	return current && typeof current === "object" && !Array.isArray(current)
		? (current as JsonRecord)
		: null;
}

function setDictionaryValues(node: JsonRecord, parameter: CsvParameter): void {
	const multi = normalizeLabel(parameter.type).includes("множественный");
	if (multi) {
		node.type = "array";
		delete node.enum;
		node.uniqueItems = true;
		const items =
			node.items && typeof node.items === "object" && !Array.isArray(node.items)
				? ({ ...(node.items as JsonRecord) } satisfies JsonRecord)
				: {};
		items.type = "string";
		items.enum = [...parameter.values];
		node.items = items;
		return;
	}
	node.type = "string";
	node.enum = [...parameter.values];
	delete node.items;
	delete node.uniqueItems;
}

function collectDictionaryCodes(uiSchema: unknown): string[] {
	const codes = new Set<string>();
	const visit = (node: unknown): void => {
		if (!node || typeof node !== "object" || Array.isArray(node)) return;
		const record = node as JsonRecord;
		const options = record["ui:options"];
		if (options && typeof options === "object" && !Array.isArray(options)) {
			const code = clean((options as JsonRecord).dictionaryCode);
			if (code) codes.add(code);
		}
		for (const [key, child] of Object.entries(record)) {
			if (!key.startsWith("ui:")) visit(child);
		}
	};
	visit(uiSchema);
	return [...codes].sort();
}

function checksum(value: unknown): string {
	return createHash("sha256")
		.update(JSON.stringify(value))
		.digest("hex");
}

function valuesForWorkParameter(
	parameters: CsvParameter[],
	name: string,
	component: string,
): string[] | null {
	const normalizedName = normalizeLabel(name);
	const normalizedComponent = normalizeLabel(component);
	const matches = parameters.filter(
		(parameter) =>
			isDictionaryParameter(parameter) &&
			normalizeLabel(parameter.title) === normalizedName,
	);
	if (matches.length === 1) return matches[0]!.values;
	const contextual = matches.filter((parameter) => {
		const candidate = normalizeLabel(parameter.component);
		return (
			candidate === normalizedComponent ||
			candidate.includes(normalizedComponent) ||
			normalizedComponent.includes(candidate)
		);
	});
	return contextual.length === 1 ? contextual[0]!.values : null;
}

function formulaParamSlug(value: string): string {
	return normalizeLabel(value.replace(/_/g, " ")).replace(/\s+/g, "_");
}

function validateTypicalWorks(
	works: TypicalWork[],
	parameters: CsvParameter[],
) {
	const issues: JsonRecord[] = [];
	for (const work of works) {
		const context = {
			work: clean(work.name),
			stage: clean(work.stage),
			component: clean(work.component),
			stream: clean(work.stream),
		};
		for (const rule of work.triggerRules ?? []) {
			const paramName = clean(rule.paramName);
			const allowed = valuesForWorkParameter(
				parameters,
				paramName,
				context.component,
			);
			if (!allowed) continue;
			for (const value of rule.values ?? []) {
				if (!allowed.some((item) => normalizeLabel(item) === normalizeLabel(value))) {
					issues.push({
						kind: "trigger_value_outside_dictionary",
						...context,
						paramName,
						value,
						allowed,
					});
				}
			}
		}
		for (const group of work.laborCoefficients ?? []) {
			const paramName = clean(group.paramName);
			const allowed = valuesForWorkParameter(
				parameters,
				paramName,
				context.component,
			);
			if (!allowed) continue;
			for (const row of group.values ?? []) {
				const label = clean(row.label);
				if (
					label &&
					!allowed.some((item) => normalizeLabel(item) === normalizeLabel(label))
				) {
					issues.push({
						kind: "coefficient_value_outside_dictionary",
						...context,
						paramName,
						value: label,
						coefficient: row.coefficient ?? null,
						allowed,
					});
				}
			}
		}
		const laborNames = new Set((work.laborParams ?? []).map(normalizeLabel));
		for (const group of work.laborCoefficients ?? []) {
			if (!laborNames.has(normalizeLabel(group.paramName))) {
				issues.push({
					kind: "coefficient_without_labor_param",
					...context,
					paramName: clean(group.paramName),
				});
			}
		}
		const laborParamSlugs = new Set(
			(work.laborParams ?? []).map(formulaParamSlug),
		);
		const formulaTokens = [
			...(work.formulaText ?? "").matchAll(/коэф\(([^)]+)\)/giu),
		].map((match) => formulaParamSlug(match[1] ?? ""));
		for (const token of formulaTokens) {
			const matched = [...laborParamSlugs].some(
				(laborSlug) =>
					laborSlug === token ||
					(token.length >= 24 && laborSlug.startsWith(token)) ||
					(laborSlug.length >= 24 && token.startsWith(laborSlug)),
			);
			if (token && !matched) {
				issues.push({
					kind: "formula_parameter_without_labor_param",
					...context,
					paramCode: token,
					formulaText: work.formulaText ?? "",
				});
			}
		}
	}
	return issues;
}

function mappedWorkValue(
	overrides: Overrides,
	component: string,
	paramName: string,
	value: string,
): string {
	const contextualKey = `${component}|${paramName}`;
	return (
		overrides.valueAliases?.[contextualKey]?.[value] ??
		overrides.valueAliases?.[paramName]?.[value] ??
		value
	);
}

function repairTypicalWorks(
	works: TypicalWork[],
	overrides: Overrides,
): JsonRecord[] {
	const changes: JsonRecord[] = [];
	for (const work of works) {
		const component = clean(work.component);
		const workName = clean(work.name);
		const unresolvedRuleNames = new Set(
			(work.triggerRules ?? [])
				.filter((rule) => rule.operator === "unresolved")
				.map((rule) => clean(rule.paramName))
				.filter(Boolean),
		);
		if (unresolvedRuleNames.size > 0) {
			for (const paramName of unresolvedRuleNames) {
				changes.push({
					kind: "drop_unresolved_trigger",
					work: workName,
					component,
					paramName,
				});
			}
			work.triggerRules = (work.triggerRules ?? []).filter(
				(rule) => rule.operator !== "unresolved",
			);
			work.triggerParams = (work.triggerParams ?? []).filter(
				(paramName) => !unresolvedRuleNames.has(clean(paramName)),
			);
		}
		for (const rule of work.triggerRules ?? []) {
			const paramName = clean(rule.paramName);
			if (!rule.values) continue;
			rule.values = rule.values.map((value) => {
				const mapped = mappedWorkValue(
					overrides,
					component,
					paramName,
					value,
				);
				if (mapped !== value) {
					changes.push({
						kind: "remap_trigger_value",
						work: workName,
						component,
						paramName,
						before: value,
						after: mapped,
					});
				}
				return mapped;
			});
		}
		for (const group of work.laborCoefficients ?? []) {
			const paramName = clean(group.paramName);
			const dropped = new Set(
				(overrides.dropCoefficientValues?.[paramName] ?? []).map(
					normalizeLabel,
				),
			);
			const nextValues = [];
			for (const row of group.values ?? []) {
				const label = clean(row.label);
				if (dropped.has(normalizeLabel(label))) {
					changes.push({
						kind: "drop_obsolete_coefficient_value",
						work: workName,
						component,
						paramName,
						value: label,
						coefficient: row.coefficient ?? null,
					});
					continue;
				}
				const mapped = mappedWorkValue(
					overrides,
					component,
					paramName,
					label,
				);
				if (mapped !== label) {
					changes.push({
						kind: "remap_coefficient_value",
						work: workName,
						component,
						paramName,
						before: label,
						after: mapped,
						coefficient: row.coefficient ?? null,
					});
				}
				nextValues.push({ ...row, label: mapped });
			}
			group.values = nextValues;
		}
	}
	return changes;
}

function main(): void {
	const { write, csvPath } = parseArgs(process.argv.slice(2));
	const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as JsonRecord;
	const worksSnapshot = JSON.parse(
		readFileSync(WORKS_SNAPSHOT_PATH, "utf8"),
	) as JsonRecord;
	const overrides = existsSync(OVERRIDES_PATH)
		? (JSON.parse(readFileSync(OVERRIDES_PATH, "utf8")) as Overrides)
		: {};
	const ignoredRows = new Set(overrides.ignoreRows ?? []);
	const parameters = parseCsvParameters(readFileSync(csvPath, "utf8"));
	const dictionaryParameters = parameters.filter(isDictionaryParameter);
	const jsonSchema = snapshot.jsonSchema as JsonRecord;
	const fields = collectSchemaFields(jsonSchema);
	const beforeChecksum = checksum(snapshot);
	const changes: JsonRecord[] = [];
	const unresolved: JsonRecord[] = [];

	for (const parameter of dictionaryParameters) {
		if (ignoredRows.has(parameter.rowNumber)) continue;
		const overridePointer = overrides.pointers?.[parameter.rowNumber];
		const candidates = overridePointer
			? fields.filter((field) => field.pointer === overridePointer)
			: findCandidates(parameter, fields);
		if (candidates.length !== 1) {
			unresolved.push({
				rowNumber: parameter.rowNumber,
				section: parameter.section,
				component: parameter.component,
				title: parameter.title,
				candidates: candidates.map((field) => field.pointer),
				reason: candidates.length === 0 ? "not_found" : "ambiguous",
			});
			continue;
		}
		const field = candidates[0]!;
		const node = resolvePointerNode(jsonSchema, field.pointer);
		if (!node) {
			unresolved.push({
				rowNumber: parameter.rowNumber,
				title: parameter.title,
				reason: "pointer_not_resolved",
				pointer: field.pointer,
			});
			continue;
		}
		const previous = structuredClone(node);
		setDictionaryValues(node, parameter);
		if (JSON.stringify(previous) !== JSON.stringify(node)) {
			changes.push({
				rowNumber: parameter.rowNumber,
				title: parameter.title,
				pointer: field.pointer,
				before: previous,
				after: structuredClone(node),
			});
		}
	}

	const uiSchema = snapshot.uiSchema;
	snapshot.dictionariesSnapshot = {
		referencedDictionaryCodes: collectDictionaryCodes(uiSchema),
	};
	const works = (worksSnapshot.typicalWorks as TypicalWork[]) ?? [];
	const workRepairs = repairTypicalWorks(works, overrides);
	const workIssues = validateTypicalWorks(
		works,
		parameters,
	);
	const report = {
		mode: write ? "write" : "dry-run",
		csvPath,
		summary: {
			csvParameters: parameters.length,
			csvDictionaryParameters: dictionaryParameters.length,
			changes: changes.length,
			unresolved: unresolved.length,
			workRepairs: workRepairs.length,
			workIssues: workIssues.length,
		},
		checksums: {
			before: beforeChecksum,
			after: checksum(snapshot),
		},
		changes,
		unresolved,
		workRepairs,
		workIssues,
	};

	mkdirSync(dirname(REPORT_PATH), { recursive: true });
	writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
	console.log(JSON.stringify(report.summary, null, 2));
	console.log(`Report: ${REPORT_PATH}`);

	if (write) {
		if (unresolved.length > 0 || workIssues.length > 0) {
			throw new Error(
				`Write blocked: unresolved=${unresolved.length}, workIssues=${workIssues.length}`,
			);
		}
		writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, "\t")}\n`);
		writeFileSync(
			WORKS_SNAPSHOT_PATH,
			`${JSON.stringify(worksSnapshot, null, 2)}\n`,
		);
		console.log(`Updated: ${SNAPSHOT_PATH}`);
		console.log(`Updated: ${WORKS_SNAPSHOT_PATH}`);
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main();
}
