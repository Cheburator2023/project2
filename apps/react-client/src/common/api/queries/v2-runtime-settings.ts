import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../helpers/apiClient";

export type V2StreamFilterSetting = {
	enabled: boolean;
	envDefaultEnabled: boolean;
	override: boolean | null;
	/** DE/ModelOps family видит все стримы (env DE_MODELOPS_VIEW_ALL_STREAMS, default ON). */
	deModelopsViewAllStreams: boolean;
};

const STREAM_FILTER_KEY = ["v2-runtime-settings", "stream-filter"] as const;

export const useV2StreamFilterSetting = () =>
	useQuery<V2StreamFilterSetting>({
		queryKey: STREAM_FILTER_KEY,
		queryFn: () =>
			apiClient<V2StreamFilterSetting>({
				url: "/v2/runtime-settings/stream-filter",
				method: "GET",
			}),
		staleTime: 30_000,
	});

export const useUpdateV2StreamFilterSetting = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (enabled: boolean) =>
			apiClient<V2StreamFilterSetting>({
				url: "/v2/runtime-settings/stream-filter",
				method: "PUT",
				data: { enabled },
			}),
		onSuccess: (data) => {
			qc.setQueryData(STREAM_FILTER_KEY, data);
		},
	});
};

export const useResetV2StreamFilterSetting = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () =>
			apiClient<V2StreamFilterSetting>({
				url: "/v2/runtime-settings/stream-filter/override",
				method: "DELETE",
			}),
		onSuccess: (data) => {
			qc.setQueryData(STREAM_FILTER_KEY, data);
		},
	});
};
