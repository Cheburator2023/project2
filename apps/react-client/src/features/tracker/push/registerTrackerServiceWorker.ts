import { isDevLikeEnvironment } from "@react-client/common/constants/dev";

const TRACKER_SW_URL = "/tracker-sw.js";
const TRACKER_SW_SCOPE = "/";

export async function registerTrackerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (typeof window === "undefined") return null;
	if (!isDevLikeEnvironment()) return null;
	if (!("serviceWorker" in navigator)) return null;
	try {
		return await navigator.serviceWorker.register(TRACKER_SW_URL, {
			scope: TRACKER_SW_SCOPE,
		});
	} catch {
		return null;
	}
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(base64);
	const output = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i += 1) {
		output[i] = raw.charCodeAt(i);
	}
	return output;
}

export function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.length; i += 1) {
		binary += String.fromCharCode(bytes[i]!);
	}
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
