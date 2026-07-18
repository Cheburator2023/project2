import type { AxiosError } from "axios";
import type {
	V2DeleteTypicalWorkConflictDto,
	V2TypicalWorkFieldErrorDto,
	V2TypicalWorkParameterDto,
	V2TypicalWorkTriggerArchCountDto,
	V2TypicalWorkTriggerFormulaDto,
	V2TypicalWorkTriggerMode,
	V2WorkTriggerStatus,
	TypicalWorkTriggerMatchContext,
} from "@smart-anketa/api-contract";
import {
	isWorkCoefficientValueAvailable,
	isWorkTriggerGroupInvalid,
	catalogValueMatchesTriggerRule,
	isPresenceOnlyTriggerRule,
	isAlwaysShownTriggerParam,
	isSourceTypeTriggerParam,
	isControlTypeTriggerParam,
	isTypicalWorkParameterValueActiveOnDate,
	resolveTriggerStatusCatalogParam,
	formatParamNameWithSourceKeys,
	type WorkTriggerStatusCatalogParam,
	hasTypicalWorkTriggersConfigured,
	validateTriggerFormulaTokens,
	type TriggerPreviewState,
} from "@smart-anketa/api-contract";
import {
	resolveSchemaParamForTriggerRule,
	triggerRuleGroupKey,
	type TriggerRuleLike,
} from "./schemaWorkParameters";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";

export const WORK_ARCH_COMPONENT_TYPES = [
	"Система-источник",
	"Объект / Витрина данных",
	"Процесс обработки данных",
	"Модель",
	"Модельный сервис",
] as const;

export const DEFAULT_WORK_ARCH_COMPONENT_TYPE = WORK_ARCH_COMPONENT_TYPES[0];

/** Как на бэкенде (`normalizeArchComponentType`) — CSV/legacy → канонический тип. */
export function normalizeWorkArchComponentType(raw: string): string {
	const value = raw.trim();
	if (!value) return "";
	if (value.includes("Витрина") || value.includes("Объект")) {
		return "Объект / Витрина данных";
	}
	if (value.includes("Процесс")) {
		return "Процесс обработки данных";
	}
	if (value.includes("Система")) {
		return "Система-источник";
	}
	if (value.includes("Модельный")) {
		return "Модельный сервис";
	}
	if (value === "Модель") {
		return "Модель";
	}
	return value;
}

export function resolveCanonicalWorkArchComponentType(
	...candidates: Array<string | null | undefined>
): string {
	for (const candidate of candidates) {
		const normalized = normalizeWorkArchComponentType(candidate ?? "");
		if (normalized) return normalized;
	}
	return "";
}

export type TypicalWorkPatchError = {
	message: string;
	code: string | null;
	fieldErrors: V2TypicalWorkFieldErrorDto[];
};

export function parseTypicalWorkPatchError(error: unknown): TypicalWorkPatchError {
	const ax = error as AxiosError<{
		message?: string | string[];
		code?: string;
		errors?: V2TypicalWorkFieldErrorDto[];
	}>;
	const data = ax.response?.data;
	const fieldErrors = Array.isArray(data?.errors) ? data.errors : [];
	const code = typeof data?.code === "string" ? data.code : null;

	let message = apiErrorMessage(error);
	if (fieldErrors.length > 0) {
		message = fieldErrors.map((e) => `${e.path}: ${e.message}`).join("; ");
	}

	return { message, code, fieldErrors };
}

export function parseTypicalWorkDeleteError(
	error: unknown,
): V2DeleteTypicalWorkConflictDto | null {
	const ax = error as AxiosError<V2DeleteTypicalWorkConflictDto & { message?: string }>;
	const data = ax.response?.data;
	if (data?.code !== "WORK_IN_USE") return null;
	if (!Array.isArray(data.usedInQuestionnaireVersions)) return null;
	return {
		code: "WORK_IN_USE",
		usedInQuestionnaireVersions: data.usedInQuestionnaireVersions,
	};
}

export function methodologyCatalogFromParameters(
	params: V2TypicalWorkParameterDto[] | undefined,
): WorkTriggerStatusCatalogParam[] | undefined {
	return params?.map((param) => ({
		code: param.code,
		values: param.values.map((value) => ({
			code: value.code,
			label: value.label,
			validFrom: value.validFrom,
			validTo: value.validTo,
		})),
	}));
}

export type TriggerValidationIssue = {
	paramCode: string;
	paramName: string;
	message: string;
};

const OPERATOR_HUMAN: Record<string, string> = {
	"=": "=",
	"!=": "≠",
	">=": "≥",
	"<=": "≤",
	">": ">",
	"<": "<",
	in: "∈",
	not_in: "∉",
};

function groupRulesByTriggerKey<
	T extends TriggerRuleLike,
>(rules: T[], paramOptions: V2TypicalWorkParameterDto[]): Map<string, T[]> {
	const map = new Map<string, T[]>();
	for (const rule of rules) {
		const key = triggerRuleGroupKey(rule, paramOptions);
		const list = map.get(key) ?? [];
		list.push(rule);
		map.set(key, list);
	}
	return map;
}

function collectValuesForGroup(
	paramRules: Array<{
		valueCode: string | null;
		valueLabel: string | null;
		values?: Array<{ code: string; label: string | null }>;
	}>,
) {
	const head = paramRules[0];
	if (head?.values?.length) return head.values;
	return paramRules
		.filter((rule) => rule.valueCode || rule.valueLabel)
		.map((rule) => ({
			code: rule.valueCode ?? "",
			label: rule.valueLabel,
		}));
}

export function collectTriggerValidationIssues(
	rules: Array<{
		paramCode: string;
		paramName?: string | null;
		operator?: string;
		valueCode: string | null;
		valueLabel: string | null;
		values?: Array<{ code: string; label: string | null }>;
	}>,
	schemaParams: V2TypicalWorkParameterDto[] = [],
	methodologyParams: V2TypicalWorkParameterDto[] = [],
	atDate?: string,
): TriggerValidationIssue[] {
	const issues: TriggerValidationIssue[] = [];
	const grouped = groupRulesByTriggerKey(rules, schemaParams);

	for (const [groupKey, paramRules] of grouped) {
		const ruleSeed = {
			paramCode: paramRules[0]?.paramCode ?? groupKey,
			paramName: paramRules[0]?.paramName ?? null,
		};
		const schemaParam =
			schemaParams.find((param) => param.code === groupKey) ??
			resolveSchemaParamForTriggerRule(ruleSeed, schemaParams);
		const displayName =
			schemaParam?.name ??
			(isAlwaysShownTriggerParam(ruleSeed.paramCode, ruleSeed.paramName)
				? "Нет — работа выводится всегда"
				: isSourceTypeTriggerParam(ruleSeed.paramCode, ruleSeed.paramName)
					? "Тип источника данных"
					: (paramRules[0]?.paramName ?? groupKey));
		const catalog = catalogForTriggerRuleGroup(
			ruleSeed,
			schemaParams,
			methodologyParams,
		);
		const knownPseudo =
			isAlwaysShownTriggerParam(ruleSeed.paramCode, ruleSeed.paramName) ||
			isSourceTypeTriggerParam(ruleSeed.paramCode, ruleSeed.paramName) ||
			isControlTypeTriggerParam(ruleSeed.paramCode, ruleSeed.paramName);

		if (
			!schemaParam &&
			!knownPseudo &&
			/^field_[A-Za-z0-9_-]+$/.test(groupKey)
		) {
			issues.push({
				paramCode: groupKey,
				paramName: displayName,
				message: `Параметр «${displayName}» (код ${groupKey}) не найден в схеме шаблона`,
			});
			continue;
		}

		if (
			!isWorkTriggerGroupInvalid(groupKey, paramRules, catalog, atDate)
		) {
			continue;
		}

		if (!schemaParam && !knownPseudo) {
			const inCatalog = resolveTriggerStatusCatalogParam(ruleSeed, catalog);
			if (!inCatalog) {
				issues.push({
					paramCode: groupKey,
					paramName: displayName,
					message: `Параметр «${displayName}» (код ${groupKey}) не найден в схеме шаблона и не сопоставлен со справочником`,
				});
				continue;
			}
		}

		const operator = paramRules[0]?.operator ?? "=";
		const catalogParam = resolveTriggerStatusCatalogParam(ruleSeed, catalog);

		if (operator === "in" || operator === "not_in") {
			const values = collectValuesForGroup(paramRules);
			if (values.length === 0) {
				issues.push({
					paramCode: groupKey,
					paramName: displayName,
					message: `«${displayName}»: не выбрано ни одного значения (оператор ${OPERATOR_HUMAN[operator] ?? operator})`,
				});
				continue;
			}
			if (!catalogParam) {
				issues.push({
					paramCode: groupKey,
					paramName: displayName,
					message: `«${displayName}»: параметр отсутствует в каталоге значений`,
				});
				continue;
			}
			for (const value of values) {
				const label = value.label ?? value.code;
				const matches = catalogParam.values.some(
					(catalogValue) =>
						catalogValueMatchesTriggerRule(catalogValue, {
							...ruleSeed,
							valueCode: value.code,
							valueLabel: value.label,
						}) &&
						(!atDate ||
							isTypicalWorkParameterValueActiveOnDate(catalogValue, atDate)),
				);
				if (!matches) {
					issues.push({
						paramCode: groupKey,
						paramName: displayName,
						message: `«${displayName}»: значение «${label}» отсутствует в схеме или недоступно на текущую дату`,
					});
				}
			}
			continue;
		}

		if (isPresenceOnlyTriggerRule(paramRules[0] ?? { valueCode: null, valueLabel: null })) {
			issues.push({
				paramCode: groupKey,
				paramName: displayName,
				message: `«${displayName}»: условие «поле заполнено», но параметр не найден в каталоге`,
			});
			continue;
		}

		for (const rule of paramRules) {
			const label = rule.valueLabel ?? rule.valueCode ?? "—";
			if (!rule.valueCode && !rule.valueLabel) {
				issues.push({
					paramCode: groupKey,
					paramName: displayName,
					message: `«${displayName}»: не задано значение для оператора ${OPERATOR_HUMAN[operator] ?? operator}`,
				});
				continue;
			}
			if (!catalogParam) {
				issues.push({
					paramCode: groupKey,
					paramName: displayName,
					message: `«${displayName}»: параметр отсутствует в каталоге значений`,
				});
				continue;
			}
			if (
				catalogParam.values.length === 0 &&
				(rule.operator === ">=" ||
					rule.operator === "<=" ||
					rule.operator === ">" ||
					rule.operator === "<" ||
					rule.operator === "=" ||
					rule.operator === "!=")
			) {
				if (Number.isNaN(Number(label))) {
					issues.push({
						paramCode: groupKey,
						paramName: displayName,
						message: `«${displayName}»: для числового поля нужен порог (число), указано «${label}»`,
					});
				}
				continue;
			}
			const matches = catalogParam.values.some(
				(catalogValue) =>
					catalogValueMatchesTriggerRule(catalogValue, rule) &&
					(!atDate ||
						isTypicalWorkParameterValueActiveOnDate(catalogValue, atDate)),
			);
			if (!matches) {
				issues.push({
					paramCode: groupKey,
					paramName: displayName,
					message: `«${displayName}»: значение «${label}» отсутствует в схеме или недоступно на текущую дату`,
				});
			}
		}
	}

	return issues;
}

export type { TriggerPreviewState };

export function analyzeTriggerRules(
	rules: Parameters<typeof computeTriggerStatus>[0],
	schemaParams?: V2TypicalWorkParameterDto[],
	methodologyParams?: V2TypicalWorkParameterDto[],
	_draftSource?: Record<string, unknown>,
	atDate?: string,
	_previewFormData?: Record<string, unknown>,
	triggerArchCount?: V2TypicalWorkTriggerArchCountDto | null,
	triggerMode: V2TypicalWorkTriggerMode = "simple",
	triggerFormula?: V2TypicalWorkTriggerFormulaDto | null,
	_triggerMatchContext?: TypicalWorkTriggerMatchContext,
): {
	status: V2WorkTriggerStatus;
	issues: TriggerValidationIssue[];
	previewState: TriggerPreviewState;
} {
	const triggerInput = {
		mode: triggerMode,
		rules: rules.map((rule) => {
			const ruleSeed = {
				paramCode: rule.paramCode,
				paramName: rule.paramName ?? null,
				operator: rule.operator ?? "=",
				valueCode: rule.valueCode,
				valueLabel: rule.valueLabel,
				values: rule.values,
			};
			const resolved = schemaParams?.length
				? resolveSchemaParamForTriggerRule(ruleSeed, schemaParams)
				: undefined;
			return {
				...ruleSeed,
				paramCode: resolved?.code ?? rule.paramCode,
				paramName: resolved
					? formatParamNameWithSourceKeys(resolved.name, resolved.sourceKeys)
					: (rule.paramName ?? null),
			};
		}),
		triggerArchCount,
		triggerFormula,
	};

	if (!hasTypicalWorkTriggersConfigured(triggerInput)) {
		return { status: "no_triggers", issues: [], previewState: "none" };
	}

	const issues =
		triggerMode === "formula"
			? (() => {
					const formulaError = validateTriggerFormulaTokens(
						triggerFormula?.tokens ?? [],
					);
					return formulaError
						? [
								{
									paramCode: "triggerFormula",
									paramName: "Формула триггеров",
									message: formulaError,
								},
							]
						: [];
				})()
			: collectTriggerValidationIssues(
					rules,
					schemaParams,
					methodologyParams,
					atDate,
				);

	if (issues.length > 0) {
		return { status: "invalid", issues, previewState: "none" };
	}

	return { status: "appears", issues: [], previewState: "none" };
}

/** Каталог для проверки триггера: поле схемы → его values; seed/CSV → методологический справочник. */
export function catalogForTriggerRuleGroup(
	rule: TriggerRuleLike,
	paramOptions: V2TypicalWorkParameterDto[],
	methodologyCatalog: V2TypicalWorkParameterDto[],
): WorkTriggerStatusCatalogParam[] {
	const schemaParam = resolveSchemaParamForTriggerRule(rule, paramOptions);
	if (schemaParam) {
		return methodologyCatalogFromParameters([schemaParam]) ?? [];
	}
	return (
		methodologyCatalogFromParameters(methodologyCatalog) ??
		methodologyCatalogFromParameters(paramOptions) ??
		[]
	);
}

export function computeTriggerStatus(
	rules: Array<{
		paramCode: string;
		paramName?: string | null;
		operator?: string;
		valueCode: string | null;
		valueLabel: string | null;
		values?: Array<{ code: string; label: string | null }>;
	}>,
	schemaParams?: V2TypicalWorkParameterDto[],
	methodologyParams?: V2TypicalWorkParameterDto[],
	draftSource?: Record<string, unknown>,
	atDate?: string,
	previewFormData?: Record<string, unknown>,
	triggerArchCount?: V2TypicalWorkTriggerArchCountDto | null,
	triggerMode?: V2TypicalWorkTriggerMode,
	triggerFormula?: V2TypicalWorkTriggerFormulaDto | null,
	triggerMatchContext?: TypicalWorkTriggerMatchContext,
): V2WorkTriggerStatus {
	return analyzeTriggerRules(
		rules,
		schemaParams,
		methodologyParams,
		draftSource,
		atDate,
		previewFormData,
		triggerArchCount,
		triggerMode,
		triggerFormula,
		triggerMatchContext,
	).status;
}

export { isWorkCoefficientValueAvailable, isWorkTriggerGroupInvalid };
