/** Текущая ветка UI: v1 или v2 (по префиксу URL). */
export const useAppVersion = (): "v1" | "v2" => {
	if (typeof window === "undefined") return "v2";
	const match = window.location.pathname.match(/^\/(v\d+)/i);
	return match?.[1]?.toLowerCase() === "v1" ? "v1" : "v2";
};
