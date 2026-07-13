import {
	ensureKeycloakSession,
	refreshHostAccessToken,
	resolveFreshAccessToken,
} from "@react-client/common/auth/syncMfeAuth";
import {
	isGodModeAccessToken,
	isNoRolesGodMode,
} from "@react-client/common/auth/godMode";
import {
	publishAppSync,
	type AppQueryScope,
} from "@react-client/common/crossTab/appBroadcast";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import axios, {
	type AxiosError,
	type AxiosRequestConfig,
	type AxiosResponse,
} from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

const IS_DEV = process.env.NODE_ENV === "development";

const axiosInstance = axios.create({
	timeout: 10000,
	headers: {
		"Content-Type": "application/json",
	},
});

type RetriableAxiosConfig = AxiosRequestConfig & { _authRetry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

function mutationScopeForUrl(url?: string): AppQueryScope | null {
	if (!url) return null;
	if (url.includes("/v2/data-transfer")) return "v2-all";
	if (url.includes("/v2/templates") || url.includes("/v2/works")) {
		return "v2-templates";
	}
	if (url.includes("/v2/dictionaries")) return "v2-dictionaries";
	if (url.includes("/v2/questionnaires")) return "v2-questionnaires";
	if (url.includes("/kanban-board")) return "tracker";
	return null;
}

function queueTokenRefresh(): Promise<string | null> {
	if (!refreshPromise) {
		refreshPromise = refreshHostAccessToken().finally(() => {
			refreshPromise = null;
		});
	}
	return refreshPromise;
}

axiosInstance.interceptors.request.use(
	(config) => {
		const configMap = useGlobalSettingsStore.getState().configMap;

		config.baseURL = IS_DEV
			? API_BASE_URL
			: configMap?.SMART_ANKETA_API || API_BASE_URL;

		const token = resolveFreshAccessToken();
		if (token && (!isGodModeAccessToken(token) || isNoRolesGodMode())) {
			config.headers.Authorization = `Bearer ${token}`;
		}

		// FormData: убрать дефолтный application/json, иначе multer не видит файл
		if (typeof FormData !== "undefined" && config.data instanceof FormData) {
			const headers = config.headers;
			if (headers && typeof (headers as { delete?: (k: string) => void }).delete === "function") {
				(headers as { delete: (k: string) => void }).delete("Content-Type");
			} else if (headers && typeof headers === "object") {
				delete (headers as Record<string, unknown>)["Content-Type"];
			}
		}

		return config;
	},
	(error) => {
		return Promise.reject(error);
	},
);

axiosInstance.interceptors.response.use(
	(response: AxiosResponse) => {
		const method = response.config.method?.toLowerCase();
		if (method && !["get", "head", "options"].includes(method)) {
			const scope = mutationScopeForUrl(response.config.url);
			if (scope) {
				publishAppSync({ type: "query:invalidate", scope });
			}
		}
		return response;
	},
	async (error: AxiosError) => {
		const originalRequest = error.config as RetriableAxiosConfig | undefined;
		const status = error.response?.status;

		if (status !== 401 || !originalRequest || originalRequest._authRetry) {
			return Promise.reject(error);
		}

		if (isNoRolesGodMode()) {
			return Promise.reject(error);
		}

		originalRequest._authRetry = true;

		try {
			const nextToken = await queueTokenRefresh();
			if (!nextToken) {
				ensureKeycloakSession();
				return Promise.reject(error);
			}

			originalRequest.headers = {
				...originalRequest.headers,
				Authorization: `Bearer ${nextToken}`,
			};
			return axiosInstance(originalRequest);
		} catch (refreshError) {
			ensureKeycloakSession();
			return Promise.reject(refreshError);
		}
	},
);

export const apiClient = async <T>({
	url,
	method,
	params,
	data,
	headers,
	responseType,
	signal,
	timeout,
}: {
	url: string;
	method: string;
	params?: any;
	data?: any;
	headers?: any;
	responseType?: string;
	signal?: AbortSignal;
	timeout?: number;
}): Promise<T> => {
	const config: AxiosRequestConfig = {
		url,
		method: method as any,
		params,
		data,
		headers,
		responseType: responseType as any,
		signal,
		timeout,
	};

	const response = await axiosInstance(config);
	return response.data;
};

export default apiClient;
