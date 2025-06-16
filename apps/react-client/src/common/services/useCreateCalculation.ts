import {
	CalculationResponseDto,
	CreateCalculationDto,
} from "@react-client/common/api";
import { useMutation } from "@tanstack/react-query";
import { useProtectedFetch } from "../hooks/useProtectedFetch";

export const useCreateCalculation = () => {
	const protectedFetch = useProtectedFetch();

	return useMutation<CalculationResponseDto, Error, CreateCalculationDto>({
		mutationFn: (data) =>
			protectedFetch("/calculation", {
				method: "POST",
				body: JSON.stringify(data),
				headers: {
					"Content-Type": "application/json",
				},
			}),
	});
};
