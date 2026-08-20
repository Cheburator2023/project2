import {
	performMfeLogout,
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
import { getSmartAnketaApiBaseUrl } from "@react-client/common/api/helpers/getSmartAnketaApiBaseUrl";
import axios, {
	type AxiosError,
	type AxiosRequestConfig,
	type AxiosResponse,
} from "axios";
import { queryClient } from "../queryClient";
import {
	invalidateV2QuestionnaireRegistry,
	shouldInvalidateV2QuestionnaireRegistry,
} from "../queries/v2-questionnaire-registry-cache";
import {
	describeServerUnreachable,
	isServerUnreachableError,
} from "@react-client/common/serverStatus/isServerUnreachableError";
import {
	reportServerReachable,
	reportServerUnreachable,
} from "@react-client/common/serverStatus/serverNoticesStore";

/** Базовый таймаут для GET и лёгких запросов */
export const API_DEFAULT_TIMEOUT_MS = 63_000;
/** Создание и клонирование сущностей (версии схем, шаблоны, анкеты, работы) */
export const API_ENTITY_CREATE_TIMEOUT_MS = 120_000;
/** Тяжёлые операции (импорт, экспорт, data-transfer) */
export const API_HEAVY_OPERATION_TIMEOUT_MS = 120_000;
/** Заводская схема: seed 73 работ + reconcile полей (может занимать несколько минут) */
export const API_FACTORY_SCHEMA_TIMEOUT_MS = 600_000;
/** Реестр v2: выгрузка всех анкет в XLSX (стриминг на сервере, на клиенте ждём файл) */
export const API_REGISTRY_EXPORT_TIMEOUT_MS = 600_000;

const axiosInstance = axios.create({
	timeout: API_DEFAULT_TIMEOUT_MS,
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

/** Внутренние/фоновые мутации не должны триггерить cross-tab refetch всего v2. */
function shouldPublishMutationSync(url?: string, method?: string): boolean {
	if (!url) return false;
	// POST как read/query — не меняют серверное состояние, invalidation → бесконечный refetch.
	if (url.includes("/schema-field-sync")) return false;
	if (url.includes("/preview")) return false;
	if (url.includes("/calculate")) return false;
	if (url.includes("/dictionaries/json/bulk")) return false;
	if (url.includes("/lock") || url.includes("/renew")) return false;
	// dry-run импорта реестра не меняет данные
	if (
		url.includes("/import-master-registry") &&
		!/[?&]dryRun=(false|0)(?:&|$)/.test(url)
	) {
		return false;
	}
	// Автосейв анкеты: список обновляют create/copy/delete/hold и WS registry:sync.
	if (url.includes("/v2/questionnaires")) {
		return shouldInvalidateV2QuestionnaireRegistry(url, method);
	}
	return mutationScopeForUrl(url) !== null;
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
		config.baseURL = getSmartAnketaApiBaseUrl();

		const token = resolveFreshAccessToken();
		if (token && (!isGodModeAccessToken(token) || isNoRolesGodMode())) {
			config.headers.Authorization = `Bearer ${token}`;
		}

		// FormData: убрать дефолтный application/json, иначе multer не видит файл
		if (typeof FormData !== "undefined" && config.data instanceof FormData) {
			const headers = config.headers;
			if (
				headers &&
				typeof (headers as { delete?: (k: string) => void }).delete ===
					"function"
			) {
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
		reportServerReachable();
		const method = response.config.method?.toLowerCase();
		if (method && !["get", "head", "options"].includes(method)) {
			const url = response.config.url;
			if (shouldInvalidateV2QuestionnaireRegistry(url, method)) {
				invalidateV2QuestionnaireRegistry(queryClient);
			}
			if (shouldPublishMutationSync(url, method)) {
				const scope = mutationScopeForUrl(url);
				if (scope) {
					publishAppSync({ type: "query:invalidate", scope });
				}
			}
		}
		return response;
	},
	async (error: AxiosError) => {
		if (isServerUnreachableError(error)) {
			reportServerUnreachable(describeServerUnreachable(error));
		}
		const originalRequest = error.config as RetriableAxiosConfig | undefined;
		const status = error.response?.status;

		if (status !== 401 || !originalRequest) {
			return Promise.reject(error);
		}

		if (originalRequest._authRetry) {
			performMfeLogout();
			return Promise.reject(error);
		}

		if (isNoRolesGodMode()) {
			return Promise.reject(error);
		}

		originalRequest._authRetry = true;

		try {
			const nextToken = await queueTokenRefresh();
			if (!nextToken) {
				performMfeLogout();
				return Promise.reject(error);
			}

			originalRequest.headers = {
				...originalRequest.headers,
				Authorization: `Bearer ${nextToken}`,
			};
			return axiosInstance(originalRequest);
		} catch (refreshError) {
			performMfeLogout();
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
		timeout: timeout ?? API_DEFAULT_TIMEOUT_MS,
	};

	const response = await axiosInstance(config);
	return response.data;
};

export default apiClient;
