import { useMutation, useQuery } from "@tanstack/react-query";
import type {
	DataTag,
	DefinedInitialDataOptions,
	DefinedUseQueryResult,
	MutationFunction,
	QueryClient,
	QueryFunction,
	QueryKey,
	UndefinedInitialDataOptions,
	UseMutationOptions,
	UseMutationResult,
	UseQueryOptions,
	UseQueryResult,
} from "@tanstack/react-query";

import type {
	CalculationControllerExportToExcelParams,
	CalculationControllerFindAllPaginatedParams,
	CalculationResponseDto,
	CoefficientControllerGetValueParams,
	CoefficientEntity,
	CreateCalculationDto,
	CreateCloneDto,
	CreateNewVersionDto,
	PaginatedCalculationResponseDto,
	QuestionnaireResponseDto,
} from "@smart-anketa/api-contract";

import { apiClient } from "../helpers/apiClient";
import { customQueryOptions } from "../helpers/queryOptions";

type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;

export const calculationControllerCreate = (
	createCalculationDto: CreateCalculationDto,
	signal?: AbortSignal,
) =>
	apiClient<CalculationResponseDto>({
		url: `/calculation`,
		method: "POST",
		headers: { "Content-Type": "application/json" },
		data: createCalculationDto,
		signal,
	});

export const getCalculationControllerCreateMutationOptions = <
	TError = void,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof calculationControllerCreate>>,
		TError,
		{ data: CreateCalculationDto },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof calculationControllerCreate>>,
	TError,
	{ data: CreateCalculationDto },
	TContext
> => {
	const mutationKey = ["calculationControllerCreate"];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			"mutationKey" in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof calculationControllerCreate>>,
		{ data: CreateCalculationDto }
	> = (props) => {
		const { data } = props ?? {};
		return calculationControllerCreate(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CalculationControllerCreateMutationResult = NonNullable<
	Awaited<ReturnType<typeof calculationControllerCreate>>
>;

export const useCalculationControllerCreate = <
	TError = void,
	TContext = unknown,
>(
	options?: {
		mutation?: UseMutationOptions<
			Awaited<ReturnType<typeof calculationControllerCreate>>,
			TError,
			{ data: CreateCalculationDto },
			TContext
		>;
	},
	queryClient?: QueryClient,
): UseMutationResult<
	Awaited<ReturnType<typeof calculationControllerCreate>>,
	TError,
	{ data: CreateCalculationDto },
	TContext
> => {
	const mutationOptions =
		getCalculationControllerCreateMutationOptions(options);
	return useMutation(mutationOptions, queryClient);
};

export const calculationControllerFindAllPaginated = (
	params?: CalculationControllerFindAllPaginatedParams,
	signal?: AbortSignal,
) =>
	apiClient<PaginatedCalculationResponseDto>({
		url: `/calculation/all`,
		method: "GET",
		params,
		signal,
	});

export const getCalculationControllerFindAllPaginatedQueryKey = (
	params?: CalculationControllerFindAllPaginatedParams,
) => [`/calculation/all`, ...(params ? [params] : [])] as const;

export const useCalculationControllerFindAllPaginatedQueryOptions = <
	TData = Awaited<
		ReturnType<typeof calculationControllerFindAllPaginated>
	>,
	TError = void,
>(
	params?: CalculationControllerFindAllPaginatedParams,
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<
					ReturnType<typeof calculationControllerFindAllPaginated>
				>,
				TError,
				TData
			>
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getCalculationControllerFindAllPaginatedQueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof calculationControllerFindAllPaginated>>
	> = ({ signal }) =>
		calculationControllerFindAllPaginated(params, signal);

	const customOpts = customQueryOptions({
		...queryOptions,
		queryKey,
		queryFn,
		staleTime: 30000,
		retry: 2,
	});

	return customOpts as UseQueryOptions<
		Awaited<ReturnType<typeof calculationControllerFindAllPaginated>>,
		TError,
		TData
	> & { queryKey: DataTag<QueryKey, TData, TError> };
};

export type CalculationControllerFindAllPaginatedQueryResult =
	NonNullable<
		Awaited<ReturnType<typeof calculationControllerFindAllPaginated>>
	>;

export function useCalculationControllerFindAllPaginated<
	TData = Awaited<
		ReturnType<typeof calculationControllerFindAllPaginated>
	>,
	TError = void,
>(
	params: undefined | CalculationControllerFindAllPaginatedParams,
	options: {
		query: Partial<
			UseQueryOptions<
				Awaited<
					ReturnType<typeof calculationControllerFindAllPaginated>
				>,
				TError,
				TData
			>
		> &
			Pick<
				DefinedInitialDataOptions<
					Awaited<
						ReturnType<
							typeof calculationControllerFindAllPaginated
						>
					>,
					TError,
					Awaited<
						ReturnType<
							typeof calculationControllerFindAllPaginated
						>
					>
				>,
				"initialData"
			>;
	},
	queryClient?: QueryClient,
): DefinedUseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
};
export function useCalculationControllerFindAllPaginated<
	TData = Awaited<
		ReturnType<typeof calculationControllerFindAllPaginated>
	>,
	TError = void,
>(
	params?: CalculationControllerFindAllPaginatedParams,
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<
					ReturnType<typeof calculationControllerFindAllPaginated>
				>,
				TError,
				TData
			>
		> &
			Pick<
				UndefinedInitialDataOptions<
					Awaited<
						ReturnType<
							typeof calculationControllerFindAllPaginated
						>
					>,
					TError,
					Awaited<
						ReturnType<
							typeof calculationControllerFindAllPaginated
						>
					>
				>,
				"initialData"
			>;
	},
	queryClient?: QueryClient,
): UseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
};
export function useCalculationControllerFindAllPaginated<
	TData = Awaited<
		ReturnType<typeof calculationControllerFindAllPaginated>
	>,
	TError = void,
>(
	params?: CalculationControllerFindAllPaginatedParams,
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<
					ReturnType<typeof calculationControllerFindAllPaginated>
				>,
				TError,
				TData
			>
		>;
	},
	queryClient?: QueryClient,
): UseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
};
export function useCalculationControllerFindAllPaginated<
	TData = Awaited<
		ReturnType<typeof calculationControllerFindAllPaginated>
	>,
	TError = void,
>(
	params?: CalculationControllerFindAllPaginatedParams,
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<
					ReturnType<typeof calculationControllerFindAllPaginated>
				>,
				TError,
				TData
			>
		>;
	},
	queryClient?: QueryClient,
): UseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
} {
	const queryOptions = useCalculationControllerFindAllPaginatedQueryOptions(
		params,
		options,
	);
	const query = useQuery(queryOptions, queryClient) as UseQueryResult<
		TData,
		TError
	> & { queryKey: DataTag<QueryKey, TData, TError> };
	query.queryKey = queryOptions.queryKey;
	return query;
}

export const calculationControllerExportToExcel = (
	data?: CalculationControllerExportToExcelParams,
	signal?: AbortSignal,
) =>
	apiClient<Blob>({
		url: `/calculation/export/excel`,
		method: "POST",
		headers: { "Content-Type": "application/json" },
		data,
		signal,
		responseType: "blob",
	});

export const getCalculationControllerExportToExcelMutationOptions = <
	TError = void,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof calculationControllerExportToExcel>>,
		TError,
		{ data?: CalculationControllerExportToExcelParams },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof calculationControllerExportToExcel>>,
	TError,
	{ data?: CalculationControllerExportToExcelParams },
	TContext
> => {
	const mutationKey = ["calculationControllerExportToExcel"];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			"mutationKey" in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof calculationControllerExportToExcel>>,
		{ data?: CalculationControllerExportToExcelParams }
	> = (props) => {
		const { data: body } = props ?? {};
		return calculationControllerExportToExcel(body);
	};

	return { mutationFn, ...mutationOptions };
};

export const useCalculationControllerExportToExcel = <
	TError = void,
	TContext = unknown,
>(
	options?: {
		mutation?: UseMutationOptions<
			Awaited<ReturnType<typeof calculationControllerExportToExcel>>,
			TError,
			{ data?: CalculationControllerExportToExcelParams },
			TContext
		>;
	},
	queryClient?: QueryClient,
): UseMutationResult<
	Awaited<ReturnType<typeof calculationControllerExportToExcel>>,
	TError,
	{ data?: CalculationControllerExportToExcelParams },
	TContext
> => {
	const mutationOptions =
		getCalculationControllerExportToExcelMutationOptions(options);
	return useMutation(mutationOptions, queryClient);
};

export const calculationControllerFindAll = (signal?: AbortSignal) =>
	apiClient<CalculationResponseDto[]>({
		url: `/calculation/all/list`,
		method: "GET",
		signal,
	});

export const getCalculationControllerFindAllQueryKey = () =>
	[`/calculation/all/list`] as const;

export const useCalculationControllerFindAllQueryOptions = <
	TData = Awaited<ReturnType<typeof calculationControllerFindAll>>,
	TError = void,
>(
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof calculationControllerFindAll>>,
				TError,
				TData
			>
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};
	const queryKey =
		queryOptions?.queryKey ?? getCalculationControllerFindAllQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof calculationControllerFindAll>>
	> = ({ signal }) => calculationControllerFindAll(signal);

	const customOpts = customQueryOptions({
		...queryOptions,
		queryKey,
		queryFn,
		staleTime: 30000,
		retry: 2,
	});

	return customOpts as UseQueryOptions<
		Awaited<ReturnType<typeof calculationControllerFindAll>>,
		TError,
		TData
	> & { queryKey: DataTag<QueryKey, TData, TError> };
};

export function useCalculationControllerFindAll<
	TData = Awaited<ReturnType<typeof calculationControllerFindAll>>,
	TError = void,
>(
	options: {
		query: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof calculationControllerFindAll>>,
				TError,
				TData
			>
		> &
			Pick<
				DefinedInitialDataOptions<
					Awaited<ReturnType<typeof calculationControllerFindAll>>,
					TError,
					Awaited<ReturnType<typeof calculationControllerFindAll>>
				>,
				"initialData"
			>;
	},
	queryClient?: QueryClient,
): DefinedUseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
};
export function useCalculationControllerFindAll<
	TData = Awaited<ReturnType<typeof calculationControllerFindAll>>,
	TError = void,
>(
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof calculationControllerFindAll>>,
				TError,
				TData
			>
		> &
			Pick<
				UndefinedInitialDataOptions<
					Awaited<ReturnType<typeof calculationControllerFindAll>>,
					TError,
					Awaited<ReturnType<typeof calculationControllerFindAll>>
				>,
				"initialData"
			>;
	},
	queryClient?: QueryClient,
): UseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
};
export function useCalculationControllerFindAll<
	TData = Awaited<ReturnType<typeof calculationControllerFindAll>>,
	TError = void,
>(
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof calculationControllerFindAll>>,
				TError,
				TData
			>
		>;
	},
	queryClient?: QueryClient,
): UseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
};
export function useCalculationControllerFindAll<
	TData = Awaited<ReturnType<typeof calculationControllerFindAll>>,
	TError = void,
>(
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof calculationControllerFindAll>>,
				TError,
				TData
			>
		>;
	},
	queryClient?: QueryClient,
): UseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
} {
	const queryOptions = useCalculationControllerFindAllQueryOptions(options);
	const query = useQuery(queryOptions, queryClient) as UseQueryResult<
		TData,
		TError
	> & { queryKey: DataTag<QueryKey, TData, TError> };
	query.queryKey = queryOptions.queryKey;
	return query;
}

export const calculationControllerFindOne = (
	id: string,
	signal?: AbortSignal,
) =>
	apiClient<CalculationResponseDto>({
		url: `/calculation/${id}`,
		method: "GET",
		signal,
	});

export const getCalculationControllerFindOneQueryKey = (id: string) =>
	[`/calculation/${id}`] as const;

export const useCalculationControllerFindOneQueryOptions = <
	TData = Awaited<ReturnType<typeof calculationControllerFindOne>>,
	TError = void,
>(
	id: string,
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof calculationControllerFindOne>>,
				TError,
				TData
			>
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};
	const queryKey =
		queryOptions?.queryKey ?? getCalculationControllerFindOneQueryKey(id);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof calculationControllerFindOne>>
	> = ({ signal }) => calculationControllerFindOne(id, signal);

	const customOpts = customQueryOptions({
		...queryOptions,
		queryKey,
		queryFn,
		staleTime: 30000,
		retry: 2,
	});

	return customOpts as UseQueryOptions<
		Awaited<ReturnType<typeof calculationControllerFindOne>>,
		TError,
		TData
	> & { queryKey: DataTag<QueryKey, TData, TError> };
};

export function useCalculationControllerFindOne<
	TData = Awaited<ReturnType<typeof calculationControllerFindOne>>,
	TError = void,
>(
	id: string,
	options: {
		query: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof calculationControllerFindOne>>,
				TError,
				TData
			>
		> &
			Pick<
				DefinedInitialDataOptions<
					Awaited<ReturnType<typeof calculationControllerFindOne>>,
					TError,
					Awaited<ReturnType<typeof calculationControllerFindOne>>
				>,
				"initialData"
			>;
	},
	queryClient?: QueryClient,
): DefinedUseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
};
export function useCalculationControllerFindOne<
	TData = Awaited<ReturnType<typeof calculationControllerFindOne>>,
	TError = void,
>(
	id: string,
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof calculationControllerFindOne>>,
				TError,
				TData
			>
		> &
			Pick<
				UndefinedInitialDataOptions<
					Awaited<ReturnType<typeof calculationControllerFindOne>>,
					TError,
					Awaited<ReturnType<typeof calculationControllerFindOne>>
				>,
				"initialData"
			>;
	},
	queryClient?: QueryClient,
): UseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
};
export function useCalculationControllerFindOne<
	TData = Awaited<ReturnType<typeof calculationControllerFindOne>>,
	TError = void,
>(
	id: string,
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof calculationControllerFindOne>>,
				TError,
				TData
			>
		>;
	},
	queryClient?: QueryClient,
): UseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
};
export function useCalculationControllerFindOne<
	TData = Awaited<ReturnType<typeof calculationControllerFindOne>>,
	TError = void,
>(
	id: string,
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof calculationControllerFindOne>>,
				TError,
				TData
			>
		>;
	},
	queryClient?: QueryClient,
): UseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
} {
	const queryOptions = useCalculationControllerFindOneQueryOptions(
		id,
		options,
	);
	const query = useQuery(queryOptions, queryClient) as UseQueryResult<
		TData,
		TError
	> & { queryKey: DataTag<QueryKey, TData, TError> };
	query.queryKey = queryOptions.queryKey;
	return query;
}

export const questionnaireControllerGetFullQuestionnaire = (
	signal?: AbortSignal,
) =>
	apiClient<QuestionnaireResponseDto>({
		url: `/questionnaire`,
		method: "GET",
		signal,
	});

export const getQuestionnaireControllerGetFullQuestionnaireQueryKey =
	() => [`/questionnaire`] as const;

export const useQuestionnaireControllerGetFullQuestionnaireQueryOptions = <
	TData = Awaited<
		ReturnType<typeof questionnaireControllerGetFullQuestionnaire>
	>,
	TError = unknown,
>(
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<
					ReturnType<
						typeof questionnaireControllerGetFullQuestionnaire
					>
				>,
				TError,
				TData
			>
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};
	const queryKey =
		queryOptions?.queryKey ??
		getQuestionnaireControllerGetFullQuestionnaireQueryKey();

	const queryFn: QueryFunction<
		Awaited<
			ReturnType<typeof questionnaireControllerGetFullQuestionnaire>
		>
	> = ({ signal }) =>
		questionnaireControllerGetFullQuestionnaire(signal);

	const customOpts = customQueryOptions({
		...queryOptions,
		queryKey,
		queryFn,
		staleTime: 30000,
		retry: 2,
	});

	return customOpts as UseQueryOptions<
		Awaited<
			ReturnType<typeof questionnaireControllerGetFullQuestionnaire>
		>,
		TError,
		TData
	> & { queryKey: DataTag<QueryKey, TData, TError> };
};

export function useQuestionnaireControllerGetFullQuestionnaire<
	TData = Awaited<
		ReturnType<typeof questionnaireControllerGetFullQuestionnaire>
	>,
	TError = unknown,
>(
	options: {
		query: Partial<
			UseQueryOptions<
				Awaited<
					ReturnType<
						typeof questionnaireControllerGetFullQuestionnaire
					>
				>,
				TError,
				TData
			>
		> &
			Pick<
				DefinedInitialDataOptions<
					Awaited<
						ReturnType<
							typeof questionnaireControllerGetFullQuestionnaire
						>
					>,
					TError,
					Awaited<
						ReturnType<
							typeof questionnaireControllerGetFullQuestionnaire
						>
					>
				>,
				"initialData"
			>;
	},
	queryClient?: QueryClient,
): DefinedUseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
};
export function useQuestionnaireControllerGetFullQuestionnaire<
	TData = Awaited<
		ReturnType<typeof questionnaireControllerGetFullQuestionnaire>
	>,
	TError = unknown,
>(
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<
					ReturnType<
						typeof questionnaireControllerGetFullQuestionnaire
					>
				>,
				TError,
				TData
			>
		> &
			Pick<
				UndefinedInitialDataOptions<
					Awaited<
						ReturnType<
							typeof questionnaireControllerGetFullQuestionnaire
						>
					>,
					TError,
					Awaited<
						ReturnType<
							typeof questionnaireControllerGetFullQuestionnaire
						>
					>
				>,
				"initialData"
			>;
	},
	queryClient?: QueryClient,
): UseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
};
export function useQuestionnaireControllerGetFullQuestionnaire<
	TData = Awaited<
		ReturnType<typeof questionnaireControllerGetFullQuestionnaire>
	>,
	TError = unknown,
>(
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<
					ReturnType<
						typeof questionnaireControllerGetFullQuestionnaire
					>
				>,
				TError,
				TData
			>
		>;
	},
	queryClient?: QueryClient,
): UseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
};
export function useQuestionnaireControllerGetFullQuestionnaire<
	TData = Awaited<
		ReturnType<typeof questionnaireControllerGetFullQuestionnaire>
	>,
	TError = unknown,
>(
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<
					ReturnType<
						typeof questionnaireControllerGetFullQuestionnaire
					>
				>,
				TError,
				TData
			>
		>;
	},
	queryClient?: QueryClient,
): UseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
} {
	const queryOptions =
		useQuestionnaireControllerGetFullQuestionnaireQueryOptions(options);
	const query = useQuery(queryOptions, queryClient) as UseQueryResult<
		TData,
		TError
	> & { queryKey: DataTag<QueryKey, TData, TError> };
	query.queryKey = queryOptions.queryKey;
	return query;
}

export const coefficientControllerFindAll = (signal?: AbortSignal) =>
	apiClient<CoefficientEntity[]>({
		url: `/questionnaire/coefficients`,
		method: "GET",
		signal,
	});

export const getCoefficientControllerFindAllQueryKey = () =>
	[`/questionnaire/coefficients`] as const;

export const useCoefficientControllerFindAllQueryOptions = <
	TData = Awaited<ReturnType<typeof coefficientControllerFindAll>>,
	TError = unknown,
>(
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof coefficientControllerFindAll>>,
				TError,
				TData
			>
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};
	const queryKey =
		queryOptions?.queryKey ?? getCoefficientControllerFindAllQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof coefficientControllerFindAll>>
	> = ({ signal }) => coefficientControllerFindAll(signal);

	const customOpts = customQueryOptions({
		...queryOptions,
		queryKey,
		queryFn,
		staleTime: 30000,
		retry: 2,
	});

	return customOpts as UseQueryOptions<
		Awaited<ReturnType<typeof coefficientControllerFindAll>>,
		TError,
		TData
	> & { queryKey: DataTag<QueryKey, TData, TError> };
};

export function useCoefficientControllerFindAll<
	TData = Awaited<ReturnType<typeof coefficientControllerFindAll>>,
	TError = unknown,
>(
	options: {
		query: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof coefficientControllerFindAll>>,
				TError,
				TData
			>
		> &
			Pick<
				DefinedInitialDataOptions<
					Awaited<ReturnType<typeof coefficientControllerFindAll>>,
					TError,
					Awaited<ReturnType<typeof coefficientControllerFindAll>>
				>,
				"initialData"
			>;
	},
	queryClient?: QueryClient,
): DefinedUseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
};
export function useCoefficientControllerFindAll<
	TData = Awaited<ReturnType<typeof coefficientControllerFindAll>>,
	TError = unknown,
>(
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof coefficientControllerFindAll>>,
				TError,
				TData
			>
		> &
			Pick<
				UndefinedInitialDataOptions<
					Awaited<ReturnType<typeof coefficientControllerFindAll>>,
					TError,
					Awaited<ReturnType<typeof coefficientControllerFindAll>>
				>,
				"initialData"
			>;
	},
	queryClient?: QueryClient,
): UseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
};
export function useCoefficientControllerFindAll<
	TData = Awaited<ReturnType<typeof coefficientControllerFindAll>>,
	TError = unknown,
>(
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof coefficientControllerFindAll>>,
				TError,
				TData
			>
		>;
	},
	queryClient?: QueryClient,
): UseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
};
export function useCoefficientControllerFindAll<
	TData = Awaited<ReturnType<typeof coefficientControllerFindAll>>,
	TError = unknown,
>(
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof coefficientControllerFindAll>>,
				TError,
				TData
			>
		>;
	},
	queryClient?: QueryClient,
): UseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
} {
	const queryOptions =
		useCoefficientControllerFindAllQueryOptions(options);
	const query = useQuery(queryOptions, queryClient) as UseQueryResult<
		TData,
		TError
	> & { queryKey: DataTag<QueryKey, TData, TError> };
	query.queryKey = queryOptions.queryKey;
	return query;
}

export const coefficientControllerGetValue = (
	code: string,
	params: CoefficientControllerGetValueParams,
	signal?: AbortSignal,
) =>
	apiClient<number>({
		url: `/questionnaire/coefficients/${code}`,
		method: "GET",
		params,
		signal,
	});

export const getCoefficientControllerGetValueQueryKey = (
	code: string,
	params: CoefficientControllerGetValueParams,
) =>
	[`/questionnaire/coefficients/${code}`, ...(params ? [params] : [])] as const;

export const useCoefficientControllerGetValueQueryOptions = <
	TData = Awaited<ReturnType<typeof coefficientControllerGetValue>>,
	TError = unknown,
>(
	code: string,
	params: CoefficientControllerGetValueParams,
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof coefficientControllerGetValue>>,
				TError,
				TData
			>
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};
	const queryKey =
		queryOptions?.queryKey ??
		getCoefficientControllerGetValueQueryKey(code, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof coefficientControllerGetValue>>
	> = ({ signal }) =>
		coefficientControllerGetValue(code, params, signal);

	const customOpts = customQueryOptions({
		...queryOptions,
		queryKey,
		queryFn,
		staleTime: 30000,
		retry: 2,
	});

	return customOpts as UseQueryOptions<
		Awaited<ReturnType<typeof coefficientControllerGetValue>>,
		TError,
		TData
	> & { queryKey: DataTag<QueryKey, TData, TError> };
};

export function useCoefficientControllerGetValue<
	TData = Awaited<ReturnType<typeof coefficientControllerGetValue>>,
	TError = unknown,
>(
	code: string,
	params: CoefficientControllerGetValueParams,
	options: {
		query: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof coefficientControllerGetValue>>,
				TError,
				TData
			>
		> &
			Pick<
				DefinedInitialDataOptions<
					Awaited<ReturnType<typeof coefficientControllerGetValue>>,
					TError,
					Awaited<ReturnType<typeof coefficientControllerGetValue>>
				>,
				"initialData"
			>;
	},
	queryClient?: QueryClient,
): DefinedUseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
};
export function useCoefficientControllerGetValue<
	TData = Awaited<ReturnType<typeof coefficientControllerGetValue>>,
	TError = unknown,
>(
	code: string,
	params: CoefficientControllerGetValueParams,
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof coefficientControllerGetValue>>,
				TError,
				TData
			>
		> &
			Pick<
				UndefinedInitialDataOptions<
					Awaited<ReturnType<typeof coefficientControllerGetValue>>,
					TError,
					Awaited<ReturnType<typeof coefficientControllerGetValue>>
				>,
				"initialData"
			>;
	},
	queryClient?: QueryClient,
): UseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
};
export function useCoefficientControllerGetValue<
	TData = Awaited<ReturnType<typeof coefficientControllerGetValue>>,
	TError = unknown,
>(
	code: string,
	params: CoefficientControllerGetValueParams,
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof coefficientControllerGetValue>>,
				TError,
				TData
			>
		>;
	},
	queryClient?: QueryClient,
): UseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
};
export function useCoefficientControllerGetValue<
	TData = Awaited<ReturnType<typeof coefficientControllerGetValue>>,
	TError = unknown,
>(
	code: string,
	params: CoefficientControllerGetValueParams,
	options?: {
		query?: Partial<
			UseQueryOptions<
				Awaited<ReturnType<typeof coefficientControllerGetValue>>,
				TError,
				TData
			>
		>;
	},
	queryClient?: QueryClient,
): UseQueryResult<TData, TError> & {
	queryKey: DataTag<QueryKey, TData, TError>;
} {
	const queryOptions = useCoefficientControllerGetValueQueryOptions(
		code,
		params,
		options,
	);
	const query = useQuery(queryOptions, queryClient) as UseQueryResult<
		TData,
		TError
	> & { queryKey: DataTag<QueryKey, TData, TError> };
	query.queryKey = queryOptions.queryKey;
	return query;
}

export const calculationControllerCreateNewVersion = (
	id: string,
	createNewVersionDto: CreateNewVersionDto,
	signal?: AbortSignal,
) =>
	apiClient<CalculationResponseDto>({
		url: `/calculation/${id}/new-version`,
		method: "POST",
		headers: { "Content-Type": "application/json" },
		data: createNewVersionDto,
		signal,
	});

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
		return calculationControllerCreateNewVersion(id!, data!);
	};

	return { mutationFn, ...mutationOptions };
};

export const useCalculationControllerCreateNewVersion = <
	TError = void,
	TContext = unknown,
>(
	options?: {
		mutation?: UseMutationOptions<
			Awaited<
				ReturnType<typeof calculationControllerCreateNewVersion>
			>,
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

export const calculationControllerCreateClone = (
	id: string,
	createCloneDto: CreateCloneDto,
	signal?: AbortSignal,
) =>
	apiClient<CalculationResponseDto>({
		url: `/calculation/${id}/clone`,
		method: "POST",
		headers: { "Content-Type": "application/json" },
		data: createCloneDto,
		signal,
	});

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
		return calculationControllerCreateClone(id!, data!);
	};

	return { mutationFn, ...mutationOptions };
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
