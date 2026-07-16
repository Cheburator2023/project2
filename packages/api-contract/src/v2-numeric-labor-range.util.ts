export type NumericLaborRangePreset = {
	valueCode: string;
	valueLabel: string;
	coefficient: number;
};

export const METRICS_COUNT_LABOR_RANGES: NumericLaborRangePreset[] = [
	{ valueCode: "do_20", valueLabel: "до 20 метрик", coefficient: 1 },
	{ valueCode: "20_50", valueLabel: "20–50 метрик", coefficient: 1.2 },
	{ valueCode: "over_50", valueLabel: ">50 метрик", coefficient: 1.4 },
];

const INTEGER_RANGE_DEFAULT: NumericLaborRangePreset[] = [
	{ valueCode: "to_99", valueLabel: "до 99", coefficient: 1 },
];

function normalizeParamTitle(title: string): string {
	return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Коэффициенты доп. витрин по legacy-формуле: 1 → 1, n>1 → 1+(n−1)×0.75. */
export function buildProductionAdditionalVitrinsLaborRows(): NumericLaborRangePreset[] {
	const rows: NumericLaborRangePreset[] = [
		{ valueCode: "none", valueLabel: "Не требуется", coefficient: 0 },
	];
	for (let n = 1; n <= 99; n += 1) {
		const coefficient = n === 1 ? 1 : 1 + (n - 1) * 0.75;
		rows.push({
			valueCode: String(n),
			valueLabel: String(n),
			coefficient,
		});
	}
	return rows;
}

/** Стартовые строки «По значениям» для известных числовых параметров. */
export function resolveNumericLaborPresetRows(
	paramName: string | null | undefined,
): NumericLaborRangePreset[] | null {
	const title = normalizeParamTitle(paramName ?? "");
	if (!title) return null;
	if (title.includes("количество метрик")) {
		return METRICS_COUNT_LABOR_RANGES;
	}
	if (
		title.includes("необходимость продуктивизации") &&
		title.includes("витрин")
	) {
		return buildProductionAdditionalVitrinsLaborRows();
	}
	if (title.includes("оцениваемых инициатив")) {
		return INTEGER_RANGE_DEFAULT;
	}
	if (title.includes("контролей качества")) {
		return INTEGER_RANGE_DEFAULT;
	}
	return null;
}

export function isNumericLaborByValueParam(input: {
	numeric?: boolean;
	values?: unknown[];
	name?: string | null;
}): boolean {
	if (resolveNumericLaborPresetRows(input.name ?? null)) return true;
	return Boolean(input.numeric) && (input.values?.length ?? 0) === 0;
}

export function buildNumericLaborCoefficientRows(
	preset: NumericLaborRangePreset[],
	ctx: {
		streamExecutor: string;
		paramCode: string;
		paramName: string | null;
		idPrefix?: string;
	},
): Array<{
	id: string;
	streamExecutor: string;
	paramCode: string;
	paramName: string | null;
	valueCode: string;
	valueLabel: string;
	coefficient: number;
}> {
	const prefix = ctx.idPrefix ?? `new-${Date.now()}`;
	return preset.map((row, index) => ({
		id: `${prefix}-${index}`,
		streamExecutor: ctx.streamExecutor,
		paramCode: ctx.paramCode,
		paramName: ctx.paramName,
		valueCode: row.valueCode,
		valueLabel: row.valueLabel,
		coefficient: row.coefficient,
	}));
}
