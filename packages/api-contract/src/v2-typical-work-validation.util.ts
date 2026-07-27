import type {
	PatchV2TypicalWorkRequestDto,
	V2TypicalWorkNormInputDto,
	V2TypicalWorkRoundingDto,
	V2TypicalWorkTriggerFormulaDto,
	V2TypicalWorkTriggerMode,
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
	isAlwaysShownTriggerParam,
	isControlTypeTriggerParam,
	isPresenceOnlyTriggerRule,
	isSourceTypeTriggerParam,
	laborValueMatches,
	resolveTriggerStatusCatalogParam,
	triggerRuleCatalogGroupKey,
	normalizeTypicalWorkTriggerRulesForMatch,
	type TypicalWorkTriggerArchCountLike,
} from "./v2-works-catalog-match.util";
import type { WorkSchemaParamDef } from "./v2-work-schema-params-match.util";
import { findWorkSchemaParameter } from "./v2-work-schema-params-match.util";
import { isNumericLaborByValueParam } from "./v2-numeric-labor-range.util";
import {
	hasTypicalWorkTriggersConfigured,
	matchTypicalWorkTriggers,
	validateTriggerFormulaTokens,
} from "./v2-trigger-formula.util";

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
		if (isAlwaysShownTriggerParam(rule.paramCode, rule.paramName)) return false;
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
	formData?: Record<string, unknown>,
	triggerArchCount?: TypicalWorkTriggerArchCountLike | null,
	triggerMode: V2TypicalWorkTriggerMode = "simple",
	triggerFormula?: V2TypicalWorkTriggerFormulaDto | null,
): V2WorkTriggerStatus {
	const matchRules = normalizeTypicalWorkTriggerRulesForMatch(
		rules.map((rule) => ({
			paramCode: rule.paramCode,
			paramName: rule.paramName ?? null,
			operator: rule.operator ?? "=",
			valueCode: rule.valueCode,
			valueLabel: rule.valueLabel,
			values: rule.values,
		})),
	);
	const triggerInput = {
		mode: triggerMode,
		rules: matchRules,
		triggerArchCount,
		triggerFormula,
	};

	if (!hasTypicalWorkTriggersConfigured(triggerInput)) {
		return "no_triggers";
	}

	if (triggerMode === "formula") {
		const formulaError = validateTriggerFormulaTokens(
			triggerFormula?.tokens ?? [],
		);
		if (formulaError) return "invalid";
		if (draftSource) {
			return matchTypicalWorkTriggers(
				triggerInput,
				draftSource,
				formData ?? draftSource,
			)
				? "appears"
				: "hidden";
		}
		return "appears";
	}

	if (rules.length > 0) {
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
	}

	if (draftSource) {
		return matchTypicalWorkTriggers(
			triggerInput,
			draftSource,
			formData ?? draftSource,
		)
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
	schemaFieldUid?: string | null;
};

export type WorkCoefficientCatalogParam = WorkTriggerStatusCatalogParam & {
	sourceKeys?: string[];
	schemaFieldUid?: string | null;
};

export function resolveWorkCoefficientCatalogParam(
	catalog: WorkCoefficientCatalogParam[],
	paramCode: string,
	schemaFieldUid?: string | null,
): WorkCoefficientCatalogParam | undefined {
	if (schemaFieldUid?.trim()) {
		const byUid = catalog.find(
			(item) => item.schemaFieldUid === schemaFieldUid,
		);
		if (byUid) return byUid;
	}
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
 *
 * Параметры `field_*` — из схемы анкеты, не из глобального CSV методики.
 * Привязку `schemaFieldUid` runtime обрабатывает отдельно (не через этот хелпер),
 * чтобы админка по-прежнему ловила удалённые значения словаря схемы.
 */
export function isWorkCoefficientValueAvailable(
	row: WorkCoefficientRowInput,
	catalog: WorkCoefficientCatalogParam[],
	atDate?: string,
): boolean {
	if (row.valueCode == null && row.valueLabel == null) return true;
	if (isSchemaFieldLaborParamCode(row.paramCode)) return true;
	const param = resolveWorkCoefficientCatalogParam(
		catalog,
		row.paramCode,
		row.schemaFieldUid,
	);
	if (!param) return false;
	if (param.values.length === 0) return true;
	return param.values.some((value) => {
		if (atDate && !isTypicalWorkParameterValueActiveOnDate(value, atDate)) {
			return false;
		}
		if (value.code === row.valueCode || value.label === row.valueLabel) {
			return true;
		}
		// Labor «4» ↔ словарь/схема «4 — Высокая…»; «Да» ↔ boolean.
		return (
			laborValueMatches(value.label, row.valueCode, row.valueLabel) ||
			laborValueMatches(value.code, row.valueCode, row.valueLabel)
		);
	});
}

export type WorkCoefficientCatalogSourceParam = {
	code: string;
	name?: string;
	sourceKeys?: string[];
	schemaFieldUid?: string | null;
	values: Array<{ code: string; label: string }>;
};

export function isWorkSchemaLaborParamCandidate(
	param: Pick<WorkSchemaParamDef, "values"> & {
		dictionaryCode?: string | null;
		numeric?: boolean;
	},
): boolean {
	return (
		(param.values?.length ?? 0) > 0 ||
		param.numeric === true ||
		Boolean(param.dictionaryCode?.trim())
	);
}

function mergeCatalogValues(
	left: Array<{ code: string; label: string }>,
	right: Array<{ code: string; label: string }>,
): Array<{ code: string; label: string }> {
	const byKey = new Map<string, { code: string; label: string }>();
	for (const value of [...left, ...right]) {
		const key = `${value.code}\0${value.label}`;
		if (!byKey.has(key)) byKey.set(key, value);
	}
	return [...byKey.values()];
}

function toWorkCoefficientCatalogParam(
	param: WorkCoefficientCatalogSourceParam,
	legacyCode?: string,
): WorkCoefficientCatalogParam {
	const sourceKeys = new Set<string>([
		...(param.sourceKeys ?? [param.code]),
		...(legacyCode && legacyCode !== param.code ? [legacyCode] : []),
	]);
	return {
		code: param.code,
		schemaFieldUid: param.schemaFieldUid ?? null,
		sourceKeys: [...sourceKeys],
		values: param.values.map((value) => ({
			code: value.code,
			label: value.label,
		})),
	};
}

/** Каталог коэффициентов как в TypicalWorkEditableCard.coefficientCatalog. */
export function buildWorkCoefficientCatalog(input: {
	schemaParams: WorkSchemaParamDef[];
	laborParams: Array<{
		paramCode: string;
		paramName?: string | null;
		schemaFieldUid?: string | null;
	}>;
	methodologyCatalog?: WorkCoefficientCatalogSourceParam[];
}): WorkCoefficientCatalogParam[] {
	const byUid = new Map<string, WorkCoefficientCatalogParam>();
	const byCode = new Map<string, WorkCoefficientCatalogParam>();

	const addParam = (
		param: WorkCoefficientCatalogSourceParam,
		legacyCode?: string,
	) => {
		const next = toWorkCoefficientCatalogParam(param, legacyCode);
		const uid = next.schemaFieldUid?.trim();
		if (uid) {
			const existingUid = byUid.get(uid);
			if (existingUid) {
				existingUid.values = mergeCatalogValues(existingUid.values, next.values);
				existingUid.sourceKeys = [
					...new Set([
						...(existingUid.sourceKeys ?? []),
						...(next.sourceKeys ?? []),
					]),
				];
			} else {
				byUid.set(uid, next);
			}
		}

		const existingCode = byCode.get(next.code);
		if (existingCode) {
			existingCode.values = mergeCatalogValues(existingCode.values, next.values);
			existingCode.sourceKeys = [
				...new Set([
					...(existingCode.sourceKeys ?? []),
					...(next.sourceKeys ?? []),
				]),
			];
			if (!existingCode.schemaFieldUid && next.schemaFieldUid) {
				existingCode.schemaFieldUid = next.schemaFieldUid;
			}
		} else {
			byCode.set(next.code, { ...next });
		}
	};

	for (const param of input.schemaParams.filter(isWorkSchemaLaborParamCandidate)) {
		addParam({
			code: param.code,
			name: param.name,
			sourceKeys: param.sourceKeys,
			schemaFieldUid: param.schemaFieldUid,
			values: param.values ?? [],
		});
	}

	const methodologyParams: WorkSchemaParamDef[] = (input.methodologyCatalog ?? []).map(
		(param) => ({
			code: param.code,
			name: param.name ?? param.code,
			sourceKeys: param.sourceKeys,
			schemaFieldUid: param.schemaFieldUid,
			values: param.values,
		}),
	);

	for (const group of input.laborParams) {
		if (group.schemaFieldUid?.trim()) {
			const byLaborUid = input.schemaParams.find(
				(param) => param.schemaFieldUid === group.schemaFieldUid,
			);
			if (byLaborUid) {
				addParam(
					{
						code: byLaborUid.code,
						sourceKeys: byLaborUid.sourceKeys,
						schemaFieldUid: byLaborUid.schemaFieldUid,
						values: byLaborUid.values ?? [],
					},
					group.paramCode,
				);
				continue;
			}
		}

		const alreadyKnown = [...byCode.values(), ...byUid.values()].some(
			(entry) =>
				entry.code === group.paramCode ||
				entry.sourceKeys?.includes(group.paramCode),
		);
		if (alreadyKnown) continue;

		const schemaMatch = findWorkSchemaParameter(
			input.schemaParams,
			group.paramCode,
			group.paramName,
		);
		if (schemaMatch) {
			addParam(
				{
					code: schemaMatch.code,
					sourceKeys: schemaMatch.sourceKeys,
					schemaFieldUid: schemaMatch.schemaFieldUid,
					values: schemaMatch.values ?? [],
				},
				group.paramCode,
			);
			continue;
		}

		const catalogMatch = findWorkSchemaParameter(
			methodologyParams,
			group.paramCode,
			group.paramName,
		);
		if (catalogMatch) {
			addParam(
				{
					code: catalogMatch.code,
					sourceKeys: catalogMatch.sourceKeys,
					schemaFieldUid: catalogMatch.schemaFieldUid,
					values: catalogMatch.values ?? [],
				},
				group.paramCode,
			);
		}
	}

	const merged = new Map<string, WorkCoefficientCatalogParam>();
	for (const entry of [...byUid.values(), ...byCode.values()]) {
		const key = entry.schemaFieldUid?.trim()
			? `uid:${entry.schemaFieldUid}`
			: `code:${entry.code}`;
		const existing = merged.get(key);
		if (!existing) {
			merged.set(key, entry);
			continue;
		}
		existing.values = mergeCatalogValues(existing.values, entry.values);
		existing.sourceKeys = [
			...new Set([...(existing.sourceKeys ?? []), ...(entry.sourceKeys ?? [])]),
		];
	}
	return [...merged.values()];
}

export type UnavailableLaborCoefficientIssue = {
	kind: "labor_value" | "labor";
	paramCode: string;
	paramName?: string | null;
	message: string;
};

/**
 * Риски расчёта трудоёмкости: недоступные значения, параметр без привязки
 * к схеме/справочнику (тихо даёт ×1), все строки отсечены.
 */
export function collectUnavailableLaborCoefficientIssues(input: {
	laborParams: Array<{
		paramCode: string;
		paramName?: string | null;
		schemaFieldUid?: string | null;
		kind?: string | null;
		coefficients?: Array<{
			valueCode: string | null;
			valueLabel: string | null;
		}>;
	}>;
	schemaParams: WorkSchemaParamDef[];
	methodologyCatalog?: WorkCoefficientCatalogSourceParam[];
	formulaParamCodes?: string[];
	atDate?: string;
}): UnavailableLaborCoefficientIssue[] {
	const catalog = buildWorkCoefficientCatalog({
		schemaParams: input.schemaParams,
		laborParams: input.laborParams,
		methodologyCatalog: input.methodologyCatalog,
	});
	const issues: UnavailableLaborCoefficientIssue[] = [];
	const formulaCodes = new Set(input.formulaParamCodes ?? []);

	for (const group of input.laborParams) {
		if (group.kind === "any_of") continue;
		const paramTitle =
			group.paramName?.trim() || group.paramCode;
		const catalogParam = resolveWorkCoefficientCatalogParam(
			catalog,
			group.paramCode,
			group.schemaFieldUid,
		);
		const boundToSchema = Boolean(group.schemaFieldUid?.trim());

		if (
			!boundToSchema &&
			!catalogParam &&
			(group.coefficients?.length ?? 0) > 0
		) {
			issues.push({
				kind: "labor_value",
				paramCode: group.paramCode,
				paramName: group.paramName,
				message: `Параметр трудоёмкости «${paramTitle}» не привязан к полю схемы и не найден в справочнике — коэффициенты не попадут в расчёт (будет ×1). Привяжите поле схемы или добавьте параметр в справочник методики.`,
			});
			continue;
		}

		if (
			isNumericLaborByValueParam({
				name: group.paramName,
				values: catalogParam?.values,
			})
		) {
			continue;
		}

		let unavailableCount = 0;
		let valueCount = 0;
		for (const row of group.coefficients ?? []) {
			if (!row.valueCode && !row.valueLabel) continue;
			valueCount += 1;
			if (
				isWorkCoefficientValueAvailable(
					{
						paramCode: group.paramCode,
						schemaFieldUid: group.schemaFieldUid,
						valueCode: row.valueCode,
						valueLabel: row.valueLabel,
					},
					catalog,
					input.atDate,
				)
			) {
				continue;
			}
			unavailableCount += 1;
			issues.push({
				kind: "labor_value",
				paramCode: group.paramCode,
				paramName: group.paramName,
				message: `Значение параметра трудоёмкости «${row.valueLabel ?? row.valueCode}» недоступно в справочнике — коэффициент исключён из расчёта`,
			});
		}

		if (
			valueCount > 0 &&
			unavailableCount === valueCount &&
			(formulaCodes.size === 0 || formulaCodes.has(group.paramCode))
		) {
			issues.push({
				kind: "labor_value",
				paramCode: group.paramCode,
				paramName: group.paramName,
				message: `Все значения «${paramTitle}» недоступны — в формуле будет ×1`,
			});
		}

		if (
			!boundToSchema &&
			catalogParam &&
			(group.coefficients?.length ?? 0) > 0 &&
			(formulaCodes.size === 0 || formulaCodes.has(group.paramCode))
		) {
			issues.push({
				kind: "labor_value",
				paramCode: group.paramCode,
				paramName: group.paramName,
				message: `Параметр «${paramTitle}» без привязки к полю схемы (schemaFieldUid). Расчёт может игнорировать коэффициенты, если справочник методики не совпадает со схемой. Рекомендуется привязать поле.`,
			});
		}
	}

	return issues;
}
