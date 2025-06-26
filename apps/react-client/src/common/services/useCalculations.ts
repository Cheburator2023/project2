import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCalculationApiService } from "../api/services/calculation-api.service";
import {
	CreateCalculationRequest,
	PaginationParams,
} from "../api/types/calculation.types";

// Query keys
export const calculationKeys = {
	all: ["calculations"] as const,
	lists: () => [...calculationKeys.all, "list"] as const,
	list: (filters: PaginationParams) =>
		[...calculationKeys.lists(), filters] as const,
	details: () => [...calculationKeys.all, "detail"] as const,
	detail: (id: string) => [...calculationKeys.details(), id] as const,
};

// Hooks
export const useAllCalculations = () => {
	const apiService = useCalculationApiService();

	return useQuery({
		queryKey: calculationKeys.lists(),
		queryFn: () => apiService.getAllCalculations(),
		staleTime: 30_000,
	});
};

export const useCalculationsPaginated = (params: PaginationParams = {}) => {
	const apiService = useCalculationApiService();

	return useQuery({
		queryKey: calculationKeys.list(params),
		queryFn: () => apiService.getCalculationsPaginated(params),
		staleTime: 30_000,
	});
};

export const useCalculationById = (id: string) => {
	const apiService = useCalculationApiService();

	return useQuery({
		queryKey: calculationKeys.detail(id),
		queryFn: () => apiService.getCalculationById(id),
		staleTime: 30_000,
		enabled: !!id,
	});
};

export const useCreateCalculation = () => {
	const apiService = useCalculationApiService();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateCalculationRequest) =>
			apiService.createCalculation(data),
		onSuccess: () => {
			// Invalidate and refetch calculations lists
			queryClient.invalidateQueries({ queryKey: calculationKeys.lists() });
		},
	});
};
