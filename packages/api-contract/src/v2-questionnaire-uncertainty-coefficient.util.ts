import { collectAtypicalWorkArrayPaths } from "./v2-atypical-works-logic.util";

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return isPlainRecord(value) ? value : undefined;
}

function readByDotPath(data: Record<string, unknown>, dotPath: string): unknown {
	const segments = dotPath.split(".").filter(Boolean);
	let current: unknown = data;
	for (const segment of segments) {
		const obj = readRecord(current);
		if (!obj) return undefined;
		current = obj[segment];
	}
	return current;
}

function writeByDotPath(
	data: Record<string, unknown>,
	dotPath: string,
	value: unknown,
): Record<string, unknown> {
	const segments = dotPath.split(".").filter(Boolean);
	if (segments.length === 0) return data;

	const next = { ...data };
	let current: Record<string, unknown> = next;

	for (let i = 0; i < segments.length - 1; i++) {
		const key = segments[i]!;
		const existing = readRecord(current[key]);
		const child = existing ? { ...existing } : {};
		current[key] = child;
		current = child;
	}

	current[segments[segments.length - 1]!] = value;
	return next;
}

/** Приращение к коэффициенту неопределённости по уровню риска (v2 riskGroup). */
export function mapV2UncertaintyRiskLevelIncrement(level: string): number {
	switch (level) {
		case "Низкий":
			return 0.03;
		case "Средний":
			return 0.05;
		case "Высокий":
			return 0.07;
		case "Очень высокий":
			return 0.1;
		default:
			return 0;
	}
}

export type V2QuestionnaireUncertaintyCoefficient = {
	/** Есть заполненные риски или корректировка — неопределённость «рассчитана». */
	calculated: boolean;
	/** 1, если не рассчитана; иначе 1 + Σриски + корректировка%. */
	coefficient: number;
};

function parseUncertaintyAdjustmentPercent(value: unknown): number | undefined {
	if (value == null || value === "") return undefined;
	const parsed = Number(
		String(value).replace(",", ".").replace("%", "").trim(),
	);
	return Number.isFinite(parsed) ? parsed : undefined;
}

/** Коэффициент общей неопределённости для нетиповых работ (и legacy stage calc). */
export function resolveV2QuestionnaireUncertaintyCoefficient(
	formData: Record<string, unknown>,
): V2QuestionnaireUncertaintyCoefficient {
	const uncertainty = readRecord(formData.uncertaintyCalculation);
	const riskGroup = readRecord(uncertainty?.riskGroup);
	const adjustmentPercent = parseUncertaintyAdjustmentPercent(
		uncertainty?.uncertaintyAdjustment,
	);

	const hasRisks = riskGroup
		? Object.values(riskGroup).some(
				(value) => typeof value === "string" && value.trim().length > 0,
			)
		: false;

	if (!hasRisks && adjustmentPercent == null) {
		return { calculated: false, coefficient: 1 };
	}

	const riskSum = riskGroup
		? Object.values(riskGroup).reduce<number>((sum, value) => {
				if (typeof value !== "string") return sum;
				return sum + mapV2UncertaintyRiskLevelIncrement(value);
			}, 0)
		: 0;

	const coefficient =
		Math.round((1 + riskSum + (adjustmentPercent ?? 0) / 100) * 100) / 100;

	return { calculated: true, coefficient };
}

/** Код параметра «Общая неопределённость» в формулах типовых работ модельного стрима. */
export const V2_TYPICAL_WORK_UNCERTAINTY_PARAM_CODE = "overallUncertainty";

function normalizeTypicalWorkUncertaintyParamLabel(value: string): string {
	return value.trim().toLowerCase().replace(/ё/g, "е");
}

/** Параметр трудоёмкости «Общая неопределённость» — вычисляемый, не из справочника коэффициентов. */
export function isTypicalWorkComputedUncertaintyParam(
	paramCode: string,
	paramName?: string | null,
): boolean {
	if (paramCode === V2_TYPICAL_WORK_UNCERTAINTY_PARAM_CODE) return true;
	if (!paramName) return false;
	return (
		normalizeTypicalWorkUncertaintyParamLabel(paramName) ===
		"общая неопределенность"
	);
}

export type TypicalWorkLaborParamRef = {
	paramCode: string;
	paramName?: string | null;
};

/**
 * Подставляет коэффициент общей неопределённости из uncertaintyCalculation
 * (K = 1 + Σриски + поправка%/100; если не рассчитана — 1).
 * Перекрывает фиксированные строки коэффициентов в конфигураторе.
 */
export function applyComputedOverallUncertaintyToTypicalWorkParamCoefficients(
	formData: Record<string, unknown>,
	paramCoefficients: Record<string, number>,
	options?: {
		laborParamRefs?: readonly TypicalWorkLaborParamRef[];
		formulaParamCodes?: readonly string[];
	},
): void {
	const refs = options?.laborParamRefs ?? [];
	const formulaCodes = options?.formulaParamCodes ?? [];
	const usesUncertainty =
		refs.some((ref) =>
			isTypicalWorkComputedUncertaintyParam(ref.paramCode, ref.paramName),
		) ||
		formulaCodes.some((code) =>
			isTypicalWorkComputedUncertaintyParam(code, null),
		);
	if (!usesUncertainty) return;

	const { coefficient } = resolveV2QuestionnaireUncertaintyCoefficient(formData);
	paramCoefficients[V2_TYPICAL_WORK_UNCERTAINTY_PARAM_CODE] = coefficient;
	for (const ref of refs) {
		if (isTypicalWorkComputedUncertaintyParam(ref.paramCode, ref.paramName)) {
			paramCoefficients[ref.paramCode] = coefficient;
		}
	}
}

export type SyncAtypicalWorkCoefficientsResult = {
	formData: Record<string, unknown>;
	updatedPaths: string[];
	changed: boolean;
};

/** Подставляет коэффициент неопределённости во все строки arch-блоков atypicalWork. */
export function syncAtypicalWorkCoefficientsInFormData(
	formData: Record<string, unknown>,
	uiSchema: unknown,
	coefficient: number,
): SyncAtypicalWorkCoefficientsResult {
	const paths = collectAtypicalWorkArrayPaths(uiSchema);
	let next = formData;
	const updatedPaths: string[] = [];
	let changed = false;

	for (const path of paths) {
		const arr = readByDotPath(next, path);
		if (!Array.isArray(arr) || arr.length === 0) continue;

		let pathChanged = false;
		const nextArr = arr.map((row) => {
			if (!isPlainRecord(row)) return row;
			const prevCoeff = Number(row.coefficient);
			if (Number.isFinite(prevCoeff) && prevCoeff === coefficient) return row;
			pathChanged = true;
			return { ...row, coefficient };
		});

		if (pathChanged) {
			next = writeByDotPath(next, path, nextArr);
			updatedPaths.push(path);
			changed = true;
		}
	}

	return { formData: next, updatedPaths, changed };
}
