import type { UseMutationOptions } from "@tanstack/react-query";

export const customMutationOptions = <TData, TError, TVariables>(
	options: Partial<UseMutationOptions<TData, TError, TVariables>> = {},
): UseMutationOptions<TData, TError, TVariables> => {
	return {
		...options,
		onError: (error, variables, context) => {
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
