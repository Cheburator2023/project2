import { normalizeParamLabel } from "./v2-csv-formula-import.util";
import { parseArchCountCoeffSteps } from "./v2-work-arch-count-coeff.util";
import type {
	V2TypicalWorkFormulaDto,
	V2TypicalWorkLaborArchCountDto,
	V2WorkArchCountCoeffStep,
	V2WorkFormulaArchCountKind,
	V2WorkFormulaToken,
} from "./v2-typical-work.types";
import { tokensToText } from "./v2-work-formula.util";

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

export function reconcileFormulaWithLaborArchCounts(
	formula: V2TypicalWorkFormulaDto,
	laborArchCounts: readonly V2TypicalWorkLaborArchCountDto[],
): V2TypicalWorkFormulaDto {
	const archKinds = new Set(laborArchCounts.map((row) => row.kind));
	const baseTokens: V2WorkFormulaToken[] = formula.tokens.filter(
		(token) =>
			token.kind !== "arch_count_coeff" ||
			!archKinds.has(token.archComponentKind),
	);

	const archTokens: V2WorkFormulaToken[] = laborArchCounts.map((row) => ({
		kind: "arch_count_coeff",
		archComponentKind: row.kind,
		steps: [...row.steps],
	}));

	if (archTokens.length === 0) {
		return {
			tokens: baseTokens,
			text: tokensToText(baseTokens),
		};
	}

	const normIndex = baseTokens.findIndex((token) => token.kind === "norm");
	const insertAt = normIndex >= 0 ? normIndex + 1 : 0;
	const nextTokens = [...baseTokens];
	if (
		insertAt < nextTokens.length &&
		nextTokens[insertAt]?.kind === "operator" &&
		nextTokens[insertAt]?.op === "*"
	) {
		nextTokens.splice(insertAt + 1, 0, ...archTokens);
	} else if (insertAt === 0 || nextTokens.length === 0) {
		nextTokens.push(...archTokens);
	} else {
		nextTokens.splice(insertAt, 0, { kind: "operator", op: "*" }, ...archTokens);
	}

	return {
		tokens: nextTokens,
		text: tokensToText(nextTokens),
	};
}

export function defaultLaborArchCounts(): V2TypicalWorkLaborArchCountDto[] {
	return [];
}
