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
} from "@smart-anketa/api-contract";
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

export function computeTriggerStatus(
	rules: Array<{
		paramCode: string;
		paramName?: string | null;
		operator?: string;
		valueCode: string | null;
		valueLabel: string | null;
		values?: Array<{ code: string; label: string | null }>;
	}>,
	catalog?: V2TypicalWorkParameterDto[],
): V2WorkTriggerStatus {
	return computeWorkTriggerStatus(
		rules,
		methodologyCatalogFromParameters(catalog),
	);
}

export function methodologyCatalogFromParameters(
	params: V2TypicalWorkParameterDto[] | undefined,
) {
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

export { isWorkCoefficientValueAvailable, isWorkTriggerGroupInvalid };
