import type { AppVersionDto } from "@smart-anketa/api-contract";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../helpers/apiClient";

export const fetchAppVersion = (signal?: AbortSignal) =>
	apiClient<AppVersionDto>({
		url: "/app/version",
		method: "GET",
		signal,
	});

export const useAppVersionQuery = () =>
	useQuery<AppVersionDto>({
		queryKey: ["app-version"],
		queryFn: ({ signal }) => fetchAppVersion(signal),
		staleTime: 60_000,
	});
