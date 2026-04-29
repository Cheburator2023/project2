import { lastValueFrom, of, throwError } from "rxjs";
import { RetryInterceptor } from "../../../../src/shared/interceptors/retry.interceptor";
import { retryConfig } from "../../../../src/shared/config/retry.config";

describe("RetryInterceptor", () => {
	let originalDelayMs: number;

	beforeAll(() => {
		originalDelayMs = retryConfig.defaultBaseDelayMs;
		retryConfig.defaultBaseDelayMs = 1; // ускоряем
	});

	afterAll(() => {
		retryConfig.defaultBaseDelayMs = originalDelayMs;
	});

	const interceptor = new RetryInterceptor();
	const ctx = {} as any;

	it("passes through successful response", async () => {
		const next: any = { handle: () => of("ok") };
		expect(await lastValueFrom(interceptor.intercept(ctx, next))).toBe("ok");
	});

	it("rethrows non-retryable status immediately", async () => {
		const err: any = new Error("nope");
		err.status = 404;
		const next: any = { handle: () => throwError(() => err) };
		await expect(lastValueFrom(interceptor.intercept(ctx, next))).rejects.toBe(
			err,
		);
	});

	it("retries on retryable status and eventually rethrows after max retries", async () => {
		const err: any = new Error("retry");
		err.status = 503;
		let subscriptions = 0;
		const next: any = {
			handle: () =>
				new (require("rxjs").Observable)((sub: any) => {
					subscriptions++;
					sub.error(err);
				}),
		};
		await expect(
			lastValueFrom(interceptor.intercept(ctx, next)),
		).rejects.toBeDefined();
		expect(subscriptions).toBeGreaterThan(1);
	});
});
