import { HttpStatus } from "@nestjs/common";

export interface RetryConfig {
	defaultMaxRetries: number;
	defaultBaseDelayMs: number;
	httpStatusesToRetry: number[];
}

export const retryConfig: RetryConfig = {
	defaultMaxRetries: 3,
	defaultBaseDelayMs: 1000,
	httpStatusesToRetry: [
		HttpStatus.REQUEST_TIMEOUT,
		HttpStatus.TOO_MANY_REQUESTS,
		HttpStatus.INTERNAL_SERVER_ERROR,
		HttpStatus.BAD_GATEWAY,
		HttpStatus.SERVICE_UNAVAILABLE,
		HttpStatus.GATEWAY_TIMEOUT,
	],
};
