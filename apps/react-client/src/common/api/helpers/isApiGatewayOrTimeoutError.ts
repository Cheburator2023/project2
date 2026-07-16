import type { AxiosError } from "axios";

import { apiErrorMessage } from "./apiErrorMessage";

export function isApiGatewayOrTimeoutError(error: unknown): boolean {
	const ax = error as AxiosError;
	const status = ax.response?.status;
	if (status === 502 || status === 503 || status === 504) {
		return true;
	}
	if (ax.code === "ECONNABORTED" || ax.code === "ERR_NETWORK") {
		return true;
	}

	const message = apiErrorMessage(error).toLowerCase();
	return (
		message.includes("504") ||
		message.includes("502") ||
		message.includes("503") ||
		message.includes("gateway timeout") ||
		message.includes("timeout")
	);
}
