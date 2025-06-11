import { CalculationResponseDto } from "@react-client/common/api";
import { useQuery } from "@tanstack/react-query";
import { useProtectedFetch } from "../hooks/useProtectedFetch";

export const useCalculationById = (id?: string) => {
	const protectedFetch = useProtectedFetch();

	return useQuery<CalculationResponseDto, Error>({
		queryKey: ["calculation", id],
		enabled: !!id,
		queryFn: () => protectedFetch(`/calculation/${id}`),
	});
};
