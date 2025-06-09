import { useAuthStore } from "../store/authStore";

const API_BASE_URL = "http://localhost:3000";

export const useProtectedFetch = () => {
	const token = useAuthStore((state) => state.accessToken);

	return async <T = any>(
		url: string,
		options: RequestInit = {},
	): Promise<T> => {
		const res = await fetch(`${API_BASE_URL}${url}`, {
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
