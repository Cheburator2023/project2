import { V2_EDIT_LOCK_WS_NAMESPACE } from "@smart-anketa/api-contract";

export type V2EditLockSocketTarget = {
	/** origin + namespace Socket.IO (`/v2-edit-locks`), без префикса HTTP API. */
	uri: string;
	/** Engine.IO path: `/socket.io` или `{apiPrefix}/socket.io` за reverse-proxy. */
	path: string;
};

/**
 * HTTP API часто лежит за префиксом (`/proxy/smart-anketa-api`), а namespace
 * Socket.IO — нет. Иначе клиент подключается к `/proxy/.../v2-edit-locks`.
 */
export function resolveV2EditLockSocketTarget(
	apiBaseUrl: string,
	pageOrigin: string,
): V2EditLockSocketTarget {
	const trimmed = apiBaseUrl.trim().replace(/\/$/, "");
	const url = new URL(trimmed || pageOrigin, pageOrigin);
	const prefix = url.pathname.replace(/\/$/, "");
	const enginePath = `${prefix}/socket.io`.replace(/\/{2,}/g, "/");
	return {
		uri: `${url.origin}${V2_EDIT_LOCK_WS_NAMESPACE}`,
		path: enginePath.startsWith("/") ? enginePath : `/${enginePath}`,
	};
}
