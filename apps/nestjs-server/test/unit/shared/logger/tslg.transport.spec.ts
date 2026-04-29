import { TSLGTransport } from "../../../../src/shared/logger/tslg.transport";

const baseOpts = {
	host: "h",
	port: 1,
	appName: "a",
	projectCode: "p",
	risCode: "r",
	appType: "t",
	envType: "DEV",
	tslgClientVersion: "v",
	reconnectionDelay: 10,
	connectionTTL: 50,
};

describe("TSLGTransport (non-production)", () => {
	let logSpy: jest.SpyInstance;

	beforeEach(() => {
		process.env.NODE_ENV = "test";
		logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		logSpy.mockRestore();
	});

	it("logs as STUB when not in production", () => {
		const t = new TSLGTransport(baseOpts);
		t.log("INFO", "msg", "ctx", { password: "secret" }, "stack");
		expect(logSpy).toHaveBeenCalled();
		const payload = JSON.parse(logSpy.mock.calls[0][0]);
		expect(payload.message).toBe("[TSLG STUB] msg");
	});

	it("close() is a no-op outside production", () => {
		const t = new TSLGTransport(baseOpts);
		expect(() => t.close()).not.toThrow();
	});
});

describe("TSLGTransport (production)", () => {
	let mockSocket: any;
	let createConnection: jest.Mock;

	beforeEach(() => {
		process.env.NODE_ENV = "production";
		mockSocket = {
			handlers: new Map<string, Function>(),
			on(this: any, ev: string, cb: Function) {
				this.handlers.set(ev, cb);
				return this;
			},
			write: jest.fn(),
			destroy: jest.fn(),
			writable: true,
		};
		createConnection = jest.fn((_opts: any, onConnect: () => void) => {
			setTimeout(onConnect, 0);
			return mockSocket;
		});
		jest
			.spyOn(require("net"), "createConnection")
			.mockImplementation(createConnection as any);
	});

	afterEach(() => {
		process.env.NODE_ENV = "test";
		jest.restoreAllMocks();
	});

	it("connects on construction and writes log entries", async () => {
		const t = new TSLGTransport(baseOpts);
		await new Promise((r) => setTimeout(r, 5));
		t.log("info", "hello", "C", { token: "X" }, "stack 1\n  at y");
		expect(mockSocket.write).toHaveBeenCalled();
		const written = mockSocket.write.mock.calls[0][0];
		const payload = JSON.parse(written.trim());
		expect(payload.level).toBe("INFO");
		expect(payload.text).toBe("hello");
		expect(payload.token).toBe("*****");
		expect(payload.stack).toBeDefined();
	});

	it("reconnects on socket error", async () => {
		const t = new TSLGTransport(baseOpts);
		await new Promise((r) => setTimeout(r, 5));
		const firstCalls = createConnection.mock.calls.length;
		mockSocket.handlers.get("error")!(new Error("x"));
		await new Promise((r) => setTimeout(r, 30));
		expect(createConnection.mock.calls.length).toBeGreaterThan(firstCalls);
		t.close();
	});

	it("reconnects on socket close", async () => {
		const t = new TSLGTransport(baseOpts);
		await new Promise((r) => setTimeout(r, 5));
		const firstCalls = createConnection.mock.calls.length;
		mockSocket.handlers.get("close")!();
		await new Promise((r) => setTimeout(r, 30));
		expect(createConnection.mock.calls.length).toBeGreaterThan(firstCalls);
		t.close();
	});

	it("recreates socket when TTL expired before write", async () => {
		const t = new TSLGTransport({ ...baseOpts, connectionTTL: 0 });
		await new Promise((r) => setTimeout(r, 5));
		const calls0 = createConnection.mock.calls.length;
		t.log("info", "msg");
		expect(mockSocket.destroy).toHaveBeenCalled();
		expect(createConnection.mock.calls.length).toBeGreaterThan(calls0);
		t.close();
	});

	it("does nothing when socket not writable", async () => {
		mockSocket.writable = false;
		const t = new TSLGTransport(baseOpts);
		await new Promise((r) => setTimeout(r, 5));
		t.log("info", "msg");
		expect(mockSocket.write).not.toHaveBeenCalled();
		t.close();
	});

	it("includes K8S fields when envType=K8S", async () => {
		const t = new TSLGTransport({ ...baseOpts, envType: "K8S" });
		await new Promise((r) => setTimeout(r, 5));
		process.env.POD_IP = "1.1.1.1";
		t.log("info", "msg");
		const payload = JSON.parse(mockSocket.write.mock.calls[0][0].trim());
		expect(payload.tec.podIp).toBe("1.1.1.1");
		t.close();
	});

	it("close() destroys socket and clears reconnect timer", async () => {
		const t = new TSLGTransport(baseOpts);
		await new Promise((r) => setTimeout(r, 5));
		mockSocket.handlers.get("close")!();
		t.close();
		expect(mockSocket.destroy).toHaveBeenCalled();
	});
});
