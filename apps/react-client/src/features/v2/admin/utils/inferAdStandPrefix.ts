/**
 * AD stand-prefix для Keycloak sync / matrix.
 * Если в hostname (Keycloak URL и/или текущая страница) есть `vtb` → `test_`,
 * иначе `dev_` (prod не используем).
 */
function hostnamesFrom(urlOrHost?: string | null): string[] {
	if (!urlOrHost?.trim()) return [];
	const raw = urlOrHost.trim();
	try {
		const withProtocol = /^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`;
		return [new URL(withProtocol).hostname.toLowerCase()];
	} catch {
		return [raw.toLowerCase()];
	}
}

export function inferAdStandPrefixFromUrl(url?: string | null): "test_" | "dev_" {
	const hosts = [
		...hostnamesFrom(url),
		...(typeof window !== "undefined"
			? [window.location.hostname.toLowerCase()]
			: []),
	];
	return hosts.some((h) => h.includes("vtb")) ? "test_" : "dev_";
}
