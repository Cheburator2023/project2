import type { AxiosError } from "axios";
import type { V2TypicalWorkFieldErrorDto, V2WorkTriggerStatus } from "@smart-anketa/api-contract";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";

export const WORK_ARCH_COMPONENT_TYPES = [
	"Система-источник",
	"Объект / Витрина данных",
	"Процесс обработки данных",
	"Модель",
	"Модельный сервис",
] as const;

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

export function computeTriggerStatus(
	rules: Array<{ valueLabel: string | null }>,
): V2WorkTriggerStatus {
	if (rules.length === 0) return "no_triggers";
	if (rules.some((rule) => !rule.valueLabel)) return "invalid";
	return "appears";
}
