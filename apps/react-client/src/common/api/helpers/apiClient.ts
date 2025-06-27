import axios, {
	type AxiosError,
	type AxiosRequestConfig,
	type AxiosResponse,
} from "axios";
import { useAuthStore } from "../../store/authStore";

const axiosInstance = axios.create({
	baseURL: process.env.REACT_APP_API_URL || "http://localhost:3000",
	timeout: 10000,
	headers: {
		"Content-Type": "application/json",
	},
});

axiosInstance.interceptors.request.use(
	(config) => {
		const token = useAuthStore.getState().accessToken;
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	},
);

axiosInstance.interceptors.response.use(
	(response: AxiosResponse) => response,
	(error: AxiosError) => {
		if (error.response?.status === 401) {
			useAuthStore.getState().setAccessToken(null);
		}
		return Promise.reject(error);
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
}: {
	url: string;
	method: string;
	params?: any;
	data?: any;
	headers?: any;
	responseType?: string;
	signal?: AbortSignal;
}): Promise<T> => {
	const config: AxiosRequestConfig = {
		url,
		method: method as any,
		params,
		data,
		headers,
		responseType: responseType as any,
		signal,
	};

	const response = await axiosInstance(config);
	return response.data;
};

export default apiClient;
