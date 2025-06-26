import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { useAuthStore } from "../store/authStore";

export const useProtectedFetch = () => {
	const token = useAuthStore((state) => state.accessToken);
	const { configMap } = useGlobalSettingsStore();

	return async <T = any>(
		url: string,
		options: RequestInit = {},
	): Promise<T> => {
		const res = await fetch(`${configMap?.SMART_ANKETA_API}${url}`, {
			...options,
			headers: {
				"Content-Type": "application/json",
				...(token && { Authorization: `Bearer ${token}` }),
				...options.headers,
			},
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Ошибка запроса: ${res.status} ${text}`);
		}

		return res.json();
	};
};
