import { useQuery } from "@tanstack/react-query";
import { useProtectedFetch } from "../hooks/useProtectedFetch";

export const useAllCalculations = () => {
	const protectedFetch = useProtectedFetch();

	return useQuery({
		queryKey: ["calculations", "all"],
		queryFn: () => protectedFetch("/calculation/all/list"),
		staleTime: 1000 * 30,
	});
};
