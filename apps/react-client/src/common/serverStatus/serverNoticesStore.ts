import { create } from "zustand";
import { persist } from "zustand/middleware";

export const MAX_SERVER_NOTICES = 50;
export const SERVER_NOTICES_STORAGE_KEY = "smart-anketa:server-notices";

export type ServerNoticeKind =
	| "down"
	| "up"
	| "success"
	| "error"
	| "warning"
	| "info";

export type ServerNotice = {
	id: string;
	kind: ServerNoticeKind;
	title: string;
	detail: string | null;
	createdAt: string;
	read: boolean;
	/** Id тоста: повторный publish с тем же id обновляет запись, а не дублирует. */
	toastId?: string | number;
};

type ServerNoticesState = {
	notices: ServerNotice[];
	serverDown: boolean;
	drawerOpen: boolean;
	setDrawerOpen: (open: boolean) => void;
	markAllRead: () => void;
	clearNotices: () => void;
};

function noticeId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function capNotices(notices: ServerNotice[]): ServerNotice[] {
	return notices.length > MAX_SERVER_NOTICES
		? notices.slice(0, MAX_SERVER_NOTICES)
		: notices;
}

function pushNotice(
	notices: ServerNotice[],
	input: {
		kind: ServerNoticeKind;
		title: string;
		detail: string | null;
		toastId?: string | number;
	},
): ServerNotice[] {
	if (input.toastId !== undefined) {
		const index = notices.findIndex(
			(notice) => notice.toastId === input.toastId,
		);
		if (index !== -1) {
			const current = notices[index];
			const updated: ServerNotice = {
				...current,
				kind: input.kind,
				title: input.title || current.title,
				detail: input.detail,
				read: false,
			};
			return capNotices([
				updated,
				...notices.filter((_, i) => i !== index),
			]);
		}
	}
	const next: ServerNotice = {
		id: noticeId(),
		kind: input.kind,
		title: input.title,
		detail: input.detail,
		createdAt: new Date().toISOString(),
		read: false,
		...(input.toastId !== undefined ? { toastId: input.toastId } : {}),
	};
	return capNotices([next, ...notices]);
}

function toastNoticeKind(type: string | undefined): ServerNoticeKind {
	if (type === "success" || type === "error" || type === "warning") {
		return type;
	}
	return "info";
}

/** Копия тоста в панель. Сам тост на экране не закрывает. */
export function recordToastNotice(toast: {
	id: string | number;
	type?: string;
	title?: unknown;
	description?: unknown;
}): void {
	const title = typeof toast.title === "string" ? toast.title.trim() : "";
	const detail =
		typeof toast.description === "string" && toast.description.trim()
			? toast.description.trim()
			: null;
	const { notices } = useServerNoticesStore.getState();
	const existing = notices.some((notice) => notice.toastId === toast.id);
	if (!title && !existing) return;
	useServerNoticesStore.setState({
		notices: pushNotice(notices, {
			kind: toastNoticeKind(toast.type),
			title,
			detail,
			toastId: toast.id,
		}),
	});
}

export const useServerNoticesStore = create<ServerNoticesState>()(
	persist(
		(set) => ({
			notices: [],
			serverDown: false,
			drawerOpen: false,
			setDrawerOpen: (open) =>
				set((state) => ({
					drawerOpen: open,
					notices: open
						? state.notices.map((notice) =>
								notice.read ? notice : { ...notice, read: true },
							)
						: state.notices,
				})),
			markAllRead: () =>
				set((state) => ({
					notices: state.notices.map((notice) =>
						notice.read ? notice : { ...notice, read: true },
					),
				})),
			clearNotices: () => set({ notices: [] }),
		}),
		{
			name: SERVER_NOTICES_STORAGE_KEY,
			partialize: (state) => ({
				notices: state.notices,
				serverDown: state.serverDown,
			}),
			merge: (persisted, current) => {
				const raw = persisted as Partial<ServerNoticesState> | undefined;
				const notices = Array.isArray(raw?.notices)
					? capNotices(raw.notices)
					: current.notices;
				return {
					...current,
					...raw,
					notices,
					serverDown: Boolean(raw?.serverDown),
				};
			},
		},
	),
);

/** Переход «жив → мёртв»: одна запись, без спама на каждый упавший запрос. */
export function reportServerUnreachable(detail?: string): void {
	const { serverDown, notices } = useServerNoticesStore.getState();
	if (serverDown) return;
	useServerNoticesStore.setState({
		serverDown: true,
		notices: pushNotice(notices, {
			kind: "down",
			title: "Сервер недоступен",
			detail: detail?.trim() || null,
		}),
	});
}

/** Переход «мёртв → жив» после любого успешного ответа API / сокета. */
export function reportServerReachable(): void {
	const { serverDown, notices } = useServerNoticesStore.getState();
	if (!serverDown) return;
	useServerNoticesStore.setState({
		serverDown: false,
		notices: pushNotice(notices, {
			kind: "up",
			title: "Сервер снова доступен",
			detail: null,
		}),
	});
}
