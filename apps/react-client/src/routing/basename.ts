/**
 * Базовый путь MFE на host (например host.com/smartAnketa/...).
 * Без завершающего слэша — требование React Router.
 */
export const MFE_ROUTER_BASENAME = "/smartAnketa";

export function getRouterBasename(bridged?: boolean): string {
	return bridged ? MFE_ROUTER_BASENAME : "/";
}

/** Basename из текущего URL (для window.open вне React Router). */
export function getAppBasename(): string {
	const { pathname } = window.location;
	if (
		pathname === MFE_ROUTER_BASENAME ||
		pathname.startsWith(`${MFE_ROUTER_BASENAME}/`)
	) {
		return MFE_ROUTER_BASENAME;
	}
	return "/";
}

/** Абсолютный URL с учётом MFE basename (`/smartAnketa` на host). */
export function toAbsoluteAppUrl(path: string): string {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	const basename = getAppBasename();
	const prefix = basename === "/" ? "" : basename;
	return `${window.location.origin}${prefix}${normalizedPath}`;
}

/** host.com/smartAnketa → /smartAnketa/ (канонический URL для nginx/ассетов). */
export function normalizeMfeUrlIfNeeded(): void {
	const { pathname, search, hash } = window.location;
	if (pathname === MFE_ROUTER_BASENAME) {
		window.history.replaceState(null, "", `${MFE_ROUTER_BASENAME}/${search}${hash}`);
	}
}
