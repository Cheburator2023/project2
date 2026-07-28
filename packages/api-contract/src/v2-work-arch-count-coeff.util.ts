import { V2_ARCH_COMPONENT_LABELS } from "./v2-anketa-section-ui.util";
import type {
	V2TypicalWorkTriggerArchCountOperator,
	V2WorkArchCountCoeffStep,
	V2WorkFormulaArchCountKind,
} from "./v2-typical-work.types";
import { readPerInstanceArchCountOverride } from "./v2-typical-work-per-instance.util";
import { isFilledTypicalWorkSourceRow } from "./v2-typical-works.util";

export const V2_WORK_ARCH_COUNT_LIMITS: Record<
	V2WorkFormulaArchCountKind,
	{ min: number; max: number }
> = {
	model: { min: 1, max: 99 },
	sourceSystem: { min: 1, max: 99 },
	dataMart: { min: 1, max: 99 },
	dataProcess: { min: 1, max: 99 },
	modelService: { min: 1, max: 99 },
};

export type { V2WorkArchCountCoeffStep, V2WorkFormulaArchCountKind };
export { V2_WORK_FORMULA_ARCH_COUNT_KINDS } from "./v2-typical-work.types";

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function readArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function isFilledArchComponentObject(row: Record<string, unknown>): boolean {
	return Object.values(row).some((value) => {
		if (value == null || value === "") return false;
		if (typeof value === "boolean") return value;
		if (typeof value === "number") return Number.isFinite(value) && value !== 0;
		if (Array.isArray(value)) return value.length > 0;
		if (typeof value === "object") {
			return Object.values(value as Record<string, unknown>).some(
				(nested) => nested != null && nested !== "",
			);
		}
		return true;
	});
}

function countFilledArchObjects(candidates: unknown[]): number {
	let count = 0;
	for (const candidate of candidates) {
		if (Array.isArray(candidate)) {
			for (const item of candidate) {
				const row = readRecord(item);
				if (row && isFilledArchComponentObject(row)) count += 1;
			}
			continue;
		}
		const row = readRecord(candidate);
		if (row && isFilledArchComponentObject(row)) count += 1;
	}
	return count;
}

function normalizeArchCountKind(value: string): V2WorkFormulaArchCountKind | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const lower = trimmed.toLowerCase();
	const kinds = [
		"model",
		"sourceSystem",
		"dataMart",
		"dataProcess",
		"modelService",
	] as const;
	for (const kind of kinds) {
		if (kind.toLowerCase() === lower) return kind;
		const label = V2_ARCH_COMPONENT_LABELS[kind];
		if (label.toLowerCase() === lower) return kind;
	}
	return null;
}

export function formatWorkArchCountKindLabel(
	kind: V2WorkFormulaArchCountKind,
): string {
	return V2_ARCH_COMPONENT_LABELS[kind];
}

export function parseWorkArchCountKindLabel(
	label: string,
): V2WorkFormulaArchCountKind | null {
	return normalizeArchCountKind(label);
}

export function formatArchCountCoeffSteps(steps: readonly V2WorkArchCountCoeffStep[]): string {
	return [...steps]
		.sort((a, b) => a.count - b.count)
		.map((step) => `${step.count}=${String(step.coefficient).replace(".", ",")}`)
		.join("; ");
}

export function parseArchCountCoeffSteps(raw: string): V2WorkArchCountCoeffStep[] | null {
	const input = raw.trim();
	if (!input) return null;
	const steps: V2WorkArchCountCoeffStep[] = [];
	for (const chunk of input.split(";")) {
		const part = chunk.trim();
		if (!part) continue;
		const eq = part.indexOf("=");
		if (eq <= 0) return null;
		const count = Number(part.slice(0, eq).trim());
		const coefficient = Number(part.slice(eq + 1).trim().replace(",", "."));
		if (
			!Number.isFinite(count) ||
			!Number.isInteger(count) ||
			count < 1 ||
			!Number.isFinite(coefficient) ||
			coefficient <= 0
		) {
			return null;
		}
		steps.push({ count, coefficient });
	}
	return steps.length > 0 ? steps : null;
}

export function resolveLaborArchCountOperator(
	step: Pick<V2WorkArchCountCoeffStep, "operator">,
): V2TypicalWorkTriggerArchCountOperator {
	return step.operator ?? "=";
}

export function compareArchCount(
	actual: number,
	operator: V2TypicalWorkTriggerArchCountOperator,
	threshold: number,
): boolean {
	switch (operator) {
		case ">=":
			return actual >= threshold;
		case "<=":
			return actual <= threshold;
		case "=":
			return actual === threshold;
		case ">":
			return actual > threshold;
		case "<":
			return actual < threshold;
		default:
			return actual === threshold;
	}
}

/**
 * Безопасный eval формулы коэффициента от N (фактическое количество).
 * Допускаются: N, числа, + - * /, скобки.
 */
export function evalArchCountCoefficientFormula(
	formula: string,
	n: number,
): number | null {
	const trimmed = formula.trim().replace(/,/g, ".").replace(/\s+/g, "");
	if (!trimmed) return null;
	if (!Number.isFinite(n)) return null;
	if (!/^[0-9.N+\-*/()]+$/i.test(trimmed)) return null;
	if (/[Nn]{2,}/.test(trimmed)) return null;

	const tokens: Array<number | string> = [];
	let i = 0;
	while (i < trimmed.length) {
		const ch = trimmed[i]!;
		if (ch === "N" || ch === "n") {
			tokens.push(n);
			i += 1;
			continue;
		}
		if (ch === "(" || ch === ")" || ch === "+" || ch === "*" || ch === "/") {
			tokens.push(ch);
			i += 1;
			continue;
		}
		if (ch === "-") {
			const prev = tokens[tokens.length - 1];
			const unary =
				prev === undefined ||
				prev === "(" ||
				prev === "+" ||
				prev === "-" ||
				prev === "*" ||
				prev === "/";
			if (unary) {
				i += 1;
				const start = i;
				while (i < trimmed.length && /[0-9.]/.test(trimmed[i]!)) i += 1;
				if (start === i) return null;
				const num = Number(trimmed.slice(start, i));
				if (!Number.isFinite(num)) return null;
				tokens.push(-num);
				continue;
			}
			tokens.push(ch);
			i += 1;
			continue;
		}
		if (/[0-9.]/.test(ch)) {
			const start = i;
			i += 1;
			while (i < trimmed.length && /[0-9.]/.test(trimmed[i]!)) i += 1;
			const num = Number(trimmed.slice(start, i));
			if (!Number.isFinite(num)) return null;
			tokens.push(num);
			continue;
		}
		return null;
	}

	let pos = 0;
	const peek = () => tokens[pos];
	const consume = () => tokens[pos++];

	const parseExpr = (): number | null => {
		let left = parseTerm();
		if (left == null) return null;
		while (peek() === "+" || peek() === "-") {
			const op = consume() as string;
			const right = parseTerm();
			if (right == null) return null;
			left = op === "+" ? left + right : left - right;
		}
		return left;
	};

	const parseTerm = (): number | null => {
		let left = parseFactor();
		if (left == null) return null;
		while (peek() === "*" || peek() === "/") {
			const op = consume() as string;
			const right = parseFactor();
			if (right == null) return null;
			if (op === "/" && right === 0) return null;
			left = op === "*" ? left * right : left / right;
		}
		return left;
	};

	const parseFactor = (): number | null => {
		const token = peek();
		if (typeof token === "number") {
			consume();
			return token;
		}
		if (token === "(") {
			consume();
			const inner = parseExpr();
			if (inner == null || peek() !== ")") return null;
			consume();
			return inner;
		}
		return null;
	};

	const value = parseExpr();
	if (value == null || pos !== tokens.length) return null;
	if (!Number.isFinite(value) || value <= 0) return null;
	return value;
}

export function validateArchCountCoefficientFormula(
	formula: string,
	sampleN: number,
): string | null {
	const trimmed = formula.trim();
	if (!trimmed) return "Укажите формулу коэффициента";
	const value = evalArchCountCoefficientFormula(trimmed, sampleN);
	if (value == null) {
		return "Формула должна использовать только N, числа и операции + − × ÷ (скобки)";
	}
	return null;
}

export function validateArchCountCoeffSteps(
	kind: V2WorkFormulaArchCountKind,
	steps: readonly V2WorkArchCountCoeffStep[],
): string | null {
	if (steps.length === 0) {
		return "Укажите хотя бы одно условие «количество — коэффициент»";
	}
	const limits = V2_WORK_ARCH_COUNT_LIMITS[kind];
	const seen = new Set<string>();
	for (const step of steps) {
		if (!Number.isInteger(step.count)) {
			return "Количество должно быть целым числом";
		}
		if (step.count < limits.min || step.count > limits.max) {
			return `Количество для «${formatWorkArchCountKindLabel(kind)}» должно быть от ${limits.min} до ${limits.max}`;
		}
		const operator = resolveLaborArchCountOperator(step);
		const key = `${operator}|${step.count}`;
		if (seen.has(key)) {
			return `Повторяющееся условие ${operator} ${step.count}`;
		}
		seen.add(key);

		const formula = step.coefficientFormula?.trim() ?? "";
		if (formula) {
			const sampleA = validateArchCountCoefficientFormula(formula, step.count);
			if (sampleA) return sampleA;
			const sampleB = validateArchCountCoefficientFormula(
				formula,
				Math.max(step.count, 1),
			);
			if (sampleB) return sampleB;
			continue;
		}
		if (!Number.isFinite(step.coefficient) || step.coefficient <= 0) {
			return "Коэффициент должен быть положительным числом";
		}
	}
	return null;
}

/** Labor: first matching step (operator + threshold), const or formula. */
export function lookupArchCountCoefficient(
	steps: readonly V2WorkArchCountCoeffStep[],
	count: number,
): number | null {
	if (!Number.isFinite(count) || count <= 0) return null;
	for (const step of steps) {
		const operator = resolveLaborArchCountOperator(step);
		if (!compareArchCount(count, operator, step.count)) continue;
		const formula = step.coefficientFormula?.trim() ?? "";
		if (formula) {
			return evalArchCountCoefficientFormula(formula, count);
		}
		return Number.isFinite(step.coefficient) && step.coefficient > 0
			? step.coefficient
			: null;
	}
	return null;
}

const LABOR_ARCH_COUNT_OPERATOR_LABELS: Record<
	V2TypicalWorkTriggerArchCountOperator,
	string
> = {
	">=": "≥",
	"<=": "≤",
	"=": "=",
	">": ">",
	"<": "<",
};

export function formatLaborArchCountStepLabel(
	step: V2WorkArchCountCoeffStep,
): string {
	const operator = resolveLaborArchCountOperator(step);
	const threshold = step.count;
	const formula = step.coefficientFormula?.trim();
	const rhs = formula
		? formula.replace(/\s+/g, "")
		: String(step.coefficient).replace(".", ",");
	return `${LABOR_ARCH_COUNT_OPERATOR_LABELS[operator]}${threshold} → ${rhs}`;
}

/** Количество арх. компонентов в formData анкеты (не в строке каталога). */
export function resolveWorkArchComponentCount(
	formData: Record<string, unknown>,
	kind: V2WorkFormulaArchCountKind,
): number {
	const forced = readPerInstanceArchCountOverride(formData, kind);
	if (forced != null) return forced;

	const detailInfo = readRecord(formData.detailInfo);
	const generalInfo = readRecord(formData.generalInfo);
	const streamModelControl = readRecord(formData.streamModelControl);
	const streamDataSources = readRecord(formData.streamDataSources);
	const data = readRecord(formData.data);

	switch (kind) {
		case "model": {
			const modelsList =
				readArray(detailInfo?.modelsList).length > 0
					? readArray(detailInfo?.modelsList)
					: readArray(readRecord(streamModelControl?.models)?.modelsList).length > 0
						? readArray(readRecord(streamModelControl?.models)?.modelsList)
						: readArray(readRecord(data?.models)?.modelsList);
			if (modelsList.length > 0) {
				return Math.min(99, Math.max(1, modelsList.length));
			}
			const detailParams =
				readRecord(detailInfo?.model) ?? readRecord(detailInfo?.parameters);
			const modelsCount = Number(detailParams?.modelsCount);
			if (Number.isFinite(modelsCount) && modelsCount >= 1) {
				return Math.min(99, Math.floor(modelsCount));
			}
			return 0;
		}
		case "sourceSystem": {
			// detailInfo и streamDataSources часто дублируют один массив (миграция) —
			// считаем один канонический список, иначе N×2 (6+6→12→коэф 2.4 вместо 1.2).
			const detailRows = readArray(detailInfo?.sourceSystems);
			const streamRows = readArray(streamDataSources?.sourceSystems);
			const rows = detailRows.length > 0 ? detailRows : streamRows;
			let filled = 0;
			for (const row of rows) {
				const rec = readRecord(row);
				if (rec && isFilledTypicalWorkSourceRow(rec)) filled += 1;
			}
			return filled;
		}
		case "dataMart":
			return countFilledArchObjects([
				detailInfo?.dataMart,
				readRecord(streamModelControl?.dataObjects)?.dataMart,
				readRecord(data?.dataObjects)?.dataMart,
			]);
		case "dataProcess":
			return countFilledArchObjects([
				detailInfo?.dataProcess,
				streamModelControl?.dataProcessing,
				data?.dataProcessing,
			]);
		case "modelService":
			return countFilledArchObjects([
				generalInfo?.modelService,
				detailInfo?.modelService,
			]);
		default:
			return 0;
	}
}

export function resolveArchCountCoeffFromToken(
	formData: Record<string, unknown>,
	kind: V2WorkFormulaArchCountKind,
	steps: readonly V2WorkArchCountCoeffStep[],
): number {
	const count = resolveWorkArchComponentCount(formData, kind);
	return lookupArchCountCoefficient(steps, count) ?? 1;
}

const TRIGGER_ARCH_COUNT_OPERATOR_COEFFICIENT: Record<
	V2TypicalWorkTriggerArchCountOperator,
	number
> = {
	">=": 1,
	"=": -1,
	"<=": -2,
	">": -3,
	"<": -4,
};

const TRIGGER_ARCH_COUNT_COEFFICIENT_OPERATOR = Object.fromEntries(
	Object.entries(TRIGGER_ARCH_COUNT_OPERATOR_COEFFICIENT).map(
		([operator, coefficient]) => [String(coefficient), operator],
	),
) as Record<string, V2TypicalWorkTriggerArchCountOperator>;

export function encodeTriggerArchCountSteps(
	operator: V2TypicalWorkTriggerArchCountOperator,
	threshold: number,
): V2WorkArchCountCoeffStep[] {
	return [
		{
			count: threshold,
			coefficient: TRIGGER_ARCH_COUNT_OPERATOR_COEFFICIENT[operator],
		},
	];
}

export function decodeTriggerArchCountCondition(
	steps: readonly V2WorkArchCountCoeffStep[],
): {
	operator: V2TypicalWorkTriggerArchCountOperator;
	threshold: number;
} | null {
	if (!steps.length) return null;
	const step = steps[0];
	const encodedOperator =
		TRIGGER_ARCH_COUNT_COEFFICIENT_OPERATOR[String(step.coefficient)];
	if (encodedOperator) {
		return { operator: encodedOperator, threshold: step.count };
	}
	const threshold = Math.min(...steps.map((row) => row.count));
	return { operator: ">=", threshold };
}

export function isTriggerArchCountConfigured(
	triggerArchCount?: {
		kind?: V2WorkFormulaArchCountKind | null;
		steps?: readonly V2WorkArchCountCoeffStep[] | null;
	} | null,
): boolean {
	return Boolean(
		triggerArchCount?.kind &&
			decodeTriggerArchCountCondition(triggerArchCount.steps ?? []),
	);
}

export function formatTriggerArchCountConditionLabel(
	kind: V2WorkFormulaArchCountKind,
	steps: readonly V2WorkArchCountCoeffStep[],
): string {
	const condition = decodeTriggerArchCountCondition(steps);
	if (!condition) return formatWorkArchCountKindLabel(kind);
	return `${formatWorkArchCountKindLabel(kind)} ${condition.operator} ${condition.threshold}`;
}

export function validateTriggerArchCountCondition(
	kind: V2WorkFormulaArchCountKind,
	steps: readonly V2WorkArchCountCoeffStep[],
): string | null {
	const condition = decodeTriggerArchCountCondition(steps);
	if (!condition) return "Укажите порог количества компонентов";
	const limits = V2_WORK_ARCH_COUNT_LIMITS[kind];
	if (
		!Number.isFinite(condition.threshold) ||
		condition.threshold < limits.min ||
		condition.threshold > limits.max
	) {
		return `Количество должно быть в диапазоне ${limits.min}–${limits.max}`;
	}
	return null;
}

/** Триггер по количеству компонентов (оператор сравнения + порог). */
export function archCountTriggerMatches(
	formData: Record<string, unknown>,
	kind: V2WorkFormulaArchCountKind,
	steps: readonly V2WorkArchCountCoeffStep[],
): boolean {
	const condition = decodeTriggerArchCountCondition(steps);
	if (!condition) return false;
	const count = resolveWorkArchComponentCount(formData, kind);
	if (!Number.isFinite(count) || count < 0) return false;
	return compareArchCount(count, condition.operator, condition.threshold);
}
