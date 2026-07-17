import { parseWorkFormulaText } from "./v2-work-formula.util";
import { slugParamCode } from "./v2-param-slug.util";
import {
	normalizeTypicalWorkTriggerRuleForMatch,
} from "./v2-works-catalog-match.util";

export type CsvFormulaRoundingMode = "CEIL" | "FLOOR" | "ROUND" | "NONE";

export type CsvFormulaImportRow = {
	stream: string;
	component: string;
	stage: string;
	name: string;
	originalName: string;
	workType: string;
	norm: number | null;
	normRaw: string;
	triggerParams: string[];
	triggerRules: CsvFormulaTriggerRule[];
	laborParams: string[];
	formulaRaw: string;
	/** Колонка «Коэффициенты параметров трудоёмкости» (формат модельного стрима). */
	laborCoefficientsRaw?: string;
};

export type CsvFormulaCatalogPatch = {
	formulaText: string;
	roundingMode: CsvFormulaRoundingMode;
	roundingStep: number | null;
	laborParams?: string[];
	laborCoefficients?: CsvFormulaLaborCoefficient[];
	triggerParams?: string[];
	triggerRules?: CsvFormulaTriggerRule[];
	norm?: number | null;
	normRaw?: string;
	workType?: string;
};

export type CsvFormulaLaborCoefficient = {
	paramName: string;
	values: Array<{
		label: string;
		coefficient: number;
	}>;
};

export type CsvFormulaTriggerRule = {
	paramName: string;
	operator: "=" | "!=" | "in" | "exists" | "unresolved";
	values: string[];
};

export type CsvFormulaParamCandidate = {
	name: string;
	code: string;
};

export type CsvFormulaBuildResult = {
	formulaText: string;
	roundingMode: CsvFormulaRoundingMode;
	roundingStep: number | null;
	unmatchedParams: string[];
	parseError: string | null;
	skippedSpecial: string[];
	inferredLaborParams: string[];
	transformedSpecial: string[];
};

export type CsvFormulaCatalogMatchKey = {
	stream: string;
	component: string;
	stage: string;
	name: string;
};

/** RFC4180-подобный парсер CSV с `;` и многострочными полями в кавычках. */
export function parseCsvSemicolon(text: string): string[][] {
	const rows: string[][] = [];
	let field = "";
	let row: string[] = [];
	let inQuotes = false;
	const src = text.replace(/^\uFEFF/, "");

	for (let i = 0; i < src.length; i++) {
		const ch = src[i];
		if (inQuotes) {
			if (ch === '"') {
				if (src[i + 1] === '"') {
					field += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				field += ch;
			}
			continue;
		}
		if (ch === '"') {
			inQuotes = true;
		} else if (ch === ";") {
			row.push(field);
			field = "";
		} else if (ch === "\n") {
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
		} else if (ch !== "\r") {
			field += ch;
		}
	}
	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function clean(value: string | undefined): string {
	return (value ?? "").replace(/\s+/g, " ").trim();
}

export function parseNormFromCsv(raw: string | undefined): number | null {
	const v = clean(raw).replace(",", ".");
	if (!v) return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

export function normalizeCsvArchComponent(raw: string): string {
	const v = clean(raw)
		.replace(/^Арх\.?\s*Компонент\.?\s*/i, "")
		.trim();
	const map: Record<string, string> = {
		"Система источник": "Система-источник",
		"Система-источник": "Система-источник",
		"Объект данных": "Объект/Витрина данных",
		"Объект/Витрина данных": "Объект/Витрина данных",
		"Объект / Витрина данных": "Объект / Витрина данных",
		"Процессы Обработки данных": "Процесс обработки данных",
		"Процесс обработки данных": "Процесс обработки данных",
		"Модельный сервис": "Модельный сервис",
		Модель: "Модель",
	};
	return map[v] ?? v;
}

/** Этап 220 / 230 и «?» — как в v2-catalog-component-inference. */
export function inferCsvArchComponent(
	rawComponent: string,
	stream: string,
	stage: string,
): string {
	const component = rawComponent.trim();
	if (component && !component.endsWith("?")) {
		return normalizeCsvArchComponent(component);
	}
	const streamNorm = stream.trim();
	const stageNorm = stage.trim();
	if (streamNorm.includes("Контроль моделей")) {
		return "Модельный сервис";
	}
	if (stageNorm === "Этап 230" || stageNorm === "Этап 219") {
		return "Система-источник";
	}
	if (stageNorm === "Этап 220") {
		return "Объект/Витрина данных";
	}
	return normalizeCsvArchComponent(component);
}

export function stripWorkStagePrefix(name: string): string {
	let rest = name.trim();
	rest = rest.replace(/^Этап[\s_]+\d+\.\s*/u, "");
	const stagePrefix = rest.match(/^(\d+[ABАВаб]?)\.\s*/iu);
	if (stagePrefix) {
		rest = rest.slice(stagePrefix[0].length);
	} else {
		rest = rest.replace(/^AutoML:\s*/iu, "");
	}
	return rest.trim().replace(/\.\s*$/u, "");
}

/** E2E-этап из названия работы модельного стрима: «01. …», «05A. …», «AutoML: …». */
export function extractE2eWorkStage(name: string): string {
	const trimmed = name.trim();
	const stagePrefix = trimmed.match(/^(\d+[ABАВаб]?)\.\s*/iu);
	if (stagePrefix?.[1]) {
		return stagePrefix[1]
			.replace(/А/g, "A")
			.replace(/В/g, "B")
			.replace(/а/g, "A")
			.replace(/в/g, "B");
	}
	if (/^AutoML:/iu.test(trimmed)) return "AutoML";
	return "";
}

export function resolveE2eWorkStageAndName(smartName: string): {
	stage: string;
	name: string;
} {
	const stage = extractE2eWorkStage(smartName);
	let name = smartName.trim();
	name = name.replace(/^Этап[\s_]+\d+\.\s*/u, "");
	const stagePrefix = name.match(/^(\d+[ABАВаб]?)\.\s*/iu);
	if (stagePrefix) {
		name = name.slice(stagePrefix[0].length);
	} else {
		name = name.replace(/^AutoML:\s*/iu, "");
	}
	name = name.trim().replace(/\.\s*$/u, "");
	return { stage, name: name || smartName.trim() };
}

/** Шаги K = 1 + (N−1)×increment для архкоэф(Модели; …). */
export function buildLinearArchCountSteps(
	maxCount: number,
	increment = 0.75,
): Array<{ count: number; coefficient: number }> {
	const steps: Array<{ count: number; coefficient: number }> = [];
	for (let count = 1; count <= maxCount; count += 1) {
		const coefficient =
			count === 1 ? 1 : Math.round((1 + (count - 1) * increment) * 10000) / 10000;
		steps.push({ count, coefficient });
	}
	return steps;
}

export const MODEL_STREAM_SOURCE_COUNT_STEPS: Array<{
	count: number;
	coefficient: number;
}> = [
	{ count: 1, coefficient: 1 },
	{ count: 2, coefficient: 1.2 },
	{ count: 3, coefficient: 1.4 },
	{ count: 4, coefficient: 1.6 },
	{ count: 5, coefficient: 1.8 },
	{ count: 6, coefficient: 2 },
	{ count: 7, coefficient: 2.2 },
	{ count: 8, coefficient: 2.4 },
	{ count: 9, coefficient: 2.6 },
	{ count: 10, coefficient: 3 },
];

export function formatArchCountFormulaSteps(
	steps: ReadonlyArray<{ count: number; coefficient: number }>,
): string {
	return steps
		.map(
			(step) =>
				`${step.count}=${String(step.coefficient).replace(".", ",")}`,
		)
		.join("; ");
}

const MODEL_STREAM_ARCH_COUNT_PARAM_LABELS: Record<
	string,
	{ kind: "model" | "sourceSystem"; steps: string }
> = {
	"кол-во моделей": {
		kind: "model",
		steps: formatArchCountFormulaSteps(buildLinearArchCountSteps(15)),
	},
	"количество моделей": {
		kind: "model",
		steps: formatArchCountFormulaSteps(buildLinearArchCountSteps(15)),
	},
	"кол-во источников для проработки": {
		kind: "sourceSystem",
		steps: formatArchCountFormulaSteps(MODEL_STREAM_SOURCE_COUNT_STEPS),
	},
};

function isInitiativesDivisorParam(label: string): boolean {
	const norm = normalizeParamLabel(label);
	return norm.includes("оцениваемых инициатив");
}

/** Парсит блоки «Параметр: 1→1; 2→1,25 …» из колонки коэффициентов модельного стрима. */
export function parseModelStreamLaborCoefficients(
	raw: string,
): CsvFormulaLaborCoefficient[] {
	const text = raw.replace(/\r/g, "").trim();
	if (!text) return [];

	const groups: CsvFormulaLaborCoefficient[] = [];
	const blocks = text.split(/\n(?=[^\n]+:)/u);
	for (const block of blocks) {
		const colon = block.indexOf(":");
		if (colon <= 0) continue;
		const paramName = clean(block.slice(0, colon));
		const body = block.slice(colon + 1);
		if (!paramName) continue;

		if (/делитель итога/iu.test(body) || isInitiativesDivisorParam(paramName)) {
			const values: Array<{ label: string; coefficient: number }> = [
				{ label: "1", coefficient: 1 },
			];
			for (let n = 2; n <= 99; n += 1) {
				values.push({
					label: String(n),
					coefficient: Math.round((1 / n) * 10000) / 10000,
				});
			}
			groups.push({ paramName, values });
			continue;
		}

		const values: Array<{ label: string; coefficient: number }> = [];
		for (const match of body.matchAll(
			/(?:^|[;\s(])([^→;(\n]+?)\s*→\s*(-?\d+(?:[.,]\d+)?)/giu,
		)) {
			const label = clean(match[1] ?? "");
			const coefficient = Number((match[2] ?? "").replace(",", "."));
			if (!label || !Number.isFinite(coefficient)) continue;
			if (/^далее\b/iu.test(label)) continue;
			values.push({ label, coefficient });
		}

		if (/K\s*=\s*1\s*\+\s*\(N.?1\)\s*×\s*0\.75/iu.test(body)) {
			const maxCount =
				normalizeParamLabel(paramName).includes("модел") ? 15 : 99;
			for (let n = 2; n <= maxCount; n += 1) {
				const coefficient = Math.round((1 + (n - 1) * 0.75) * 10000) / 10000;
				if (!values.some((row) => row.label === String(n))) {
					values.push({ label: String(n), coefficient });
				}
			}
		}

		if (values.length > 0) {
			groups.push({ paramName, values });
		}
	}
	return groups;
}

function hasModelStreamTriggerOperator(part: string): boolean {
	return /(?:=|≠|>=|<=|>|<)\s*/u.test(part);
}

function splitModelStreamTriggerClauses(raw: string): string[] {
	if (!/\s+И\s+/u.test(raw)) return [raw];

	const parts: string[] = [];
	let current = "";
	for (const segment of raw.split(/\s+И\s+/u)) {
		if (!current) {
			current = segment;
			continue;
		}
		if (hasModelStreamTriggerOperator(current)) {
			parts.push(current.trim());
			current = segment;
		} else {
			current += ` И ${segment}`;
		}
	}
	if (current.trim()) parts.push(current.trim());
	return parts.length > 0 ? parts : [raw];
}

function parseSingleModelStreamTriggerRule(
	raw: string,
): CsvFormulaTriggerRule | null {
	const part = clean(raw);
	if (!part) return null;

	const eqQuoted = part.match(/^(.+?)\s*=\s*«([^»]+)»\s*$/u);
	if (eqQuoted?.[1] && eqQuoted[2]) {
		return {
			paramName: clean(eqQuoted[1]),
			operator: "=",
			values: [clean(eqQuoted[2])],
		};
	}

	const neqQuoted = part.match(/^(.+?)\s*≠\s*«([^»]+)»\s*$/u);
	if (neqQuoted?.[1] && neqQuoted[2]) {
		return {
			paramName: clean(neqQuoted[1]),
			operator: "!=",
			values: [clean(neqQuoted[2])],
		};
	}

	if (/≠\s*Пусто\s*$/iu.test(part)) {
		return {
			paramName: clean(part.replace(/≠\s*Пусто\s*$/iu, "")),
			operator: "exists",
			values: [],
		};
	}

	if (/>\s*0\s*$/u.test(part)) {
		return {
			paramName: clean(part.replace(/>\s*0\s*$/u, "")),
			operator: "exists",
			values: [],
		};
	}

	return parseCsvTriggerRules(part)[0] ?? null;
}

export function parseModelStreamTriggerRules(raw: string): CsvFormulaTriggerRule[] {
	const trimmed = raw.trim();
	if (!trimmed) return [];

	return splitModelStreamTriggerClauses(trimmed)
		.map((chunk) => parseSingleModelStreamTriggerRule(chunk))
		.filter((rule): rule is CsvFormulaTriggerRule => rule !== null);
}

/** Строка триггера из колонки «Результат выбора» (блок «Триггер: …»). */
export function extractTriggerTextFromResultChoice(raw: string): string {
	const normalized = raw.replace(/\r/g, "").trim();
	if (!normalized) return "";
	const match = normalized.match(/(?:^|\n)\s*Триггер:\s*([^\n]+)/iu);
	if (!match?.[1]) return "";
	return clean(match[1].replace(/\s*\(иначе.*$/iu, ""));
}

function splitTopLevelList(raw: string): string[] {
	const parts: string[] = [];
	let current = "";
	let parenDepth = 0;

	for (const ch of raw.replace(/\r/g, "")) {
		if (ch === "(") parenDepth++;
		else if (ch === ")" && parenDepth > 0) parenDepth--;

		if ((ch === "," || ch === "\n") && parenDepth === 0) {
			const part = clean(current);
			if (part) parts.push(part);
			current = "";
			continue;
		}
		current += ch;
	}

	const tail = clean(current);
	if (tail) parts.push(tail);
	return parts;
}

function parseLaborParamsNumbered(raw: string): string[] {
	const trimmed = raw.trim();
	if (!trimmed || /^—(?:\s|\(|$)/u.test(trimmed)) return [];

	const lines = raw.split("\n");
	const params: string[] = [];
	for (const line of lines) {
		const m = line.trim().match(/^\d+\.\s*(.+)$/);
		if (m?.[1]) {
			params.push(clean(m[1]));
		}
	}
	if (params.length === 0) {
		if (trimmed.includes(";")) {
			return trimmed
				.split(";")
				.map((part) => clean(part))
				.filter(Boolean);
		}
		return splitTopLevelList(raw);
	}
	return params;
}

export function parseCsvTriggerRules(raw: string): CsvFormulaTriggerRule[] {
	return splitTopLevelList(raw).map((rawParam): CsvFormulaTriggerRule => {
		const sourceType = rawParam.match(
			/^(Тип\s+(?:системы-)?источника)\s*\((внешний|внутренний)\)$/iu,
		);
		if (sourceType?.[1] && sourceType[2]) {
			const sourceValue = clean(sourceType[2]);
			return {
				paramName: clean(sourceType[1]),
				operator: "=",
				values: [
					sourceValue.charAt(0).toUpperCase() +
						sourceValue.slice(1).toLowerCase(),
				],
			};
		}

		const pilot = rawParam.match(/^Пилот\s*\(([^)]+)\)$/iu);
		if (pilot?.[1]) {
			return {
				paramName: "Пилот",
				operator: "in",
				values: splitTopLevelList(pilot[1]).map(
					(value) =>
						value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(),
				),
			};
		}

		const control = rawParam.match(/^(Вид контроля)\s*:\s*(.+)$/iu);
		if (control?.[1] && control[2]) {
			return {
				paramName: clean(control[1]),
				operator: "=",
				values: [clean(control[2])],
			};
		}

		if (
			/^(Необходимо подтвердить возможность интеграции|Необходима продуктивизация)$/iu.test(
				rawParam,
			)
		) {
			return {
				paramName: rawParam,
				operator: "=",
				values: ["Да"],
			};
		}

		if (/^Не понятно условие появления работ$/iu.test(rawParam)) {
			return {
				paramName: rawParam,
				operator: "unresolved",
				values: [],
			};
		}

		return {
			paramName: rawParam,
			operator: "exists",
			values: [],
		};
	});
}

export function parseCsvLaborCoefficients(
	formulaRaw: string,
	archComponent?: string,
): CsvFormulaLaborCoefficient[] {
	const sectionMatch = formulaRaw.match(
		/Переменные\s*—\s*параметры трудоёмкости[\s\S]*?:([\s\S]*?)(?:\n\s*Операнды:|$)/iu,
	);
	if (!sectionMatch?.[1]) return [];

	const groups: CsvFormulaLaborCoefficient[] = [];
	for (const line of sectionMatch[1].split(/\r?\n/)) {
		const match = line.match(/^\s*—\s*(.+?):\s*(.+)$/u);
		if (!match?.[1] || !match[2] || !match[2].includes("→")) continue;

		const values = match[2]
			.split(";")
			.map((part) => {
				const arrow = part.indexOf("→");
				if (arrow < 0) return null;
				const rawLabel = clean(part.slice(0, arrow));
				const booleanLabel = rawLabel.match(/^(Да|Нет)\s*\(/iu);
				const label = booleanLabel?.[1] ?? rawLabel;
				const coefficientMatch = part
					.slice(arrow + 1)
					.trim()
					.match(/^(-?\d+(?:[.,]\d+)?)/u);
				if (!label || !coefficientMatch?.[1]) return null;
				const coefficient = Number(coefficientMatch[1].replace(",", "."));
				if (!Number.isFinite(coefficient)) return null;
				return { label, coefficient };
			})
			.filter(
				(value): value is { label: string; coefficient: number } =>
					value !== null,
			);

		const normalizedComponent = clean(archComponent).toLowerCase();
		const componentOverrides = match[2].matchAll(
			/\(\s*на\s+«([^»]+)»\s+([^→;)]+)→\s*(-?\d+(?:[.,]\d+)?)/giu,
		);
		for (const override of componentOverrides) {
			if (
				!normalizedComponent ||
				clean(override[1]).toLowerCase() !== normalizedComponent
			) {
				continue;
			}
			const label = clean(override[2]);
			const coefficient = Number((override[3] ?? "").replace(",", "."));
			if (!label || !Number.isFinite(coefficient)) continue;
			const existing = values.find(
				(value) => value.label.toLowerCase() === label.toLowerCase(),
			);
			if (existing) existing.coefficient = coefficient;
			else values.push({ label, coefficient });
		}

		if (values.length > 0) {
			groups.push({ paramName: clean(match[1]), values });
		}
	}
	return groups;
}

export function parseCsvFormulaImportRows(
	csvText: string,
): CsvFormulaImportRow[] {
	const rows = parseCsvSemicolon(csvText);
	if (rows.length < 2) return [];
	const header = rows[0];
	const idx = (prefix: string) =>
		header.findIndex((h) =>
			clean(h).toLowerCase().startsWith(prefix.toLowerCase()),
		);

	const cStream = idx("Стрим");
	const cComponent = idx("Арх");
	const cOriginal = idx("Название оригинальное");
	const cName = header.findIndex((h) =>
		clean(h).toLowerCase().includes("название в смарт-анкете"),
	);
	const cContext = idx("Контекст");
	const cWorkType = idx("Тип работы");
	const cNorm = idx("Наличие норматива");
	const cTrigger = idx("Параметр-триггер");
	const cResult = header.findIndex((h) =>
		clean(h).toLowerCase().includes("результат выбора"),
	);
	const cLabor = idx("Параметры трудоемкости");
	const cFormula = idx("Формула");
	const cCoeffs = header.findIndex((h) =>
		clean(h).toLowerCase().includes("коэффициенты параметров"),
	);

	return rows
		.slice(1)
		.map((r): CsvFormulaImportRow => {
			const originalName = clean(r[cOriginal]);
			const smartName =
				clean(r[cName >= 0 ? cName : cOriginal]) || originalName;
			const stream = clean(r[cStream]);
			let stage = clean(r[cContext]);
			const e2e = resolveE2eWorkStageAndName(smartName);
			if (!stage) stage = e2e.stage;
			const baseName =
				e2e.name ||
				stripWorkStagePrefix(smartName) ||
				stripWorkStagePrefix(originalName) ||
				smartName ||
				originalName;
			const triggerFromResult =
				cResult >= 0
					? extractTriggerTextFromResultChoice(r[cResult] ?? "")
					: "";
			const triggerRaw = triggerFromResult || (r[cTrigger] ?? "");
			const isModelStream =
				stream === "Модельный стрим" || stream === "Модельные стримы";
			const triggerRules = isModelStream
				? parseModelStreamTriggerRules(triggerRaw)
				: parseCsvTriggerRules(triggerRaw);
			return {
				stream,
				component: inferCsvArchComponent(r[cComponent] ?? "", stream, stage),
				stage,
				name: baseName,
				originalName: originalName || baseName,
				workType: clean(r[cWorkType]),
				norm: parseNormFromCsv(r[cNorm]),
				normRaw: clean(r[cNorm]),
				triggerParams: triggerRules.map((rule) => rule.paramName),
				triggerRules,
				laborParams:
					cLabor >= 0 ? parseLaborParamsNumbered(r[cLabor] ?? "") : [],
				formulaRaw: cFormula >= 0 ? (r[cFormula] ?? "") : "",
				laborCoefficientsRaw:
					cCoeffs >= 0 ? (r[cCoeffs] ?? "") : undefined,
			};
		})
		.filter((row) => row.name.length > 0 && row.stream.length > 0);
}

export function buildCatalogMatchKey(
	row: Pick<CsvFormulaImportRow, "stream" | "component" | "stage" | "name">,
): string {
	return [row.stream, row.component, row.stage, row.name]
		.map((part) => clean(part))
		.join("|");
}

export function normalizeParamLabel(label: string): string {
	return label
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[«»""]/g, "")
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function levenshteinDistance(a: string, b: string): number {
	const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
	for (let i = 1; i <= a.length; i++) {
		let diagonal = previous[0] ?? 0;
		previous[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const above = previous[j] ?? j;
			const left = previous[j - 1] ?? i;
			const next =
				a[i - 1] === b[j - 1]
					? diagonal
					: Math.min(diagonal + 1, above + 1, left + 1);
			diagonal = above;
			previous[j] = next;
		}
	}
	return previous[b.length] ?? Math.max(a.length, b.length);
}

export function resolveCsvParamCode(
	label: string,
	candidates: CsvFormulaParamCandidate[],
	overrides: Record<string, string> = {},
): string | null {
	const trimmed = label.trim();
	if (!trimmed) return null;
	if (overrides[trimmed]) return overrides[trimmed];
	const norm = normalizeParamLabel(trimmed);
	const exact = candidates.find(
		(c) => normalizeParamLabel(c.name) === norm || c.code === trimmed,
	);
	if (exact) return exact.code;
	const slug = slugParamCode(trimmed);
	const bySlug = candidates.find((c) => c.code === slug);
	if (bySlug) return bySlug.code;
	const partial = candidates
		.map((candidate) => ({
			candidate,
			normalized: normalizeParamLabel(candidate.name),
		}))
		.filter(({ normalized }) => {
			const shorter = Math.min(normalized.length, norm.length);
			return (
				shorter >= 8 &&
				(normalized.startsWith(norm) || norm.startsWith(normalized))
			);
		})
		.sort(
			(a, b) =>
				Math.abs(a.normalized.length - norm.length) -
				Math.abs(b.normalized.length - norm.length),
		)[0]?.candidate;
	if (partial) return partial.code;

	const fuzzy = candidates
		.map((candidate) => {
			const normalized = normalizeParamLabel(candidate.name);
			return {
				candidate,
				distance: levenshteinDistance(norm, normalized),
				maxLength: Math.max(norm.length, normalized.length),
			};
		})
		.filter(
			(item) =>
				item.maxLength >= 8 &&
				item.distance <= Math.max(2, Math.floor(item.maxLength * 0.12)),
		)
		.sort((a, b) => a.distance - b.distance)[0]?.candidate;
	if (fuzzy) return fuzzy.code;
	return null;
}

export function extractFormulaCoreFromCsvText(formulaRaw: string): {
	core: string;
	roundingMode: CsvFormulaRoundingMode;
	roundingStep: number | null;
} | null {
	const flat = formulaRaw.replace(/\r/g, "").replace(/\n/g, " ");
	const ceilMatch = flat.match(
		/ОКРУГЛ\.ВВЕРХ\s*\(\s*(.+?)\s*;\s*([\d,.]+)\s*\)/iu,
	);
	if (ceilMatch) {
		return {
			core: clean(ceilMatch[1]),
			roundingMode: "CEIL",
			roundingStep: Number(ceilMatch[2].replace(",", ".")) || 0.1,
		};
	}
	const floorMatch = flat.match(
		/ОКРУГЛ\.ВНИЗ\s*\(\s*(.+?)\s*;\s*([\d,.]+)\s*\)/iu,
	);
	if (floorMatch) {
		return {
			core: clean(floorMatch[1]),
			roundingMode: "FLOOR",
			roundingStep: Number(floorMatch[2].replace(",", ".")) || 0.1,
		};
	}
	const roundMatch = flat.match(/ОКРУГЛ\s*\(\s*(.+?)\s*;\s*([\d,.]+)\s*\)/iu);
	if (roundMatch) {
		return {
			core: clean(roundMatch[1]),
			roundingMode: "ROUND",
			roundingStep: Number(roundMatch[2].replace(",", ".")) || 0.1,
		};
	}
	if (
		/^Норматив\s*$/iu.test(clean(flat)) ||
		/\b=\s*Норматив\s*$/iu.test(flat)
	) {
		return {
			core: "Норматив",
			roundingMode: "CEIL",
			roundingStep: 0.1,
		};
	}
	const generic = flat.match(/ЧД\s*\([^)]*\)\s*=\s*(.+)$/iu);
	if (generic?.[1]) {
		const tail = clean(generic[1]);
		if (/^Норматив\s*$/iu.test(tail)) {
			return {
				core: "Норматив",
				roundingMode: "CEIL",
				roundingStep: 0.1,
			};
		}
	}
	return null;
}

export function buildFormulaTextFromCsvCore(
	core: string,
	resolveParamCode: (label: string) => string | null,
): Pick<
	CsvFormulaBuildResult,
	"formulaText" | "unmatchedParams" | "skippedSpecial"
> {
	const unmatchedParams: string[] = [];
	const skippedSpecial: string[] = [];

	if (/^Норматив\s*$/iu.test(core.trim())) {
		return { formulaText: "N", unmatchedParams, skippedSpecial };
	}

	if (/[KК]\s*\(/iu.test(core)) {
		return buildModelStreamFormulaTextFromCore(core, resolveParamCode);
	}

	const parts = core.split("×").map((part) => clean(part));
	const exprParts: string[] = ["N"];

	for (const part of parts) {
		if (!part || /^Норматив\s*$/iu.test(part)) continue;

		const bracket = part.match(/^\[(.+)\]$/);
		if (bracket?.[1]) {
			const label = bracket[1].trim();
			const code = resolveParamCode(label);
			if (!code) {
				unmatchedParams.push(label);
				continue;
			}
			exprParts.push(`коэф(${code})`);
			continue;
		}

		if (/Kдоля/i.test(part)) {
			skippedSpecial.push(part);
			continue;
		}

		unmatchedParams.push(part);
	}

	const formulaText = exprParts.length === 1 ? "N" : exprParts.join(" * ");
	return { formulaText, unmatchedParams, skippedSpecial };
}

function splitModelStreamFormulaOperands(core: string): string[] {
	const operands: string[] = [];
	let current = "";
	let parenDepth = 0;
	for (const ch of core.replace(/\r/g, "")) {
		if (ch === "(") parenDepth += 1;
		else if (ch === ")" && parenDepth > 0) parenDepth -= 1;
		const isMul = ch === "×" && parenDepth === 0;
		const isDiv = ch === "÷" && parenDepth === 0;
		if (isMul || isDiv) {
			const part = clean(current);
			if (part) operands.push(part);
			operands.push(isDiv ? "__DIV__" : "__MUL__");
			current = "";
			continue;
		}
		current += ch;
	}
	const tail = clean(current);
	if (tail) operands.push(tail);
	return operands;
}

function buildModelStreamFormulaTextFromCore(
	core: string,
	resolveParamCode: (label: string) => string | null,
): Pick<
	CsvFormulaBuildResult,
	"formulaText" | "unmatchedParams" | "skippedSpecial"
> {
	const unmatchedParams: string[] = [];
	const skippedSpecial: string[] = [];
	const operands = splitModelStreamFormulaOperands(
		core.replace(/^\d+(?:[.,]\d+)?\s*×\s*/u, "").replace(/^Норматив\s*×\s*/iu, ""),
	);
	const exprParts: string[] = ["N"];
	let pendingOp: "*" | "/" = "*";

	for (const operand of operands) {
		if (operand === "__MUL__") {
			pendingOp = "*";
			continue;
		}
		if (operand === "__DIV__") {
			pendingOp = "/";
			continue;
		}

		const coeffCall = operand.match(/^[KК]\s*\((.+)\)\s*$/iu);
		if (coeffCall?.[1]) {
			const label = clean(coeffCall[1]);
			const arch = MODEL_STREAM_ARCH_COUNT_PARAM_LABELS[normalizeParamLabel(label)];
			if (arch) {
				const kindLabel =
					arch.kind === "model" ? "Модели" : "Система-источник";
				const token = `архкоэф(${kindLabel}; ${arch.steps})`;
				exprParts.push(pendingOp === "/" ? `(${token})` : token);
				if (pendingOp === "/") pendingOp = "*";
				continue;
			}
			const code = resolveParamCode(label);
			if (!code) {
				unmatchedParams.push(label);
				continue;
			}
			const token = `коэф(${code})`;
			if (pendingOp === "/") {
				if (isInitiativesDivisorParam(label)) {
					exprParts.push(token);
				} else {
					exprParts.push(`/ ${token}`);
				}
				pendingOp = "*";
			} else {
				exprParts.push(token);
			}
			continue;
		}

		if (/^\d+(?:[.,]\d+)?$/u.test(operand)) {
			skippedSpecial.push(operand);
			continue;
		}

		const bareLabel = operand.replace(/^К\s*\(/iu, "").replace(/\)\s*$/u, "");
		const label = clean(bareLabel);
		const code = resolveParamCode(label);
		if (!code) {
			unmatchedParams.push(operand);
			continue;
		}
		const token = `коэф(${code})`;
		if (pendingOp === "/") {
			if (isInitiativesDivisorParam(label)) {
				exprParts.push(token);
			} else {
				exprParts.push(`/ ${token}`);
			}
			pendingOp = "*";
		} else {
			exprParts.push(token);
		}
	}

	let formulaText = "N";
	for (let i = 1; i < exprParts.length; i += 1) {
		const part = exprParts[i] ?? "";
		if (part.startsWith("/ ")) {
			formulaText += ` ${part}`;
		} else {
			formulaText += ` * ${part}`;
		}
	}
	formulaText = formulaText.replace(/\s+/g, " ").trim();
	return { formulaText, unmatchedParams, skippedSpecial };
}

function extractRoundedExpressionAfterMarker(
	formulaRaw: string,
	marker: string,
): string | null {
	const markerIndex = formulaRaw.indexOf(marker);
	if (markerIndex < 0) return null;
	const source = formulaRaw.slice(markerIndex);
	const callMatch = /ОКРУГЛ\.ВВЕРХ\s*\(/iu.exec(source);
	if (!callMatch) return null;

	const start = (callMatch.index ?? 0) + callMatch[0].length;
	let depth = 0;
	for (let index = start; index < source.length; index++) {
		const ch = source[index];
		if (ch === "(") depth++;
		else if (ch === ")") {
			if (depth === 0) return null;
			depth--;
		} else if (ch === ";" && depth === 0) {
			return source.slice(start, index).trim();
		}
	}
	return null;
}

function splitFirstTopLevelMultiply(
	expression: string,
): [string, string] | null {
	let depth = 0;
	for (let index = 0; index < expression.length; index++) {
		const ch = expression[index];
		if (ch === "(") depth++;
		else if (ch === ")" && depth > 0) depth--;
		else if (ch === "×" && depth === 0) {
			return [
				expression.slice(0, index).trim(),
				expression.slice(index + 1).trim(),
			];
		}
	}
	return null;
}

function buildKdolyaFormulaFromCalibration(
	formulaRaw: string,
	resolveParamCode: (label: string) => string | null,
): {
	formulaText: string;
	unmatchedParams: string[];
	inferredLaborParams: string[];
} | null {
	const calibration = extractRoundedExpressionAfterMarker(
		formulaRaw,
		"Исходная (калибровочная) формула",
	);
	if (!calibration) return null;
	const split = splitFirstTopLevelMultiply(calibration);
	if (!split || !/^\d+(?:[.,]\d+)?$/u.test(split[0])) return null;

	const unmatchedParams: string[] = [];
	const inferredLaborParams: string[] = [];
	const converted = split[1]
		.replace(/\[([^\]]+)\]/gu, (_match, rawLabel: string) => {
			const label = clean(rawLabel);
			if (!inferredLaborParams.includes(label)) {
				inferredLaborParams.push(label);
			}
			const code = resolveParamCode(label);
			if (!code) {
				unmatchedParams.push(label);
				return `коэф(${slugParamCode(label)})`;
			}
			return `коэф(${code})`;
		})
		.replace(/(\d),(\d)/g, "$1.$2")
		.replace(/×/g, "*")
		.replace(/÷/g, "/")
		.replace(/−/g, "-")
		.replace(/\s+/g, " ")
		.trim();

	if (!converted) return null;
	return {
		formulaText: `N * ${converted}`,
		unmatchedParams,
		inferredLaborParams,
	};
}

export function buildFormulaFromCsvRow(
	row: Pick<CsvFormulaImportRow, "formulaRaw" | "laborParams">,
	candidates: CsvFormulaParamCandidate[],
	overrides: Record<string, string> = {},
): CsvFormulaBuildResult | null {
	const extracted = extractFormulaCoreFromCsvText(row.formulaRaw);
	if (!extracted) return null;

	const laborCandidates: CsvFormulaParamCandidate[] = row.laborParams.map(
		(name) => ({
			name,
			code: slugParamCode(name),
		}),
	);
	const mergedCandidates = [...laborCandidates];
	for (const candidate of candidates) {
		if (!mergedCandidates.some((c) => c.code === candidate.code)) {
			mergedCandidates.push(candidate);
		}
	}

	const resolve = (label: string) =>
		resolveCsvParamCode(label, mergedCandidates, overrides);

	if (/Kдоля\s*\(/iu.test(extracted.core)) {
		const transformed = buildKdolyaFormulaFromCalibration(
			row.formulaRaw,
			resolve,
		);
		if (!transformed) {
			return {
				formulaText: "N",
				roundingMode: extracted.roundingMode,
				roundingStep: extracted.roundingStep,
				unmatchedParams: [],
				skippedSpecial: ["Kдоля(Этап 217)"],
				inferredLaborParams: [],
				transformedSpecial: [],
				parseError: null,
			};
		}
		const parsed = parseWorkFormulaText(transformed.formulaText);
		return {
			formulaText: transformed.formulaText,
			roundingMode: extracted.roundingMode,
			roundingStep: extracted.roundingStep,
			unmatchedParams: transformed.unmatchedParams,
			skippedSpecial: [],
			inferredLaborParams: transformed.inferredLaborParams,
			transformedSpecial: ["Kдоля(Этап 217) → калибровочный множитель"],
			parseError: parsed.error,
		};
	}

	const built = buildFormulaTextFromCsvCore(extracted.core, resolve);
	const parsed = parseWorkFormulaText(built.formulaText);

	return {
		formulaText: built.formulaText,
		roundingMode: extracted.roundingMode,
		roundingStep: extracted.roundingStep,
		unmatchedParams: built.unmatchedParams,
		skippedSpecial: built.skippedSpecial,
		inferredLaborParams: [],
		transformedSpecial: [],
		parseError: parsed.error,
	};
}

export function csvRowToCatalogPatch(
	row: CsvFormulaImportRow,
	candidates: CsvFormulaParamCandidate[],
	overrides: Record<string, string> = {},
): {
	patch: CsvFormulaCatalogPatch | null;
	build: CsvFormulaBuildResult | null;
} {
	const build = buildFormulaFromCsvRow(row, candidates, overrides);
	if (
		!build ||
		build.parseError ||
		build.unmatchedParams.length > 0 ||
		build.skippedSpecial.length > 0
	) {
		return { patch: null, build };
	}
	const laborParams =
		build.inferredLaborParams.length > 0
			? build.inferredLaborParams
			: row.laborParams;
	const allowedParamCodes = new Set(
		laborParams.flatMap((paramName) => {
			const slug = slugParamCode(paramName);
			const override = overrides[paramName.trim()];
			return override ? [slug, override] : [slug];
		}),
	);
	const parsed = parseWorkFormulaText(build.formulaText);
	const unboundCodes = parsed.tokens
		.filter(
			(
				token,
			): token is Extract<
				(typeof parsed.tokens)[number],
				{ kind: "param_coeff" | "param_anyof" }
			> => token.kind === "param_coeff" || token.kind === "param_anyof",
		)
		.map((token) => token.paramCode)
		.filter((paramCode) => !allowedParamCodes.has(paramCode));
	if (unboundCodes.length > 0) {
		build.unmatchedParams.push(
			...unboundCodes.map((paramCode) => `formula-code:${paramCode}`),
		);
		return { patch: null, build };
	}
	return {
		patch: {
			formulaText: build.formulaText,
			roundingMode: build.roundingMode,
			roundingStep: build.roundingStep,
			laborParams,
			laborCoefficients:
				row.laborCoefficientsRaw?.trim()
					? parseModelStreamLaborCoefficients(row.laborCoefficientsRaw)
					: parseCsvLaborCoefficients(row.formulaRaw, row.component),
			triggerParams: row.triggerParams,
			triggerRules: row.triggerRules.map((rule) =>
				enrichFactorySnapshotTriggerRule(rule),
			) as CsvFormulaTriggerRule[],
			norm: row.norm,
			normRaw: row.normRaw,
			workType: row.workType || undefined,
		},
		build,
	};
}

export type FactorySnapshotTriggerRule = {
	paramName: string;
	operator?: string;
	values?: string[];
	paramCode?: string;
	schemaFieldUid?: string;
	valueCode?: string | null;
	valueLabel?: string | null;
};

/** Нормализует triggerRules factory snapshot: valueCode/valueLabel для boolean «Да»/«Нет». */
export function enrichFactorySnapshotTriggerRule(
	rule: FactorySnapshotTriggerRule,
): FactorySnapshotTriggerRule {
	const operator =
		rule.operator === "exists" || rule.operator === "unresolved"
			? rule.operator
			: (rule.operator ?? "=");
	if (operator === "exists" || operator === "unresolved") {
		return { ...rule, operator };
	}

	const normalized = normalizeTypicalWorkTriggerRuleForMatch({
		paramCode: rule.paramCode?.trim() || slugParamCode(rule.paramName),
		paramName: rule.paramName,
		operator,
		valueCode: rule.valueCode ?? null,
		valueLabel: rule.valueLabel ?? null,
		values: rule.values?.length ? rule.values : undefined,
	});

	return {
		...rule,
		operator: normalized.operator,
		valueCode: normalized.valueCode,
		valueLabel: normalized.valueLabel,
		values:
			rule.values ??
			(normalized.valueLabel ? [normalized.valueLabel] : undefined),
	};
}

export function validateImportedFormulaText(
	formulaText: string,
): string | null {
	return parseWorkFormulaText(formulaText).error;
}
