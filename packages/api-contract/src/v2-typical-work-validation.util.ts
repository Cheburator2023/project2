import type {
	V2TypicalWorkNormInputDto,
	V2TypicalWorkRoundingDto,
	V2WorkFormulaToken,
} from "./v2-typical-work.types";

export type ValidationIssue = { path: string; message: string };

function parseIsoDay(value: string): string | null {
	const day = value.slice(0, 10);
	return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

export function validateNormInputs(
	norms: V2TypicalWorkNormInputDto[],
	streamExecutor: string,
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

import { validateWorkFormulaTokens } from "./v2-work-formula.util";

export function validateFormulaAgainstParams(
	tokens: V2WorkFormulaToken[],
	allowedParamCodes: Set<string>,
): ValidationIssue[] {
	const err = validateWorkFormulaTokens(tokens, allowedParamCodes);
	return err ? [{ path: "formula", message: err }] : [];
}
