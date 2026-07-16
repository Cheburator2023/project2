import { lastValueFrom, of, throwError } from "rxjs";
import { LoggingInterceptor } from "../../../../src/shared/interceptors/logging.interceptor";

describe("LoggingInterceptor", () => {
	const logger = {
		log: jest.fn(),
		httpLog: jest.fn(),
		error: jest.fn(),
	} as any;

	const interceptor = new LoggingInterceptor(logger);

	const buildCtx = () => {
		const req: any = {
			method: "GET",
			url: "/x",
			headers: { authorization: "Bearer xxx" },
			body: { a: 1 },
		};
		const res: any = { statusCode: 200 };
		return {
			ctx: {
				switchToHttp: () => ({
					getRequest: () => req,
					getResponse: () => res,
				}),
			} as any,
			req,
			res,
		};
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("logs httpLog on success", async () => {
		const { ctx } = buildCtx();
		const next: any = { handle: () => of("ok") };
		await lastValueFrom(interceptor.intercept(ctx, next));
		expect(logger.log).not.toHaveBeenCalled();
		expect(logger.httpLog).toHaveBeenCalled();
	});

	it("logs error on request failure", async () => {
		const { ctx } = buildCtx();
		const err: any = new Error("bad");
		err.getStatus = () => 500;
		err.getResponse = () => ({ message: "bad" });
		const next: any = { handle: () => throwError(() => err) };
		await expect(lastValueFrom(interceptor.intercept(ctx, next))).rejects.toBe(
			err,
		);
		expect(logger.error).toHaveBeenCalled();
	});
});
