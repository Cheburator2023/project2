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

const MAX_LOG_DEPTH = 5;
const MAX_LOG_KEYS = 40;
const MAX_LOG_ARRAY = 50;
const SKIP_CTOR =
	/^(Socket|Manager|Engine|Transport|Polling|WS|WebSocket|XMLHttpRequest|Emitter|Window|Document|HTML|SVG|Node|EventTarget|Event)/;

function ctorName(value: object): string {
	try {
		return value.constructor?.name || "Object";
	} catch {
		return "Object";
	}
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

function sanitizeWsLogArgDeep(
	value: unknown,
	seen: WeakSet<object>,
	depth: number,
): unknown {
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
	if (seen.has(obj)) return "[Circular]";
	if (depth >= MAX_LOG_DEPTH) return `[${ctorName(obj)}]`;

	if (isErrorLike(obj)) {
		const err = obj as { name?: string; message?: string; stack?: string };
		return { name: err.name, message: err.message, stack: err.stack };
	}

	try {
		if (Object.prototype.toString.call(obj) === "[object Date]") {
			return (obj as Date).toISOString();
		}
	} catch {
		return `[${ctorName(obj)}]`;
	}

	if (SKIP_CTOR.test(ctorName(obj)) && !Array.isArray(obj)) {
		return `[${ctorName(obj)}]`;
	}

	seen.add(obj);

	if (Array.isArray(obj)) {
		const sliced = obj.slice(0, MAX_LOG_ARRAY);
		const mapped = sliced.map((item) =>
			sanitizeWsLogArgDeep(item, seen, depth + 1),
		);
		if (obj.length > MAX_LOG_ARRAY) {
			mapped.push(`[+${obj.length - MAX_LOG_ARRAY} more]`);
		}
		return mapped;
	}

	const out: Record<string, unknown> = {};
	let entries: [string, unknown][];
	try {
		entries = Object.entries(obj as Record<string, unknown>);
	} catch {
		return `[${ctorName(obj)}]`;
	}
	const limited = entries.slice(0, MAX_LOG_KEYS);
	for (const [key, nested] of limited) {
		if (typeof nested === "function") continue;
		out[key] = REDACT_KEY.test(key)
			? nested
				? "[redacted]"
				: nested
			: sanitizeWsLogArgDeep(nested, seen, depth + 1);
	}
	if (entries.length > MAX_LOG_KEYS) {
		out["…"] = `+${entries.length - MAX_LOG_KEYS} keys`;
	}
	return out;
}

export function sanitizeWsLogArg(value: unknown): unknown {
	return sanitizeWsLogArgDeep(value, new WeakSet(), 0);
}

function logWs(namespace: string, phase: string, ...args: unknown[]): void {
	try {
		console.log(`[ws:${namespace}]`, phase, ...args.map(sanitizeWsLogArg));
	} catch (error) {
		console.log(`[ws:${namespace}]`, phase, "[unserializable]", error);
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
			logWs(namespace, `engine:${event}`, ...args);
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
			logWs(namespace, `io:${event}`, ...args);
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
