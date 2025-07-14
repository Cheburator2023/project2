import type { UseQueryOptions } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";

export const customQueryOptions = <TData, TError, TQueryFnData>(
	options: Partial<UseQueryOptions<TData, TError, TQueryFnData>> = {},
): UseQueryOptions<TData, TError, TQueryFnData> => {
	const isAuthenticated = !!useAuthStore.getState().accessToken;

	return {
		...options,
		enabled: isAuthenticated && (options.enabled ?? true),
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		retry: (failureCount, error: any) => {
			if (error?.response?.status >= 400 && error?.response?.status < 500) {
				if (
					error?.response?.status === 408 ||
					error?.response?.status === 429
				) {
					return failureCount < 3;
				}
				return false;
			}
			return failureCount < 3;
		},
	} as UseQueryOptions<TData, TError, TQueryFnData>;
};
