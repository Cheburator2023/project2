import type { AxiosError } from "axios";
import type {
	V2DeleteTypicalWorkConflictDto,
	V2TypicalWorkFieldErrorDto,
	V2TypicalWorkParameterDto,
	V2WorkTriggerStatus,
} from "@smart-anketa/api-contract";
import {
	computeWorkTriggerStatus,
	isWorkCoefficientValueAvailable,
	isWorkTriggerGroupInvalid,
	typicalWorkRulesMatchSource,
	type WorkTriggerStatusCatalogParam,
} from "@smart-anketa/api-contract";
import {
	resolveSchemaParamForTriggerRule,
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
): V2WorkTriggerStatus {
	if (rules.length === 0) return "no_triggers";

	const schemaList = schemaParams ?? [];
	const methodologyList = methodologyParams ?? [];

	for (const rule of rules) {
		const catalog = catalogForTriggerRuleGroup(
			rule,
			schemaList,
			methodologyList,
		);
		if (
			isWorkTriggerGroupInvalid(rule.paramCode, [rule], catalog)
		) {
			return "invalid";
		}
	}

	if (draftSource) {
		return typicalWorkRulesMatchSource(
			rules.map((rule) => ({
				paramCode: rule.paramCode,
				paramName: rule.paramName ?? null,
				operator: rule.operator ?? "=",
				valueCode: rule.valueCode,
				valueLabel: rule.valueLabel,
				values: rule.values,
			})),
			draftSource,
		)
			? "appears"
			: "hidden";
	}

	return computeWorkTriggerStatus(rules, undefined);
}

export { isWorkCoefficientValueAvailable, isWorkTriggerGroupInvalid };
