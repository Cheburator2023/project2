import { CustomLogger } from "../../../../src/shared/services/logger.service";

/**
 * Unit-тесты CustomLogger.
 * Проверяем: уровни логирования, санитизацию чувствительных данных,
 * форматирование HTTP-логов, K8S-поля в production, обработку циклических объектов.
 */
describe("CustomLogger", () => {
	let logger: CustomLogger;
	let logSpy: jest.SpyInstance;

	beforeEach(() => {
		logger = new CustomLogger();
		logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		logSpy.mockRestore();
	});

	// Базовые уровни логирования
	it("emits INFO level via log()", () => {
		logger.log("hello", "ctx", { a: 1 });
		expect(logSpy).toHaveBeenCalled();
		const payload = JSON.parse(logSpy.mock.calls[0][0]);
		expect(payload.level).toBe("INFO");
		expect(payload.text).toBe("hello");
	});

	// ERROR должен содержать stack trace
	it("emits ERROR level with stack via error()", () => {
		logger.error("boom", "Error: x\n  at y", "ctx", { a: 1 });
		const payload = JSON.parse(logSpy.mock.calls[0][0]);
		expect(payload.level).toBe("ERROR");
		expect(payload.stack).toContain("Error: x");
	});

	// Проверяем все остальные уровни за один вызов
	it("emits WARN/DEBUG/VERBOSE levels", () => {
		logger.warn("w");
		logger.debug("d");
		logger.verbose("v");
		const levels = logSpy.mock.calls.map((c) => JSON.parse(c[0]).level);
		expect(levels).toEqual(["WARN", "DEBUG", "VERBOSE"]);
	});

	// Чувствительные поля (password, token) заменяются на *****
	it("sanitizes sensitive fields in additionalData", () => {
		logger.log("x", "ctx", { password: "secret", token: "t" });
		const payload = JSON.parse(logSpy.mock.calls[0][0]);
		expect(payload.password).toBe("*****");
		expect(payload.token).toBe("*****");
	});

	// JWT-подобные строки санитизируются даже в вложенных объектах
	it("sanitizes JWT-like tokens deep in the payload", () => {
		const jwt = "aaa.bbb.ccc";
		logger.log("x", "ctx", { nested: { something: jwt } });
		const payload = JSON.parse(logSpy.mock.calls[0][0]);
		expect(payload.nested.something).toBe("*****");
	});

	// httpLog: санитизация body и authorization-заголовка
	it("sanitizes request body for httpLog", () => {
		const req: any = {
			method: "POST",
			path: "/x",
			body: { password: "p", normal: 1 },
			headers: { authorization: "Bearer abc" },
			ip: "127.0.0.1",
		};
		const res: any = { statusCode: 200 };
		logger.httpLog(req, res, 1.5);
		const payload = JSON.parse(logSpy.mock.calls[0][0]);
		const body = JSON.parse(payload.requestBody);
		expect(body.password).toBe("*****");
		expect(payload.requestHeaders.authorization).toBe("*****");
	});

	// Остановка приложения не должна бросать исключение
	it("returns gracefully on shutdown", () => {
		expect(() => logger.onApplicationShutdown()).not.toThrow();
	});

	// В Kubernetes окружении добавляются поля namespace, pod, node
	it("includes K8S fields when NODE_ENV=production", () => {
		process.env.NODE_ENV = "production";
		process.env.KUBERNETES_NAMESPACE = "ns";
		process.env.POD_NAME = "pod-1";
		process.env.POD_IP = "1.2.3.4";
		process.env.NODE_NAME = "n-1";
		const k8sLogger = new CustomLogger();
		k8sLogger.log("hi");
		const payload = JSON.parse(logSpy.mock.calls[0][0]);
		expect(payload.envType).toBe("K8S");
		expect(payload.namespace).toBe("ns");
		delete process.env.NODE_ENV;
		delete process.env.KUBERNETES_NAMESPACE;
	});

	// Bearer-токен в заголовке санитизируется частично (Bearer *****)
	it("sanitizes Bearer token in authorization header", () => {
		const req: any = {
			method: "GET",
			path: "/x",
			body: { authorization: "Bearer XYZ" },
			headers: {},
			ip: "127.0.0.1",
		};
		logger.httpLog(req, { statusCode: 200 } as any, 0.1);
		const payload = JSON.parse(logSpy.mock.calls[0][0]);
		const body = JSON.parse(payload.requestBody);
		expect(body.authorization).toBe("Bearer *****");
	});

	// Не-Bearer authorization заменяется полностью *****
	it("sanitizes plain authorization value (non-Bearer)", () => {
		const req: any = {
			method: "GET",
			path: "/x",
			body: { authorization: "random-string" },
			headers: {},
			ip: "127.0.0.1",
		};
		logger.httpLog(req, { statusCode: 200 } as any, 0.1);
		const body = JSON.parse(JSON.parse(logSpy.mock.calls[0][0]).requestBody);
		expect(body.authorization).toBe("*****");
	});

	// Все секретные поля: password, refreshToken, jwt, x-access-token и др.
	it("sanitizes other secret-shaped fields (password, refreshToken, jwt)", () => {
		const req: any = {
			method: "GET",
			path: "/x",
			body: {
				password: "p",
				newPassword: "np",
				currentPassword: "cp",
				token: "t",
				accessToken: "at",
				refreshToken: "rt",
				jwt: "j",
			},
			headers: {
				"x-access-token": "x1",
				"x-refresh-token": "x2",
				authorization: "auth",
			},
			ip: "127.0.0.1",
		};
		logger.httpLog(req, { statusCode: 200 } as any, 0.1);
		const payload = JSON.parse(logSpy.mock.calls[0][0]);
		const body = JSON.parse(payload.requestBody);
		expect(body.password).toBe("*****");
		expect(body.newPassword).toBe("*****");
		expect(body.currentPassword).toBe("*****");
		expect(body.token).toBe("*****");
		expect(body.accessToken).toBe("*****");
		expect(body.refreshToken).toBe("*****");
		expect(body.jwt).toBe("*****");
		expect(payload.requestHeaders["x-access-token"]).toBe("*****");
		expect(payload.requestHeaders["x-refresh-token"]).toBe("*****");
	});

	// Отсутствие body — пустая строка вместо ошибки
	it("returns empty string for missing body in sanitizeBody", () => {
		const req: any = {
			method: "GET",
			path: "/x",
			body: undefined,
			headers: {},
			ip: "127.0.0.1",
		};
		logger.httpLog(req, { statusCode: 200 } as any, 0.1);
		const payload = JSON.parse(logSpy.mock.calls[0][0]);
		expect(payload.requestBody).toBe("");
	});

	// Циклический объект — плейсхолдер '[Non-serializable body]'
	it("falls back to '[Non-serializable body]' for un-stringifiable bodies", () => {
		const cyclic: any = {};
		cyclic.self = cyclic;
		const req: any = {
			method: "GET",
			path: "/x",
			body: cyclic,
			headers: {},
			ip: "127.0.0.1",
		};
		logger.httpLog(req, { statusCode: 200 } as any, 0.1);
		const payload = JSON.parse(logSpy.mock.calls[0][0]);
		expect(payload.requestBody).toBe("[Non-serializable body]");
	});

	// Пустые заголовки — пустой объект {}
	it("returns {} for empty headers in sanitizeHeaders", () => {
		const req: any = {
			method: "GET",
			path: "/x",
			body: {},
			headers: {},
			ip: "127.0.0.1",
		};
		logger.httpLog(req, { statusCode: 200 } as any, 0.1);
		const payload = JSON.parse(logSpy.mock.calls[0][0]);
		expect(payload.requestHeaders).toEqual({});
	});

	// x-request-id из заголовка пробрасывается в traceId
	it("uses x-request-id header when present in httpLog", () => {
		const req: any = {
			method: "GET",
			path: "/x",
			body: {},
			headers: { "x-request-id": "trace-1" },
			ip: "127.0.0.1",
		};
		logger.httpLog(req, { statusCode: 200 } as any, 0.1);
		const payload = JSON.parse(logSpy.mock.calls[0][0]);
		expect(payload.traceId).toBe("trace-1");
	});

	// Санитизация работает рекурсивно для вложенных массивов объектов
	it("sanitizes nested arrays of objects", () => {
		logger.log("x", "ctx", { items: [{ password: "p" }, { token: "t" }] });
		const payload = JSON.parse(logSpy.mock.calls[0][0]);
		expect(payload.items[0].password).toBe("*****");
		expect(payload.items[1].token).toBe("*****");
	});

	// Не-строковые значения (number, boolean) остаются без изменений
	it("preserves non-string scalar values", () => {
		logger.log("x", "ctx", { count: 5, flag: true });
		const payload = JSON.parse(logSpy.mock.calls[0][0]);
		expect(payload.count).toBe(5);
		expect(payload.flag).toBe(true);
	});
});
