/** Browser-facing API path that sum-shell reverse-proxies to Nest. */
export const SMART_ANKETA_SHELL_API_PROXY_PATH = "/proxy/smart-anketa-api";

const LOCAL_DEV_API_FALLBACK = "http://localhost:3000";

function trimSlash(value: string): string {
	return value.replace(/\/$/, "");
}

function hostnameOf(origin: string): string {
	try {
		return new URL(origin).hostname;
	} catch {
		return "";
	}
}

function isLocalHostname(hostname: string): boolean {
	return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * База HTTP/WS API Смарт-Анкеты.
 *
 * На стенде configMap из шела приходит пропсом, но в zustand попадает только
 * в useEffect — позже, чем Socket.IO уже успевает взять fallback
 * `http://localhost:3000` из webpack DefinePlugin. Поэтому:
 * 1) любой непустой SMART_ANKETA_API из конфига;
 * 2) на не-localhost origin — `/proxy/smart-anketa-api` того же origin;
 * 3) localhost / dev — baked REACT_APP_API_URL или :3000.
 */
export function resolveSmartAnketaApiBaseUrl(args: {
	fromConfig?: string | null;
	pageOrigin: string;
	isDev: boolean;
	bakedUrl?: string | null;
}): string {
	const fromConfig = trimSlash((args.fromConfig ?? "").trim());
	if (fromConfig) return fromConfig;

	const hostname = hostnameOf(args.pageOrigin);
	if (args.pageOrigin && !isLocalHostname(hostname)) {
		return `${trimSlash(args.pageOrigin)}${SMART_ANKETA_SHELL_API_PROXY_PATH}`;
	}

	const baked = trimSlash((args.bakedUrl ?? "").trim());
	if (baked) return baked;
	if (args.isDev) return LOCAL_DEV_API_FALLBACK;
	return LOCAL_DEV_API_FALLBACK;
}

/** Swagger UI Nest: `SwaggerModule.setup("api", ...)`. */
export function swaggerUiUrlFromApiBase(apiBase: string): string {
	return `${trimSlash(apiBase)}/api`;
}
