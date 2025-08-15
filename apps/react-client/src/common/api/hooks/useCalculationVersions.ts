import { useMutation, QueryClient } from "@tanstack/react-query";
import type {
	MutationFunction,
	UseMutationOptions,
	UseMutationResult,
} from "@tanstack/react-query";

import { apiClient } from "../helpers/apiClient";
import type { CalculationResponseDto } from "../generated/types";
import type { CreateNewVersionDto } from "../types/createNewVersionDto";
import type { CreateCloneDto } from "../types/createCloneDto";

type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;

export const calculationControllerCreateNewVersion = (
	id: string,
	createNewVersionDto: CreateNewVersionDto,
	signal?: AbortSignal,
) => {
	return apiClient<CalculationResponseDto>({
		url: `/calculation/${id}/new-version`,
		method: "POST",
		headers: { "Content-Type": "application/json" },
		data: createNewVersionDto,
		signal,
	});
};

export const calculationControllerCreateClone = (
	id: string,
	createCloneDto: CreateCloneDto,
	signal?: AbortSignal,
) => {
	return apiClient<CalculationResponseDto>({
		url: `/calculation/${id}/clone`,
		method: "POST",
		headers: { "Content-Type": "application/json" },
		data: createCloneDto,
		signal,
	});
};

export const getCalculationControllerCreateNewVersionMutationOptions = <
	TError = void,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof calculationControllerCreateNewVersion>>,
		TError,
		{ id: string; data: CreateNewVersionDto },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof calculationControllerCreateNewVersion>>,
	TError,
	{ id: string; data: CreateNewVersionDto },
	TContext
> => {
	const mutationKey = ["calculationControllerCreateNewVersion"];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			"mutationKey" in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof calculationControllerCreateNewVersion>>,
		{ id: string; data: CreateNewVersionDto }
	> = (props) => {
		const { id, data } = props ?? {};
		return calculationControllerCreateNewVersion(id, data);
	};

	return { mutationFn, ...mutationOptions };
};

export const getCalculationControllerCreateCloneMutationOptions = <
	TError = void,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof calculationControllerCreateClone>>,
		TError,
		{ id: string; data: CreateCloneDto },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof calculationControllerCreateClone>>,
	TError,
	{ id: string; data: CreateCloneDto },
	TContext
> => {
	const mutationKey = ["calculationControllerCreateClone"];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			"mutationKey" in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof calculationControllerCreateClone>>,
		{ id: string; data: CreateCloneDto }
	> = (props) => {
		const { id, data } = props ?? {};
		return calculationControllerCreateClone(id, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CalculationControllerCreateNewVersionMutationResult = NonNullable<
	Awaited<ReturnType<typeof calculationControllerCreateNewVersion>>
>;
export type CalculationControllerCreateNewVersionMutationBody = {
	id: string;
	data: CreateNewVersionDto;
};
export type CalculationControllerCreateNewVersionMutationError = undefined;

export type CalculationControllerCreateCloneMutationResult = NonNullable<
	Awaited<ReturnType<typeof calculationControllerCreateClone>>
>;
export type CalculationControllerCreateCloneMutationBody = {
	id: string;
	data: CreateCloneDto;
};
export type CalculationControllerCreateCloneMutationError = undefined;

export const useCalculationControllerCreateNewVersion = <
	TError = void,
	TContext = unknown,
>(
	options?: {
		mutation?: UseMutationOptions<
			Awaited<ReturnType<typeof calculationControllerCreateNewVersion>>,
			TError,
			{ id: string; data: CreateNewVersionDto },
			TContext
		>;
	},
	queryClient?: QueryClient,
): UseMutationResult<
	Awaited<ReturnType<typeof calculationControllerCreateNewVersion>>,
	TError,
	{ id: string; data: CreateNewVersionDto },
	TContext
> => {
	const mutationOptions =
		getCalculationControllerCreateNewVersionMutationOptions(options);
	return useMutation(mutationOptions, queryClient);
};

export const useCalculationControllerCreateClone = <
	TError = void,
	TContext = unknown,
>(
	options?: {
		mutation?: UseMutationOptions<
			Awaited<ReturnType<typeof calculationControllerCreateClone>>,
			TError,
			{ id: string; data: CreateCloneDto },
			TContext
		>;
	},
	queryClient?: QueryClient,
): UseMutationResult<
	Awaited<ReturnType<typeof calculationControllerCreateClone>>,
	TError,
	{ id: string; data: CreateCloneDto },
	TContext
> => {
	const mutationOptions =
		getCalculationControllerCreateCloneMutationOptions(options);
	return useMutation(mutationOptions, queryClient);
};
