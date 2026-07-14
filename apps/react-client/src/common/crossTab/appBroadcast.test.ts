import { beforeEach, describe, expect, it, vi } from "vitest";

class FakeBroadcastChannel {
	static instance: FakeBroadcastChannel | null = null;
	posted: unknown[] = [];
	private listeners: Array<(event: MessageEvent<unknown>) => void> = [];

	constructor(public readonly name: string) {
		FakeBroadcastChannel.instance = this;
	}

	addEventListener(
		_type: "message",
		listener: (event: MessageEvent<unknown>) => void,
	) {
		this.listeners.push(listener);
	}

	postMessage(message: unknown) {
		this.posted.push(message);
	}

	emit(message: unknown) {
		for (const listener of this.listeners) {
			listener({ data: message } as MessageEvent<unknown>);
		}
	}
}

describe("appBroadcast", () => {
	beforeEach(() => {
		vi.resetModules();
		FakeBroadcastChannel.instance = null;
		const values = new Map<string, string>();
		vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);
		vi.stubGlobal("sessionStorage", {
			getItem: (key: string) => values.get(key) ?? null,
			setItem: (key: string, value: string) => values.set(key, value),
		});
	});

	it("publishes typed events without auth secrets", async () => {
		const { publishAppSync } = await import("./appBroadcast");
		publishAppSync({ type: "auth:logout", reason: "user" });

		const message = FakeBroadcastChannel.instance?.posted[0] as {
			event: Record<string, unknown>;
		};
		expect(message.event).toEqual({ type: "auth:logout", reason: "user" });
		expect(JSON.stringify(message)).not.toContain("token");
	});

	it("ignores malformed and same-tab messages", async () => {
		const { publishAppSync, subscribeAppSync } = await import("./appBroadcast");
		const listener = vi.fn();
		subscribeAppSync(listener);
		const channel = FakeBroadcastChannel.instance;
		publishAppSync({ type: "settings:theme", mode: "light" });
		const ownEnvelope = channel?.posted[0] as {
			sourceTabId: string;
		};

		channel?.emit({ nope: true });
		channel?.emit({
			sourceTabId: ownEnvelope.sourceTabId,
			sentAt: Date.now(),
			event: { type: "settings:theme", mode: "dark" },
		});
		expect(listener).not.toHaveBeenCalled();
	});

	it("delivers valid events from another tab once", async () => {
		const { subscribeAppSync } = await import("./appBroadcast");
		const listener = vi.fn();
		subscribeAppSync(listener);

		FakeBroadcastChannel.instance?.emit({
			sourceTabId: "other-tab",
			sentAt: Date.now(),
			event: {
				type: "query:invalidate",
				scope: "v2-questionnaires",
			},
		});

		expect(listener).toHaveBeenCalledOnce();
		expect(listener).toHaveBeenCalledWith({
			type: "query:invalidate",
			scope: "v2-questionnaires",
		});
	});
});
