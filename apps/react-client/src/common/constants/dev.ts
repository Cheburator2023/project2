export const IS_DEV = process.env.NODE_ENV === "development";

export function isDevLikeEnvironment(): boolean {
	if (IS_DEV) return true;
	if (typeof window === "undefined") return false;
	return window.location.hostname.toLowerCase().includes("dev");
}
