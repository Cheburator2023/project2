import type {
	PatchV2TypicalWorkRequestDto,
	V2TypicalWorkNormInputDto,
	V2TypicalWorkRoundingDto,
	V2WorkFormulaToken,
	V2WorkTriggerStatus,
} from "./v2-typical-work.types";
import { validateWorkFormulaTokens } from "./v2-work-formula.util";

export type ValidationIssue = { path: string; message: string };

function parseIsoDay(value: string): string | null {
	const day = value.slice(0, 10);
	return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

/** Сколько норм действуют на указанную дату (после базовой валидации периодов). */
export function countActiveNormsOnDate(
	norms: V2TypicalWorkNormInputDto[],
	atDate: string,
): number {
	const day = atDate.slice(0, 10);
	let count = 0;
	for (const norm of norms) {
		const from = parseIsoDay(norm.validFrom);
		if (!from) continue;
		const to = norm.validTo ? parseIsoDay(norm.validTo) : null;
		if (day < from) continue;
		if (to && day > to) continue;
		count++;
	}
	return count;
}

export type ValidateNormInputsOptions = {
	/** F-03: на дату расчёта должна быть ровно одна действующая норма. */
	coverageDate?: string | null;
};

export function validateNormInputs(
	norms: V2TypicalWorkNormInputDto[],
	streamExecutor: string,
	options?: ValidateNormInputsOptions,
): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	norms.forEach((norm, index) => {
		const base = `norms[${index}]`;
		if (!Number.isFinite(norm.normValue) || norm.normValue < 0) {
			issues.push({
				path: `${base}.normValue`,
				message: "Норма должна быть неотрицательным числом",
			});
		}
		const from = parseIsoDay(norm.validFrom);
		if (!from) {
			issues.push({
				path: `${base}.validFrom`,
				message: "Укажите дату начала действия",
			});
		}
		const to = norm.validTo ? parseIsoDay(norm.validTo) : null;
		if (norm.validTo && !to) {
			issues.push({
				path: `${base}.validTo`,
				message: "Некорректная дата окончания",
			});
		}
		if (from && to && to <= from) {
			issues.push({
				path: `${base}.validTo`,
				message: "Дата окончания должна быть позже даты начала",
			});
		}
	});

	const periods = norms
		.map((norm, index) => ({
			index,
			from: parseIsoDay(norm.validFrom),
			to: norm.validTo ? parseIsoDay(norm.validTo) : null,
		}))
		.filter((p) => p.from);

	for (let i = 0; i < periods.length; i++) {
		for (let j = i + 1; j < periods.length; j++) {
			const a = periods[i];
			const b = periods[j];
			if (!a?.from || !b?.from) continue;
			const aEnd = a.to ?? "9999-12-31";
			const bEnd = b.to ?? "9999-12-31";
			if (a.from <= bEnd && b.from <= aEnd) {
				issues.push({
					path: `norms[${a.index}]`,
					message: `Период действия пересекается с уже заданным (${streamExecutor})`,
				});
				issues.push({
					path: `norms[${b.index}]`,
					message: `Период действия пересекается с уже заданным (${streamExecutor})`,
				});
			}
		}
	}

	const coverageDate = options?.coverageDate;
	if (coverageDate && norms.length > 0) {
		const activeCount = countActiveNormsOnDate(norms, coverageDate);
		if (activeCount === 0) {
			issues.push({
				path: "norms",
				message: `На дату ${coverageDate.slice(0, 10)} нет действующей нормы для стрима «${streamExecutor}»`,
			});
		} else if (activeCount > 1) {
			issues.push({
				path: "norms",
				message: `На дату ${coverageDate.slice(0, 10)} действует более одной нормы для стрима «${streamExecutor}»`,
			});
		}
	}

	return issues;
}

export function validateRoundingInput(
	rounding: V2TypicalWorkRoundingDto,
): ValidationIssue[] {
	if (rounding.mode === "NONE") return [];
	const step = rounding.step;
	if (step == null || !Number.isFinite(step) || step < 0.0001 || step > 1000) {
		return [
			{
				path: "rounding.step",
				message:
					"Шаг округления должен быть положительным числом в диапазоне [0.0001; 1000]",
			},
		];
	}
	return [];
}

export function validateCoefficientValue(
	value: number,
	path: string,
): ValidationIssue[] {
	if (!Number.isFinite(value) || value < 0) {
		return [{ path, message: "Коэффициент должен быть неотрицательным числом" }];
	}
	return [];
}

export function validateWorkName(name: string): ValidationIssue[] {
	const trimmed = name.trim();
	if (!trimmed || trimmed.length > 255) {
		return [
			{
				path: "name",
				message:
					"Название работы обязательно и должно содержать не более 255 символов",
			},
		];
	}
	return [];
}

export function collectAllowedParamCodes(
	laborInputs: Array<{ paramCode: string }>,
): Set<string> {
	return new Set(laborInputs.map((l) => l.paramCode));
}

export function validateFormulaAgainstParams(
	tokens: V2WorkFormulaToken[],
	allowedParamCodes: Set<string>,
): ValidationIssue[] {
	const err = validateWorkFormulaTokens(tokens, {
		allowedParamCodes,
		allowInvalidParamRefs: true,
	});
	return err ? [{ path: "formula", message: err }] : [];
}

export type CollectPatchValidationOptions = {
	coverageDate?: string;
};

/** Клиентская валидация PATCH типовой работы перед автосохранением. */
export function collectTypicalWorkPatchValidationErrors(
	dto: PatchV2TypicalWorkRequestDto,
	options?: CollectPatchValidationOptions,
): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const stream = dto.streamExecutor?.trim() ?? "";
	const coverageDate =
		options?.coverageDate ?? new Date().toISOString().slice(0, 10);

	if (dto.name !== undefined) {
		issues.push(...validateWorkName(dto.name));
	}

	if (dto.norms && stream) {
		issues.push(
			...validateNormInputs(dto.norms, stream, { coverageDate }),
		);
	}

	if (dto.laborCoefficients) {
		dto.laborCoefficients.forEach((row, index) => {
			issues.push(
				...validateCoefficientValue(
					row.coefficient,
					`laborCoefficients[${index}].coefficient`,
				),
			);
		});
		const seen = new Set<string>();
		for (const [index, row] of dto.laborCoefficients.entries()) {
			const key = `${row.paramCode}|${row.valueCode ?? ""}`;
			if (seen.has(key)) {
				issues.push({
					path: `laborCoefficients[${index}]`,
					message: "Дублируется комбинация (параметр, значение) для стрима",
				});
			}
			seen.add(key);
		}
	}

	if (dto.rounding) {
		issues.push(...validateRoundingInput(dto.rounding));
	}

	if (dto.formula && dto.laborCoefficients) {
		issues.push(
			...validateFormulaAgainstParams(
				dto.formula.tokens,
				collectAllowedParamCodes(dto.laborCoefficients),
			),
		);
	}

	return issues;
}

export type WorkTriggerStatusRuleInput = {
	paramCode: string;
	valueCode: string | null;
	valueLabel: string | null;
};

export type WorkTriggerStatusCatalogParam = {
	code: string;
	values: Array<{ code: string; label: string }>;
};

/** F-03: статус триггеров с учётом актуальности параметров каталога */
export function computeWorkTriggerStatus(
	rules: WorkTriggerStatusRuleInput[],
	catalog?: WorkTriggerStatusCatalogParam[],
): V2WorkTriggerStatus {
	if (rules.length === 0) return "no_triggers";
	if (rules.some((rule) => !rule.valueLabel || !rule.valueCode)) return "invalid";
	if (!catalog?.length) return "appears";

	const catalogByCode = new Map(catalog.map((param) => [param.code, param]));
	for (const rule of rules) {
		const param = catalogByCode.get(rule.paramCode);
		if (!param) return "invalid";
		const valueExists = param.values.some(
			(value) =>
				value.code === rule.valueCode || value.label === rule.valueLabel,
		);
		if (!valueExists) return "invalid";
	}
	return "appears";
}

export function isWorkTriggerGroupInvalid(
	paramCode: string,
	rules: WorkTriggerStatusRuleInput[],
	catalog: WorkTriggerStatusCatalogParam[],
): boolean {
	const param = catalog.find((item) => item.code === paramCode);
	if (!param) return true;
	return rules.some((rule) => {
		if (!rule.valueCode || !rule.valueLabel) return true;
		return !param.values.some(
			(value) =>
				value.code === rule.valueCode || value.label === rule.valueLabel,
		);
	});
}
