import type { Socket } from "socket.io-client";

const REDACT_KEY =
	/^(token|authorization|accessToken|refreshToken|password|secret)$/i;

const SOCKET_EVENTS = [
	"connect",
	"disconnect",
	"connect_error",
	"error",
] as const;

const MANAGER_EVENTS = [
	"open",
	"close",
	"error",
	"ping",
	"packet",
	"reconnect",
	"reconnect_attempt",
	"reconnect_error",
	"reconnect_failed",
] as const;

const ENGINE_EVENTS = [
	"open",
	"close",
	"error",
	"packet",
	"packetCreate",
	"flush",
	"drain",
	"heartbeat",
	"handshake",
	"ping",
	"pong",
	"upgrade",
	"upgradeError",
] as const;

type EngineLike = {
	transport?: { name?: string };
	on: (event: string, listener: (...args: unknown[]) => void) => void;
};

const boundEngines = new WeakSet<object>();

const MAX_LOG_DEPTH = 3;
const MAX_LOG_KEYS = 24;
const MAX_LOG_ARRAY = 20;
const MAX_LOG_NODES = 80;

function ctorName(value: object): string {
	try {
		return value.constructor?.name || "Object";
	} catch {
		return "Object";
	}
}

function isPlainObjectOrArray(value: object): boolean {
	if (Array.isArray(value)) return true;
	try {
		const proto = Object.getPrototypeOf(value);
		return proto === Object.prototype || proto === null;
	} catch {
		return false;
	}
}

function errorSummary(value: object): { name?: string; message?: string } {
	const rec = value as { name?: string; message?: string };
	return { name: rec.name, message: rec.message };
}

function isErrorLike(value: object): boolean {
	try {
		const tag = Object.prototype.toString.call(value);
		if (tag === "[object Error]" || tag === "[object DOMException]") {
			return true;
		}
	} catch {
		return false;
	}
	const rec = value as { message?: unknown; stack?: unknown };
	return typeof rec.message === "string" && typeof rec.stack === "string";
}

function leafSummary(value: unknown): unknown {
	if (value === null || value === undefined) return value;
	const valueType = typeof value;
	if (
		valueType === "string" ||
		valueType === "number" ||
		valueType === "boolean" ||
		valueType === "bigint"
	) {
		return value;
	}
	if (valueType === "function") {
		return `[Function ${(value as { name?: string }).name || "anonymous"}]`;
	}
	if (valueType !== "object") return String(value);
	const obj = value as object;
	if (isErrorLike(obj)) return errorSummary(obj);
	return `[${ctorName(obj)}]`;
}

/** Итеративно: Engine.IO packet/socket циклические, рекурсия рвёт стек. */
export function sanitizeWsLogArg(value: unknown): unknown {
	try {
		if (value === null || typeof value !== "object") return leafSummary(value);
		const root = value as object;
		if (!isPlainObjectOrArray(root)) {
			return isErrorLike(root) ? errorSummary(root) : `[${ctorName(root)}]`;
		}

		const seen = new WeakMap<object, unknown>();
		const rootClone: unknown = Array.isArray(root) ? [] : {};
		seen.set(root, rootClone);
		const stack: Array<{
			src: object;
			dst: Record<string, unknown>;
			depth: number;
		}> = [{ src: root, dst: rootClone as Record<string, unknown>, depth: 0 }];
		let nodes = 0;

		while (stack.length > 0 && nodes < MAX_LOG_NODES) {
			const frame = stack.pop();
			if (!frame) break;
			nodes += 1;
			if (frame.depth >= MAX_LOG_DEPTH) continue;

			let keys: string[];
			try {
				keys = Array.isArray(frame.src)
					? Object.keys(frame.src).slice(0, MAX_LOG_ARRAY)
					: Object.keys(frame.src as Record<string, unknown>).slice(
							0,
							MAX_LOG_KEYS,
						);
			} catch {
				continue;
			}

			for (const key of keys) {
				let nested: unknown;
				try {
					nested = (frame.src as Record<string, unknown>)[key];
				} catch {
					frame.dst[key] = "[throw]";
					continue;
				}
				if (typeof nested === "function") continue;
				if (REDACT_KEY.test(key)) {
					frame.dst[key] = nested ? "[redacted]" : nested;
					continue;
				}
				if (nested === null || typeof nested !== "object") {
					frame.dst[key] = leafSummary(nested);
					continue;
				}
				const nestedObj = nested as object;
				if (seen.has(nestedObj)) {
					frame.dst[key] = "[Circular]";
					continue;
				}
				if (!isPlainObjectOrArray(nestedObj)) {
					frame.dst[key] = isErrorLike(nestedObj)
						? errorSummary(nestedObj)
						: `[${ctorName(nestedObj)}]`;
					continue;
				}
				if (frame.depth + 1 >= MAX_LOG_DEPTH) {
					frame.dst[key] = `[${ctorName(nestedObj)}]`;
					continue;
				}
				const child: unknown = Array.isArray(nestedObj) ? [] : {};
				seen.set(nestedObj, child);
				frame.dst[key] = child;
				stack.push({
					src: nestedObj,
					dst: child as Record<string, unknown>,
					depth: frame.depth + 1,
				});
			}
		}
		return rootClone;
	} catch {
		return "[unserializable]";
	}
}

function summarizeOpaqueArgs(args: unknown[]): unknown[] {
	return args.map((arg) => {
		if (arg === null || typeof arg !== "object") return leafSummary(arg);
		const rec = arg as Record<string, unknown>;
		const summary: Record<string, unknown> = { $: ctorName(arg) };
		if ("type" in rec) summary.type = rec.type;
		if ("nsp" in rec) summary.nsp = rec.nsp;
		if ("data" in rec) {
			const data = rec.data;
			if (data === null || typeof data !== "object") summary.data = data;
			else if (Array.isArray(data)) summary.data = `array(${data.length})`;
			else summary.data = `[${ctorName(data)}]`;
		}
		return summary;
	});
}

function logWs(namespace: string, phase: string, ...args: unknown[]): void {
	try {
		console.log(`[ws:${namespace}]`, phase, ...args.map(sanitizeWsLogArg));
	} catch {
		console.log(`[ws:${namespace}]`, phase, "[unserializable]");
	}
}

function transportName(client: Socket): string | undefined {
	return (client.io.engine as EngineLike | undefined)?.transport?.name;
}

function bindEngineLog(namespace: string, engine: object | undefined): void {
	if (!engine || boundEngines.has(engine)) return;
	boundEngines.add(engine);
	const typed = engine as EngineLike;
	for (const event of ENGINE_EVENTS) {
		typed.on(event, (...args: unknown[]) => {
			logWs(namespace, `engine:${event}`, ...summarizeOpaqueArgs(args));
		});
	}
}

export function logSocketIoAction(
	namespace: string,
	action: string,
	detail?: unknown,
): void {
	logWs(namespace, action, detail);
}

/** Полный лог Socket.IO + Engine.IO в консоли браузера (токен в auth маскируется). */
export function bindSocketIoDebugLog(client: Socket, namespace: string): void {
	logWs(namespace, "bind", {
		id: client.id ?? null,
		connected: client.connected,
		path: client.io.opts.path,
		transports: client.io.opts.transports,
	});

	for (const event of SOCKET_EVENTS) {
		client.on(event, (...args: unknown[]) => {
			logWs(namespace, event, {
				id: client.id ?? null,
				transport: transportName(client),
				args,
			});
		});
	}

	client.onAny((event, ...args) => {
		logWs(namespace, "←", event, ...args);
	});
	client.onAnyOutgoing((event, ...args) => {
		logWs(namespace, "→", event, ...args);
	});

	const manager = client.io;
	for (const event of MANAGER_EVENTS) {
		manager.on(event, (...args: unknown[]) => {
			logWs(namespace, `io:${event}`, ...summarizeOpaqueArgs(args));
		});
	}

	bindEngineLog(namespace, manager.engine);
	manager.on("open", () => {
		bindEngineLog(namespace, manager.engine);
		logWs(namespace, "io:open", {
			id: client.id ?? null,
			transport: transportName(client),
		});
	});
}
