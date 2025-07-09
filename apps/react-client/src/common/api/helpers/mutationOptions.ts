import type { UseMutationOptions } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";

export const customMutationOptions = <TData, TError, TVariables>(
	options: Partial<UseMutationOptions<TData, TError, TVariables>> = {},
): UseMutationOptions<TData, TError, TVariables> => {
	const _isAuthenticated = !!useAuthStore.getState().accessToken;

	return {
		...options,
		onError: (error, variables, context) => {
			if ((error as any)?.response?.status === 401) {
				useAuthStore.getState().setAccessToken(null);
				window.location.reload();
			}

			if (options.onError) {
				options.onError(error, variables, context);
			}
		},
		retry: (failureCount, error: any) => {
			if (error?.response?.status >= 400 && error?.response?.status < 500) {
				return false;
			}
			return failureCount < 2;
		},
	} as UseMutationOptions<TData, TError, TVariables>;
};
