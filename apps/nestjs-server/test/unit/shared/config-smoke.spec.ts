import { logger } from "../../../src/shared/logger/logger.config";
import { retryConfig } from "../../../src/shared/config/retry.config";

describe("smoke imports for simple config modules", () => {
	it("logger.config exports a Logger instance", () => {
		expect(logger).toBeDefined();
		expect(typeof logger.log).toBe("function");
	});

	it("retry.config exposes default settings", () => {
		expect(retryConfig.defaultMaxRetries).toBeGreaterThan(0);
		expect(retryConfig.defaultBaseDelayMs).toBeGreaterThan(0);
		expect(Array.isArray(retryConfig.httpStatusesToRetry)).toBe(true);
	});
});
