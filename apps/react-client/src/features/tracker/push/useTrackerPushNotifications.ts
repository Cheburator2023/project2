import { useCallback, useEffect, useState } from "react";
import { isDevLikeEnvironment } from "@react-client/common/constants/dev";
import { toast } from "@react-client/common/toasts";
import {
	kanbanBoardDeletePushSubscription,
	kanbanBoardGetPushVapidPublicKey,
	kanbanBoardUpsertPushSubscription,
} from "@react-client/common/api/queries/kanban-board";
import {
	arrayBufferToBase64Url,
	registerTrackerServiceWorker,
	urlBase64ToUint8Array,
} from "./registerTrackerServiceWorker";

export type TrackerPushStatus =
	| "unsupported"
	| "no-identity"
	| "denied"
	| "default"
	| "subscribed"
	| "unsubscribed";

function permissionToStatus(
	permission: NotificationPermission,
	hasSubscription: boolean,
): TrackerPushStatus {
	if (permission === "denied") return "denied";
	if (permission === "granted" && hasSubscription) return "subscribed";
	if (permission === "granted") return "unsubscribed";
	return "default";
}

export function useTrackerPushNotifications(assigneeName: string) {
	const [status, setStatus] = useState<TrackerPushStatus>(() =>
		isDevLikeEnvironment() ? "default" : "unsupported",
	);
	const [busy, setBusy] = useState(false);
	const identity = assigneeName.trim();
	const allowed = isDevLikeEnvironment();

	const refresh = useCallback(async () => {
		if (typeof window === "undefined") return;
		if (!isDevLikeEnvironment()) {
			setStatus("unsupported");
			return;
		}
		if (
			!("serviceWorker" in navigator) ||
			!("PushManager" in window) ||
			!("Notification" in window)
		) {
			setStatus("unsupported");
			return;
		}
		if (!identity) {
			setStatus("no-identity");
			return;
		}
		const registration = await registerTrackerServiceWorker();
		if (!registration) {
			setStatus("unsupported");
			return;
		}
		const subscription = await registration.pushManager.getSubscription();
		setStatus(permissionToStatus(Notification.permission, Boolean(subscription)));
	}, [identity]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const enable = useCallback(async () => {
		if (busy) return;
		if (!isDevLikeEnvironment()) {
			setStatus("unsupported");
			toast.error("Уведомления доступны только в dev/test");
			return;
		}
		if (!identity) {
			toast.error("Сначала выберите себя в трекере (исполнитель)");
			return;
		}
		if (
			!("serviceWorker" in navigator) ||
			!("PushManager" in window) ||
			!("Notification" in window)
		) {
			toast.error("Браузер не поддерживает Web Push");
			setStatus("unsupported");
			return;
		}

		setBusy(true);
		try {
			const permission = await Notification.requestPermission();
			if (permission !== "granted") {
				setStatus(permission === "denied" ? "denied" : "default");
				toast.error(
					permission === "denied"
						? "Уведомления запрещены в настройках браузера"
						: "Разрешение на уведомления не получено",
				);
				return;
			}

			const registration = await registerTrackerServiceWorker();
			if (!registration) {
				toast.error("Не удалось зарегистрировать service worker");
				setStatus("unsupported");
				return;
			}
			await navigator.serviceWorker.ready;

			const { publicKey } = await kanbanBoardGetPushVapidPublicKey();
			if (!publicKey) {
				toast.error("Сервер не отдал VAPID-ключ");
				return;
			}

			// Always resubscribe with the current VAPID key — stale endpoints
			// from a previous nest process / key rotation cannot be decrypted.
			const existing = await registration.pushManager.getSubscription();
			if (existing) {
				try {
					await kanbanBoardDeletePushSubscription(existing.endpoint);
				} catch {
					/* server may not know this endpoint yet */
				}
				await existing.unsubscribe();
			}
			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(
					publicKey,
				) as BufferSource,
			});

			const json = subscription.toJSON();
			const endpoint = json.endpoint ?? subscription.endpoint;
			const p256dh = json.keys?.p256dh;
			const auth = json.keys?.auth;
			if (!endpoint || !p256dh || !auth) {
				const keys = subscription.getKey
					? {
							p256dh: subscription.getKey("p256dh"),
							auth: subscription.getKey("auth"),
						}
					: { p256dh: null, auth: null };
				const fallbackP256dh = keys.p256dh
					? arrayBufferToBase64Url(keys.p256dh)
					: "";
				const fallbackAuth = keys.auth
					? arrayBufferToBase64Url(keys.auth)
					: "";
				if (!endpoint || !fallbackP256dh || !fallbackAuth) {
					toast.error("Браузер не вернул ключи подписки");
					return;
				}
				await kanbanBoardUpsertPushSubscription({
					endpoint,
					p256dh: fallbackP256dh,
					auth: fallbackAuth,
					assigneeName: identity,
				});
			} else {
				await kanbanBoardUpsertPushSubscription({
					endpoint,
					p256dh,
					auth,
					assigneeName: identity,
				});
			}

			setStatus("subscribed");
			toast.success("Уведомления включены");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Не удалось включить уведомления",
			);
		} finally {
			setBusy(false);
			void refresh();
		}
	}, [busy, identity, refresh]);

	const disable = useCallback(async () => {
		if (busy) return;
		if (!isDevLikeEnvironment()) {
			setStatus("unsupported");
			return;
		}
		setBusy(true);
		try {
			const registration = await registerTrackerServiceWorker();
			const subscription = await registration?.pushManager.getSubscription();
			if (subscription) {
				try {
					await kanbanBoardDeletePushSubscription(subscription.endpoint);
				} catch {
					/* still unsubscribe locally */
				}
				await subscription.unsubscribe();
			}
			setStatus("unsubscribed");
			toast.success("Уведомления выключены");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Не удалось выключить уведомления",
			);
		} finally {
			setBusy(false);
			void refresh();
		}
	}, [busy, refresh]);

	const toggle = useCallback(async () => {
		if (status === "subscribed") {
			await disable();
			return;
		}
		await enable();
	}, [disable, enable, status]);

	return {
		status,
		busy,
		allowed,
		supported: allowed && status !== "unsupported",
		enabled: allowed && status === "subscribed",
		enable,
		disable,
		toggle,
		refresh,
	};
}
