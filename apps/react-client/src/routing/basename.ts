/**
 * Базовый путь MFE на host (например host.com/smartAnketa/...).
 * Без завершающего слэша — требование React Router.
 */
export const MFE_ROUTER_BASENAME = "/smartAnketa";

export function getRouterBasename(bridged?: boolean): string {
	return bridged ? MFE_ROUTER_BASENAME : "/";
}

/** host.com/smartAnketa → /smartAnketa/ (канонический URL для nginx/ассетов). */
export function normalizeMfeUrlIfNeeded(): void {
	const { pathname, search, hash } = window.location;
	if (pathname === MFE_ROUTER_BASENAME) {
		window.history.replaceState(null, "", `${MFE_ROUTER_BASENAME}/${search}${hash}`);
	}
}
