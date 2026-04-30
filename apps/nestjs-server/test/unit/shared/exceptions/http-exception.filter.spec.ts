import { HttpException, HttpStatus, Logger } from "@nestjs/common";
import { HttpExceptionFilter } from "../../../../src/shared/exceptions/http-exception.filter";

describe("HttpExceptionFilter", () => {
	let filter: HttpExceptionFilter;
	let loggerErrorSpy: jest.SpyInstance;
	const buildHost = (overrides: any = {}) => {
		const res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			...overrides.res,
		};
		const req = {
			url: "/x",
			method: "GET",
			body: { a: 1 },
			query: { q: "y" },
			params: { id: "z" },
			...overrides.req,
		};
		return {
			res,
			req,
			host: {
				switchToHttp: () => ({
					getResponse: () => res,
					getRequest: () => req,
				}),
			} as any,
		};
	};

	beforeEach(() => {
		loggerErrorSpy = jest
			.spyOn(Logger.prototype, "error")
			.mockImplementation(() => undefined);
		filter = new HttpExceptionFilter();
	});

	afterEach(() => {
		loggerErrorSpy.mockRestore();
		delete process.env.NODE_ENV;
	});

	it("formats response and logs in development mode", () => {
		process.env.NODE_ENV = "development";
		const { host, res } = buildHost();
		const exception = new HttpException(
			{ message: "oops", code: "E" },
			HttpStatus.BAD_REQUEST,
		);
		filter.catch(exception, host);
		expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
		const payload = res.json.mock.calls[0][0];
		expect(payload.statusCode).toBe(400);
		expect(payload.path).toBe("/x");
		expect(payload.requestBody).toEqual({ a: 1 });
		expect(payload.code).toBe("E");
		expect(loggerErrorSpy).toHaveBeenCalledWith(
			"HTTP Exception: oops",
			expect.objectContaining({
				statusCode: 400,
				code: "E",
				requestBody: { a: 1 },
			}),
		);
	});

	it("omits debug fields in production", () => {
		process.env.NODE_ENV = "production";
		const { host, res } = buildHost();
		filter.catch(new HttpException("no", HttpStatus.NOT_FOUND), host);
		const payload = res.json.mock.calls[0][0];
		expect(payload.requestBody).toBeUndefined();
		expect(payload.stack).toBeUndefined();
		expect(loggerErrorSpy).toHaveBeenCalledWith(
			"HTTP Exception: no",
			expect.objectContaining({
				statusCode: 404,
				stack: expect.any(String),
			}),
		);
	});

	it("handles non-object errorResponse", () => {
		process.env.NODE_ENV = "production";
		const { host, res } = buildHost();
		filter.catch(new HttpException("just a string", 500), host);
		expect(res.json).toHaveBeenCalled();
	});
});
