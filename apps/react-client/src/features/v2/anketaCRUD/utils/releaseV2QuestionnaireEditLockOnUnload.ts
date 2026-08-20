import {
	isGodModeAccessToken,
	isNoRolesGodMode,
} from "@react-client/common/auth/godMode";
import { resolveFreshAccessToken } from "@react-client/common/auth/syncMfeAuth";
import { getSmartAnketaApiBaseUrl } from "@react-client/common/api/helpers/getSmartAnketaApiBaseUrl";

/**
 * Снятие edit-lock при закрытии вкладки/браузера.
 *
 * Axios/XHR на unload браузер отменяет.
 * Здесь: sendBeacon (предпочтительно) или fetch+keepalive на POST .../release?lockedByLabel=
 * без JSON/Authorization в god mode — без CORS-preflight.
 */
export function releaseV2QuestionnaireEditLockOnUnload(
	questionnaireId: string,
	lockedByLabel: string,
): void {
	const url =
		`${getSmartAnketaApiBaseUrl()}/v2/questionnaires/` +
		`${encodeURIComponent(questionnaireId)}/edit-lock/release` +
		`?lockedByLabel=${encodeURIComponent(lockedByLabel)}`;

	const token = resolveFreshAccessToken();
	const needsBearer =
		Boolean(token) &&
		!isNoRolesGodMode() &&
		!isGodModeAccessToken(token);

	// Без кастомных заголовков — sendBeacon надёжно уходит при закрытии вкладки.
	if (!needsBearer && typeof navigator.sendBeacon === "function") {
		try {
			if (navigator.sendBeacon(url)) return;
		} catch {
			// fallback на fetch
		}
	}

	const headers: Record<string, string> = {};
	if (needsBearer && token) {
		headers.Authorization = `Bearer ${token}`;
	}

	try {
		void fetch(url, {
			method: "POST",
			headers,
			keepalive: true,
			mode: "cors",
		});
	} catch {
		// ignore — TTL снимет lock
	}
}
