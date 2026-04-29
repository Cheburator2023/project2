import { lastValueFrom, of, throwError } from "rxjs";
import { AbortInterceptor } from "../../../../src/shared/interceptors/abort.interceptor";

describe("AbortInterceptor", () => {
	let interceptor: AbortInterceptor;

	beforeEach(() => {
		interceptor = new AbortInterceptor();
	});

	const buildCtx = (req: any) =>
		({
			switchToHttp: () => ({ getRequest: () => req }),
		}) as any;

	it("forwards values from upstream observable", async () => {
		const req: any = {};
		const next: any = { handle: () => of("payload") };
		const result$ = interceptor.intercept(buildCtx(req), next);
		const value = await lastValueFrom(result$);
		expect(value).toBe("payload");
		expect(req.context.requestId).toBeDefined();
	});

	it("creates abortController if missing on existing context", async () => {
		const req: any = { context: { requestId: "x" } };
		const next: any = { handle: () => of("ok") };
		await lastValueFrom(interceptor.intercept(buildCtx(req), next));
		expect(req.context.abortController).toBeDefined();
	});

	it("propagates errors", async () => {
		const req: any = {};
		const err = new Error("boom");
		const next: any = { handle: () => throwError(() => err) };
		await expect(
			lastValueFrom(interceptor.intercept(buildCtx(req), next)),
		).rejects.toBe(err);
	});

	it("completes when signal is aborted", (done) => {
		const req: any = {};
		const next: any = { handle: () => new (require("rxjs").Observable)() };
		const sub = interceptor.intercept(buildCtx(req), next).subscribe({
			complete: () => {
				done();
			},
		});
		req.context.abortController.abort();
		sub.unsubscribe();
	});
});
