import type { AxiosError } from "axios";

export function apiErrorMessage(error: unknown): string {
	const ax = error as AxiosError<{ message?: string | string[] }>;
	const bodyMsg = ax.response?.data?.message;

	if (Array.isArray(bodyMsg)) {
		return bodyMsg.join(", ");
	}

	if (typeof bodyMsg === "string" && bodyMsg.trim()) {
		return bodyMsg;
	}

	if (error instanceof Error && error.message) {
		return error.message;
	}

	return "Неизвестная ошибка";
}
