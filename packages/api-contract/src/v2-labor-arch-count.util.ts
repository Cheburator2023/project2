import { normalizeParamLabel } from "./v2-csv-formula-import.util";
import { parseArchCountCoeffSteps } from "./v2-work-arch-count-coeff.util";
import type {
	V2TypicalWorkFormulaDto,
	V2TypicalWorkLaborArchCountDto,
	V2WorkArchCountCoeffStep,
	V2WorkFormulaArchCountKind,
	V2WorkFormulaToken,
} from "./v2-typical-work.types";
import {
	repairWorkFormulaTokenOperators,
	tokensToText,
} from "./v2-work-formula.util";

function buildLinearArchCountSteps(
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

const MODEL_STREAM_SOURCE_COUNT_STEPS: Array<{ count: number; coefficient: number }> =
	[
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

function formatArchCountFormulaSteps(
	steps: ReadonlyArray<{ count: number; coefficient: number }>,
): string {
	return steps
		.map(
			(step) =>
				`${step.count}=${String(step.coefficient).replace(".", ",")}`,
		)
		.join("; ");
}

const ARCH_COUNT_LABOR_PARAM_LABELS: Record<
	string,
	{ kind: V2WorkFormulaArchCountKind; defaultSteps: string }
> = {
	[normalizeParamLabel("Кол-во моделей")]: {
		kind: "model",
		defaultSteps: formatArchCountFormulaSteps(buildLinearArchCountSteps(15)),
	},
	[normalizeParamLabel("Количество моделей")]: {
		kind: "model",
		defaultSteps: formatArchCountFormulaSteps(buildLinearArchCountSteps(15)),
	},
	[normalizeParamLabel("Кол-во источников для проработки")]: {
		kind: "sourceSystem",
		defaultSteps: formatArchCountFormulaSteps(MODEL_STREAM_SOURCE_COUNT_STEPS),
	},
	[normalizeParamLabel("Кол-во источников в витрине")]: {
		kind: "sourceSystem",
		defaultSteps: formatArchCountFormulaSteps(MODEL_STREAM_SOURCE_COUNT_STEPS),
	},
	[normalizeParamLabel("Кол-во арх. компонентов Система-источник")]: {
		kind: "sourceSystem",
		defaultSteps: formatArchCountFormulaSteps(MODEL_STREAM_SOURCE_COUNT_STEPS),
	},
	[normalizeParamLabel('Кол-во арх. компонентов "Система-Источник"')]: {
		kind: "sourceSystem",
		defaultSteps: formatArchCountFormulaSteps(MODEL_STREAM_SOURCE_COUNT_STEPS),
	},
	[normalizeParamLabel("Арх. компонент Система источник количество")]: {
		kind: "sourceSystem",
		defaultSteps: formatArchCountFormulaSteps(MODEL_STREAM_SOURCE_COUNT_STEPS),
	},
};

export function isArchCountLaborParamName(paramName: string): boolean {
	return Boolean(
		ARCH_COUNT_LABOR_PARAM_LABELS[normalizeParamLabel(paramName)],
	);
}

export function laborCoefficientValuesToArchCountSteps(
	values: ReadonlyArray<{ label: string; coefficient: number }>,
): V2WorkArchCountCoeffStep[] {
	return values
		.map((row) => ({
			count: Number(String(row.label).trim()),
			coefficient: row.coefficient,
		}))
		.filter(
			(step) =>
				Number.isInteger(step.count) &&
				step.count >= 1 &&
				Number.isFinite(step.coefficient) &&
				step.coefficient > 0,
		)
		.sort((a, b) => a.count - b.count);
}

export function resolveArchCountLaborFromCatalog(
	paramName: string,
	values?: ReadonlyArray<{ label: string; coefficient: number }>,
): V2TypicalWorkLaborArchCountDto | null {
	const config = ARCH_COUNT_LABOR_PARAM_LABELS[normalizeParamLabel(paramName)];
	if (!config) return null;
	const fromValues = values?.length
		? laborCoefficientValuesToArchCountSteps(values)
		: [];
	const fromDefault = parseArchCountCoeffSteps(config.defaultSteps) ?? [];
	return {
		kind: config.kind,
		steps: fromValues.length > 0 ? fromValues : fromDefault,
		paramName: paramName.trim(),
	};
}

export function splitCatalogLaborArchCounts<
	TLaborCoeff extends { paramName: string; values: Array<{ label: string; coefficient: number }> },
>(input: {
	laborParams: string[];
	laborCoefficients?: TLaborCoeff[];
}): {
	laborParams: string[];
	laborCoefficients: TLaborCoeff[];
	laborArchCounts: V2TypicalWorkLaborArchCountDto[];
} {
	const laborArchCounts: V2TypicalWorkLaborArchCountDto[] = [];
	const archParamNames = new Set<string>();

	for (const paramName of input.laborParams) {
		const group = input.laborCoefficients?.find(
			(row) => row.paramName.trim() === paramName.trim(),
		);
		const arch = resolveArchCountLaborFromCatalog(paramName, group?.values);
		if (arch) {
			laborArchCounts.push(arch);
			archParamNames.add(paramName.trim());
		}
	}

	return {
		laborParams: input.laborParams.filter(
			(param) => !archParamNames.has(param.trim()),
		),
		laborCoefficients: (input.laborCoefficients ?? []).filter(
			(group) => !archParamNames.has(group.paramName.trim()),
		),
		laborArchCounts,
	};
}

export function extractLaborArchCountsFromFormula(
	formula: V2TypicalWorkFormulaDto,
): V2TypicalWorkLaborArchCountDto[] {
	const result: V2TypicalWorkLaborArchCountDto[] = [];
	const seen = new Set<V2WorkFormulaArchCountKind>();
	for (const token of formula.tokens) {
		if (token.kind !== "arch_count_coeff") continue;
		if (seen.has(token.archComponentKind)) continue;
		seen.add(token.archComponentKind);
		result.push({
			kind: token.archComponentKind,
			steps: [...token.steps],
			paramName: null,
		});
	}
	return result;
}

/**
 * Синхронизирует `arch_count_coeff` в формуле с блоком laborArchCounts.
 *
 * Важно: не пересобирает формулу с нуля — иначе ломаются операторы
 * (в т.ч. деление на этапах 02/04) и порядок операндов.
 * Существующие архкоэф обновляются на месте; недостающие вставляются как `× арх…` сразу после N.
 * В конце — repair (два операнда подряд / `× ÷` от старого reconcile).
 */
export function reconcileFormulaWithLaborArchCounts(
	formula: V2TypicalWorkFormulaDto,
	laborArchCounts: readonly V2TypicalWorkLaborArchCountDto[],
): V2TypicalWorkFormulaDto {
	const stepsByKind = new Map(
		laborArchCounts.map((row) => [row.kind, row.steps] as const),
	);
	const presentKinds = new Set<V2WorkFormulaArchCountKind>();

	const tokens: V2WorkFormulaToken[] = formula.tokens.map((token) => {
		if (token.kind !== "arch_count_coeff") return token;
		const steps = stepsByKind.get(token.archComponentKind);
		if (!steps) return token;
		presentKinds.add(token.archComponentKind);
		return {
			...token,
			steps: steps.map((step) => ({ ...step })),
		};
	});

	const missing = laborArchCounts.filter((row) => !presentKinds.has(row.kind));
	let nextTokens = tokens;

	if (missing.length > 0) {
		const insertChain: V2WorkFormulaToken[] = [];
		for (const row of missing) {
			insertChain.push(
				{ kind: "operator", op: "*" },
				{
					kind: "arch_count_coeff",
					archComponentKind: row.kind,
					steps: row.steps.map((step) => ({ ...step })),
				},
			);
		}

		nextTokens = [...tokens];
		const normIndex = nextTokens.findIndex((token) => token.kind === "norm");
		if (normIndex >= 0) {
			nextTokens.splice(normIndex + 1, 0, ...insertChain);
		} else if (nextTokens.length === 0) {
			for (const [index, row] of missing.entries()) {
				if (index > 0) nextTokens.push({ kind: "operator", op: "*" });
				nextTokens.push({
					kind: "arch_count_coeff",
					archComponentKind: row.kind,
					steps: row.steps.map((step) => ({ ...step })),
				});
			}
		} else {
			nextTokens.splice(0, 0, ...insertChain);
		}
	}

	const repaired = repairWorkFormulaTokenOperators(nextTokens);
	return {
		tokens: repaired,
		text: tokensToText(repaired),
	};
}

export function defaultLaborArchCounts(): V2TypicalWorkLaborArchCountDto[] {
	return [];
}
