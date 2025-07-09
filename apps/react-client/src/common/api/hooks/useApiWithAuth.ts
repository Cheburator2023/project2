import type {
	UseMutationOptions,
	UseQueryOptions,
} from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";

export const useApiWithAuth = <TData, TError, TQueryFnData>(
	options: Partial<UseQueryOptions<TData, TError, TQueryFnData>> = {},
): UseQueryOptions<TData, TError, TQueryFnData> => {
	const accessToken = useAuthStore((state) => state.accessToken);

	return {
		...options,
		enabled: !!accessToken && (options.enabled ?? true),
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	} as UseQueryOptions<TData, TError, TQueryFnData>;
};

export const useMutationWithAuth = <TData, TError, TVariables>(
	options: Partial<UseMutationOptions<TData, TError, TVariables>> = {},
): UseMutationOptions<TData, TError, TVariables> => {
	const setAccessToken = useAuthStore((state) => state.setAccessToken);

	return {
		...options,
		onError: (error, variables, context) => {
			if ((error as any)?.response?.status === 401) {
				setAccessToken(null);
				window.location.reload();
			}

			if (options.onError) {
				options.onError(error, variables, context);
			}
		},
	} as UseMutationOptions<TData, TError, TVariables>;
};
