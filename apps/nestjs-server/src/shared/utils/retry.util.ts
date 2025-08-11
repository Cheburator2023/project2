import { Logger } from "@nestjs/common";
import { delay } from "./delay.util";

export class RetryUtil {
	private static readonly logger = new Logger(RetryUtil.name);

	static async withRetry<T>(
		operation: () => Promise<T>,
		maxRetries = 3,
		baseDelayMs = 1000,
		shouldRetry = (_error: any) => true,
	): Promise<T> {
		let attempt = 0;
		let lastError: any;

		while (attempt < maxRetries) {
			try {
				return await operation();
			} catch (error) {
				lastError = error;
				attempt++;

				if (!shouldRetry(error) || attempt >= maxRetries) {
					break;
				}

				const delayMs = baseDelayMs * 2 ** (attempt - 1);
				RetryUtil.logger.warn(
					`Attempt ${attempt} failed. Retrying in ${delayMs}ms...`,
					error.message,
				);

				await delay(delayMs);
			}
		}

		throw lastError;
	}
}
