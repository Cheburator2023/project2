import type {
	PatchV2TypicalWorkRequestDto,
	V2TypicalWorkNormInputDto,
	V2TypicalWorkRoundingDto,
	V2WorkFormulaToken,
	V2WorkTriggerStatus,
} from "./v2-typical-work.types";
import { defaultWorkRounding } from "./v2-typical-work.types";
import {
	evaluateWorkFormula,
	type WorkFormulaLaborParamRef,
	roundWorkEffortValue,
	validateWorkFormulaTokens,
} from "./v2-work-formula.util";
import {
	evaluateTermsFormula,
	termsToTokenFormula,
	validateTermsFormula,
} from "./v2-work-terms-formula.util";
import {
	catalogValueMatchesTriggerRule,
	isControlTypeTriggerParam,
	isPresenceOnlyTriggerRule,
	isSourceTypeTriggerParam,
	resolveTriggerStatusCatalogParam,
	triggerRuleCatalogGroupKey,
	typicalWorkRulesMatchSource,
} from "./v2-works-catalog-match.util";

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

export function laborParamRefsFromPatchGroups(
	laborParams: Array<{ paramCode: string; paramName?: string | null }>,
): WorkFormulaLaborParamRef[] {
	return laborParams.map((group) => ({
		paramCode: group.paramCode,
		paramName: group.paramName ?? null,
	}));
}

export function validateFormulaAgainstLaborParams(
	tokens: V2WorkFormulaToken[],
	laborParams: WorkFormulaLaborParamRef[],
): ValidationIssue[] {
	const err = validateWorkFormulaTokens(tokens, {
		laborParams,
		allowInvalidParamRefs: true,
	});
	return err ? [{ path: "formula", message: err }] : [];
}

function resolveActiveNormValueOnDate(
	norms: V2TypicalWorkNormInputDto[],
	coverageDate: string,
): number | null {
	const day = coverageDate.slice(0, 10);
	for (const norm of norms) {
		const from = parseIsoDay(norm.validFrom);
		if (!from) continue;
		const to = norm.validTo ? parseIsoDay(norm.validTo) : null;
		if (day < from) continue;
		if (to && day > to) continue;
		if (!Number.isFinite(norm.normValue) || norm.normValue < 0) continue;
		return norm.normValue;
	}
	return null;
}

function maxLaborParamCoefficients(
	laborParams: NonNullable<PatchV2TypicalWorkRequestDto["laborParams"]>,
): Record<string, number> {
	const map: Record<string, number> = {};
	for (const group of laborParams) {
		let max = 0;
		if (group.kind === "any_of" && group.anyOf) {
			max = Math.max(group.anyOf.coeffOn, group.anyOf.coeffOff);
		}
		for (const row of group.coefficients ?? []) {
			if (Number.isFinite(row.coefficient)) {
				max = Math.max(max, row.coefficient);
			}
		}
		map[group.paramCode] = max;
	}
	return map;
}

const FORMULA_NEGATIVE_EFFORT_MESSAGE =
	"Итог формулы не может быть отрицательным: трудозатраты указываются в человеко-днях (≥ 0)";

/** Проверяет, что при действующей норме формула не даёт отрицательный итог (после округления). */
export function validateFormulaNonNegativeEffort(params: {
	formula?: PatchV2TypicalWorkRequestDto["formula"];
	formulaTerms?: PatchV2TypicalWorkRequestDto["formulaTerms"];
	rounding?: V2TypicalWorkRoundingDto;
	norms: V2TypicalWorkNormInputDto[];
	laborParams?: PatchV2TypicalWorkRequestDto["laborParams"];
	coverageDate: string;
}): ValidationIssue[] {
	const normValue = resolveActiveNormValueOnDate(
		params.norms,
		params.coverageDate,
	);
	if (normValue == null) return [];

	const rounding = params.rounding ?? defaultWorkRounding();
	const paramCoefficients = params.laborParams?.length
		? maxLaborParamCoefficients(params.laborParams)
		: {};
	const ctx = { norm: normValue, paramCoefficients, source: {} as Record<string, unknown> };

	if (params.formulaTerms?.terms.some((term) => term.kind === "transitive")) {
		return [];
	}

	let rounded: number | null = null;

	if (params.formulaTerms) {
		const termsError = validateTermsFormula(params.formulaTerms.terms);
		if (termsError) return [];
		const termsValue = evaluateTermsFormula({
			terms: params.formulaTerms.terms,
			baseNorm: normValue,
			resolveFactorCoeff: (paramCode) => paramCoefficients[paramCode] ?? 0,
		});
		if (termsValue != null) {
			rounded = roundWorkEffortValue(termsValue, rounding);
		}
	}

	const tokenFormula =
		params.formula?.tokens?.length
			? params.formula
			: params.formulaTerms
				? termsToTokenFormula(params.formulaTerms)
				: null;

	if (tokenFormula?.tokens.length) {
		const evaluated = evaluateWorkFormula(tokenFormula, ctx);
		if (evaluated.value != null) {
			rounded = roundWorkEffortValue(evaluated.value, rounding);
		}
	}

	if (rounded != null && rounded < 0) {
		return [
			{
				path: params.formulaTerms ? "formulaTerms" : "formula",
				message: FORMULA_NEGATIVE_EFFORT_MESSAGE,
			},
		];
	}

	return [];
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

	if (dto.laborParams) {
		for (const [index, group] of dto.laborParams.entries()) {
			if (group.kind === "any_of" && group.anyOf) {
				issues.push(
					...validateCoefficientValue(
						group.anyOf.coeffOn,
						`laborParams[${index}].anyOf.coeffOn`,
					),
				);
				issues.push(
					...validateCoefficientValue(
						group.anyOf.coeffOff,
						`laborParams[${index}].anyOf.coeffOff`,
					),
				);
			}
			for (const [rowIndex, row] of (group.coefficients ?? []).entries()) {
				issues.push(
					...validateCoefficientValue(
						row.coefficient,
						`laborParams[${index}].coefficients[${rowIndex}].coefficient`,
					),
				);
			}
		}
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

	if (dto.formulaTerms) {
		const termsError = validateTermsFormula(dto.formulaTerms.terms);
		if (termsError) {
			issues.push({ path: "formulaTerms", message: termsError });
		}
	}

	if (dto.formulaTerms && dto.laborParams) {
		const tokens =
			dto.formula?.tokens ?? termsToTokenFormula(dto.formulaTerms).tokens;
		issues.push(
			...validateFormulaAgainstLaborParams(
				tokens,
				laborParamRefsFromPatchGroups(dto.laborParams),
			),
		);
	} else if (dto.formula && dto.laborParams) {
		issues.push(
			...validateFormulaAgainstLaborParams(
				dto.formula.tokens,
				laborParamRefsFromPatchGroups(dto.laborParams),
			),
		);
	}

	if (dto.formula && dto.laborCoefficients) {
		issues.push(
			...validateFormulaAgainstParams(
				dto.formula.tokens,
				collectAllowedParamCodes(dto.laborCoefficients),
			),
		);
	}

	if ((dto.formula || dto.formulaTerms) && dto.norms?.length) {
		issues.push(
			...validateFormulaNonNegativeEffort({
				formula: dto.formula,
				formulaTerms: dto.formulaTerms,
				rounding: dto.rounding,
				norms: dto.norms,
				laborParams: dto.laborParams,
				coverageDate,
			}),
		);
	}

	return issues;
}

export type WorkTriggerStatusRuleInput = {
	paramCode: string;
	paramName?: string | null;
	operator?: string;
	valueCode: string | null;
	valueLabel: string | null;
	values?: Array<{ code: string; label: string | null }>;
};

export type WorkTriggerStatusCatalogParam = {
	code: string;
	values: Array<{
		code: string;
		label: string;
		validFrom?: string | null;
		validTo?: string | null;
	}>;
};

export function isTypicalWorkParameterValueActiveOnDate(
	value: { validFrom?: string | null; validTo?: string | null },
	atDate: string,
): boolean {
	const day = atDate.slice(0, 10);
	const from = value.validFrom ? parseIsoDay(value.validFrom) : null;
	const to = value.validTo ? parseIsoDay(value.validTo) : null;
	if (from && day < from) return false;
	if (to && day > to) return false;
	return true;
}

export function filterTypicalWorkParameterValuesActiveOnDate<
	T extends { validFrom?: string | null; validTo?: string | null },
>(values: T[], atDate: string): T[] {
	return values.filter((value) =>
		isTypicalWorkParameterValueActiveOnDate(value, atDate),
	);
}

function isRuleInputInvalid(
	rule: WorkTriggerStatusRuleInput,
	catalog: WorkTriggerStatusCatalogParam[],
	atDate?: string,
): boolean {
	const operator = rule.operator ?? "=";
	if (isSchemaFieldLaborParamCode(rule.paramCode)) {
		return false;
	}
	if (operator === "in" || operator === "not_in") {
		const values = rule.values?.length
			? rule.values
			: rule.valueCode
				? [{ code: rule.valueCode, label: rule.valueLabel }]
				: [];
		if (values.length === 0) return true;
		const param = resolveTriggerStatusCatalogParam(rule, catalog);
		if (!param) return true;
		return values.some((value) => {
			if (!value.code || !value.label) return true;
			return !param.values.some(
				(catalogValue) =>
					catalogValueMatchesTriggerRule(catalogValue, {
						...rule,
						valueCode: value.code,
						valueLabel: value.label,
					}) &&
					(!atDate ||
						isTypicalWorkParameterValueActiveOnDate(catalogValue, atDate)),
			);
		});
	}

	if (isPresenceOnlyTriggerRule(rule)) {
		if (isSourceTypeTriggerParam(rule.paramCode, rule.paramName)) return false;
		if (isControlTypeTriggerParam(rule.paramCode, rule.paramName)) return false;
		return resolveTriggerStatusCatalogParam(rule, catalog) === undefined;
	}

	const param = resolveTriggerStatusCatalogParam(rule, catalog);
	if (!param) return true;

	const threshold = rule.valueLabel ?? rule.valueCode;
	if (
		param.values.length === 0 &&
		threshold != null &&
		String(threshold).trim() !== "" &&
		(operator === "=" ||
			operator === "!=" ||
			operator === ">=" ||
			operator === "<=" ||
			operator === ">" ||
			operator === "<")
	) {
		if (operator === "=" || operator === "!=") return false;
		return Number.isNaN(Number(threshold));
	}

	return !param.values.some(
		(value) =>
			catalogValueMatchesTriggerRule(value, rule) &&
			(!atDate || isTypicalWorkParameterValueActiveOnDate(value, atDate)),
	);
}

/** F-03/v4: статус триггеров с учётом каталога и (опционально) черновика ответов. */
export function computeWorkTriggerStatus(
	rules: WorkTriggerStatusRuleInput[],
	catalog?: WorkTriggerStatusCatalogParam[],
	atDate?: string,
	draftSource?: Record<string, unknown>,
): V2WorkTriggerStatus {
	if (rules.length === 0) return "no_triggers";

	if (catalog?.length) {
		const grouped = new Map<string, WorkTriggerStatusRuleInput[]>();
		for (const rule of rules) {
			const key = triggerRuleCatalogGroupKey(rule, catalog);
			const list = grouped.get(key) ?? [];
			list.push(rule);
			grouped.set(key, list);
		}
		for (const [groupKey, groupRules] of grouped) {
			if (isWorkTriggerGroupInvalid(groupKey, groupRules, catalog, atDate)) {
				return "invalid";
			}
		}
	} else if (rules.some((rule) => !rule.paramCode?.trim())) {
		return "invalid";
	}

	if (draftSource) {
		const matchRules = rules.map((rule) => ({
			paramCode: rule.paramCode,
			paramName: rule.paramName ?? null,
			operator: rule.operator ?? "=",
			valueCode: rule.valueCode,
			valueLabel: rule.valueLabel,
			values: rule.values,
		}));
		return typicalWorkRulesMatchSource(matchRules, draftSource)
			? "appears"
			: "hidden";
	}

	return "appears";
}

export function isWorkTriggerGroupInvalid(
	paramCode: string,
	rules: WorkTriggerStatusRuleInput[],
	catalog: WorkTriggerStatusCatalogParam[],
	atDate?: string,
): boolean {
	return rules.some((rule) => isRuleInputInvalid({ ...rule, paramCode }, catalog, atDate));
}

export type WorkCoefficientRowInput = {
	paramCode: string;
	valueCode: string | null;
	valueLabel: string | null;
};

export type WorkCoefficientCatalogParam = WorkTriggerStatusCatalogParam & {
	sourceKeys?: string[];
};

export function resolveWorkCoefficientCatalogParam(
	catalog: WorkCoefficientCatalogParam[],
	paramCode: string,
): WorkCoefficientCatalogParam | undefined {
	const direct = catalog.find((item) => item.code === paramCode);
	if (direct) return direct;
	return catalog.find((item) => item.sourceKeys?.includes(paramCode));
}

/** Параметр трудоёмкости из поля схемы анкеты (`field_*`), не из глобального CSV. */
export function isSchemaFieldLaborParamCode(paramCode: string): boolean {
	return /^field_[A-Za-z0-9_-]+$/.test(paramCode.trim());
}

/**
 * F-03 §578: значение коэффициента трудоёмкости доступно, только если оно
 * присутствует в активном глобальном справочнике значений параметра. Если
 * значение удалено — коэффициент исключается из расчёта и помечается в UI
 * меткой «Значение недоступно» (сохранение не блокируется).
 *
 * Строки-флаги без значения (valueCode/valueLabel = null) задают «параметр
 * присутствует» и не ссылаются на словарь — они всегда доступны.
 */
export function isWorkCoefficientValueAvailable(
	row: WorkCoefficientRowInput,
	catalog: WorkCoefficientCatalogParam[],
	atDate?: string,
): boolean {
	if (row.valueCode == null && row.valueLabel == null) return true;
	if (isSchemaFieldLaborParamCode(row.paramCode)) return true;
	const param = resolveWorkCoefficientCatalogParam(catalog, row.paramCode);
	if (!param) return false;
	return param.values.some(
		(value) =>
			(value.code === row.valueCode || value.label === row.valueLabel) &&
			(!atDate || isTypicalWorkParameterValueActiveOnDate(value, atDate)),
	);
}
