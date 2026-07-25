import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

type Listener = (open: boolean) => void;

let logoutOverlayOpen = false;
const listeners = new Set<Listener>();

/** Задержка перед реальным logout, чтобы оверлей успел отрисоваться. */
export const LOGOUT_OVERLAY_DELAY_MS = 2000;

/** Показать полноэкранный оверлей «Выход из системы…» до редиректа Keycloak. */
export function beginLogoutOverlay(): void {
	if (logoutOverlayOpen) return;
	flushSync(() => {
		logoutOverlayOpen = true;
		for (const listener of listeners) listener(true);
	});
}

export function useLogoutOverlayOpen(): boolean {
	const [open, setOpen] = useState(logoutOverlayOpen);
	useEffect(() => {
		const listener: Listener = (next) => setOpen(next);
		listeners.add(listener);
		setOpen(logoutOverlayOpen);
		return () => {
			listeners.delete(listener);
		};
	}, []);
	return open;
}
