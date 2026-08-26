import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { resolveSmartAnketaApiBaseUrl } from "./resolveSmartAnketaApiBaseUrl";

const IS_DEV = process.env.NODE_ENV === "development";
const BAKED_URL = process.env.REACT_APP_API_URL || "";

function resolveFromRuntime(fromStore?: string): string {
	const fromWindow =
		typeof window !== "undefined" ? window.urlConfig?.SMART_ANKETA_API : undefined;
	const pageOrigin =
		typeof window !== "undefined"
			? window.location.origin
			: "http://localhost:8004";
	return resolveSmartAnketaApiBaseUrl({
		fromConfig: fromStore || fromWindow,
		pageOrigin,
		isDev: IS_DEV,
		bakedUrl: BAKED_URL,
	});
}

/** Runtime-база API: zustand / window.urlConfig хоста, иначе proxy-path стенда. */
export function getSmartAnketaApiBaseUrl(): string {
	return resolveFromRuntime(
		useGlobalSettingsStore.getState().configMap?.SMART_ANKETA_API,
	);
}

/** Подписка на configMap, чтобы iframe Swagger не остался на localhost до прихода конфига шела. */
export function useSmartAnketaApiBaseUrl(): string {
	const fromStore = useGlobalSettingsStore((s) => s.configMap?.SMART_ANKETA_API);
	return resolveFromRuntime(fromStore);
}
