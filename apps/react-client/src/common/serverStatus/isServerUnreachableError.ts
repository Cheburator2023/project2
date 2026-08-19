import type { AxiosError } from "axios";

/**
 * Падение процесса API / шлюза, а не бизнес-ошибка конкретного эндпоинта.
 * Таймаут одного тяжёлого запроса сюда не входит — сервер при этом может быть жив.
 */
export function isServerUnreachableError(error: unknown): boolean {
	const ax = error as AxiosError | undefined;
	if (!ax || typeof ax !== "object") return false;
	if (ax.code === "ERR_CANCELED") return false;

	const status = ax.response?.status;
	if (status === 502 || status === 503 || status === 504) {
		return true;
	}
	if (ax.response) return false;

	return (
		ax.code === "ERR_NETWORK" ||
		ax.message === "Network Error" ||
		(error instanceof Error && error.message === "Network Error")
	);
}

export function describeServerUnreachable(error: unknown): string {
	const ax = error as AxiosError | undefined;
	const status = ax?.response?.status;
	if (status) return `HTTP ${status}`;
	if (ax?.code === "ERR_NETWORK" || ax?.message === "Network Error") {
		return "Нет ответа API";
	}
	if (error instanceof Error && error.message.trim()) {
		return error.message.trim();
	}
	return "Нет ответа API";
}
