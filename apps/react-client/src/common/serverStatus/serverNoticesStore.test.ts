import { beforeEach, describe, expect, it, vi } from "vitest";

const memory = vi.hoisted(() => {
	const store = new Map<string, string>();
	return {
		store,
		mock: {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => {
				store.set(key, value);
			},
			removeItem: (key: string) => {
				store.delete(key);
			},
			clear: () => {
				store.clear();
			},
		},
	};
});

vi.stubGlobal("localStorage", memory.mock);

import { toast } from "@react-client/common/toasts";
import { ToastState } from "@react-client/common/toasts/state";
import {
	MAX_SERVER_NOTICES,
	recordToastNotice,
	reportServerReachable,
	reportServerUnreachable,
	useServerNoticesStore,
} from "./serverNoticesStore";

describe("serverNoticesStore", () => {
	beforeEach(() => {
		memory.mock.clear();
		useServerNoticesStore.setState({
			notices: [],
			serverDown: false,
			drawerOpen: false,
		});
	});

	it("records one outage notice instead of one per failed endpoint", () => {
		reportServerUnreachable("HTTP 502");
		reportServerUnreachable("Нет ответа API");

		const { notices, serverDown } = useServerNoticesStore.getState();
		expect(serverDown).toBe(true);
		expect(notices).toHaveLength(1);
		expect(notices[0]).toMatchObject({
			kind: "down",
			title: "Сервер недоступен",
			detail: "HTTP 502",
			read: false,
		});
	});

	it("records recovery only after a previous outage", () => {
		reportServerReachable();
		expect(useServerNoticesStore.getState().notices).toHaveLength(0);

		reportServerUnreachable("WebSocket: transport close");
		reportServerReachable();

		const { notices, serverDown } = useServerNoticesStore.getState();
		expect(serverDown).toBe(false);
		expect(notices.map((item) => item.kind)).toEqual(["up", "down"]);
	});

	it("does not dismiss the live toast when copying it into the drawer", () => {
		const id = toast.success("Сохранено", { description: "Версия v3" });
		recordToastNotice({
			id,
			type: "success",
			title: "Сохранено",
			description: "Версия v3",
		});

		expect(ToastState.toasts.some((item) => item.id === id)).toBe(true);
		expect(useServerNoticesStore.getState().notices[0]).toMatchObject({
			kind: "success",
			title: "Сохранено",
			detail: "Версия v3",
			toastId: id,
		});
	});

	it("replaces a toast with the same id so a promise result does not stack a second row", () => {
		recordToastNotice({
			id: "job-1",
			type: "info",
			title: "Экспорт…",
		});
		recordToastNotice({
			id: "job-1",
			type: "success",
			title: "Экспорт готов",
			description: "файл.xlsx",
		});

		const { notices } = useServerNoticesStore.getState();
		expect(notices).toHaveLength(1);
		expect(notices[0]).toMatchObject({
			kind: "success",
			title: "Экспорт готов",
			detail: "файл.xlsx",
			toastId: "job-1",
		});
	});

	it("drops the oldest notices after 50 so localStorage stays bounded", () => {
		useServerNoticesStore.setState({ serverDown: false, notices: [] });
		for (let i = 0; i < MAX_SERVER_NOTICES + 3; i += 1) {
			useServerNoticesStore.setState({ serverDown: false });
			reportServerUnreachable(`wave-${i}`);
			reportServerReachable();
		}

		const { notices } = useServerNoticesStore.getState();
		expect(notices.length).toBe(MAX_SERVER_NOTICES);
		expect(notices[0]?.kind).toBe("up");
		expect(notices.some((item) => item.detail === "wave-0")).toBe(false);
	});
});
