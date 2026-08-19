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

export function sanitizeWsLogArg(value: unknown): unknown {
	if (value instanceof Error) {
		return {
			name: value.name,
			message: value.message,
			stack: value.stack,
		};
	}
	if (typeof value !== "object" || value === null) return value;
	if (Array.isArray(value)) return value.map(sanitizeWsLogArg);
	const out: Record<string, unknown> = {};
	for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
		out[key] = REDACT_KEY.test(key)
			? nested
				? "[redacted]"
				: nested
			: sanitizeWsLogArg(nested);
	}
	return out;
}

function logWs(namespace: string, phase: string, ...args: unknown[]): void {
	console.log(`[ws:${namespace}]`, phase, ...args.map(sanitizeWsLogArg));
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
		nsp: client.nsp,
		connected: client.connected,
		uri: client.io.uri,
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
