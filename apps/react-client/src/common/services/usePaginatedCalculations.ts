import { PaginatedCalculationResponseDto } from "@react-client/common/api";
import { useQuery } from "@tanstack/react-query";
import { useProtectedFetch } from "../hooks/useProtectedFetch";

export const usePaginatedCalculations = (page: number, limit: number) => {
	const protectedFetch = useProtectedFetch();

	return useQuery<PaginatedCalculationResponseDto, Error>({
		queryKey: ["calculations", "paginated", page, limit],
		queryFn: () =>
			protectedFetch(`/calculation/all?page=${page}&limit=${limit}`),
		staleTime: 1000 * 30,
		placeholderData: (prev) => prev,
	});
};
