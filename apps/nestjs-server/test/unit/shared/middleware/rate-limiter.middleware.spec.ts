import { RateLimiterMiddleware } from "../../../../src/shared/middleware/rate-limiter.middleware";

describe("RateLimiterMiddleware", () => {
	let mw: RateLimiterMiddleware;

	beforeEach(() => {
		mw = new RateLimiterMiddleware();
	});

	const buildReq = (over: any = {}) =>
		({
			headers: {},
			connection: {},
			socket: {},
			...over,
		}) as any;

	const buildRes = () =>
		({
			setHeader: jest.fn(),
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		}) as any;

	it("calls next when no IP is resolvable", () => {
		const next = jest.fn();
		mw.use(buildReq(), buildRes(), next);
		expect(next).toHaveBeenCalled();
	});

	it("uses x-forwarded-for header", () => {
		const next = jest.fn();
		mw.use(
			buildReq({ headers: { "x-forwarded-for": "1.2.3.4" } }),
			buildRes(),
			next,
		);
		expect(next).toHaveBeenCalled();
	});

	it("uses connection.remoteAddress when no x-forwarded-for", () => {
		const next = jest.fn();
		mw.use(
			buildReq({ connection: { remoteAddress: "1.1.1.1" } }),
			buildRes(),
			next,
		);
		expect(next).toHaveBeenCalled();
	});

	it("uses socket.remoteAddress as last fallback", () => {
		const next = jest.fn();
		mw.use(
			buildReq({ socket: { remoteAddress: "2.2.2.2" } }),
			buildRes(),
			next,
		);
		expect(next).toHaveBeenCalled();
	});

	it("strips ::ffff: prefix from IP", () => {
		const next = jest.fn();
		mw.use(
			buildReq({ socket: { remoteAddress: "::ffff:127.0.0.1" } }),
			buildRes(),
			next,
		);
		expect(next).toHaveBeenCalled();
	});

	it("allows up to 30 requests then blocks the 31st", () => {
		const ip = "10.0.0.1";
		const req = buildReq({ socket: { remoteAddress: ip } });
		const res = buildRes();
		const next = jest.fn();
		for (let i = 0; i < 30; i++) {
			mw.use(req, res, next);
		}
		expect(next).toHaveBeenCalledTimes(30);
		// 31st
		mw.use(req, res, next);
		expect(res.status).toHaveBeenCalledWith(429);
		expect(res.setHeader).toHaveBeenCalled();
		expect(next).toHaveBeenCalledTimes(30);
	});

	it("resets counter after window passes", () => {
		const ip = "10.0.0.2";
		const req = buildReq({ socket: { remoteAddress: ip } });
		const res = buildRes();
		const next = jest.fn();

		for (let i = 0; i < 30; i++) mw.use(req, res, next);

		// jump time forward past 60s window
		const realNow = Date.now;
		Date.now = () => realNow() + 70_000;
		mw.use(req, res, next);
		Date.now = realNow;
		expect(next).toHaveBeenCalledTimes(31);
	});
});
