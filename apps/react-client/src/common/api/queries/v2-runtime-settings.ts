import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../helpers/apiClient";

export type V2StreamFilterSetting = {
	enabled: boolean;
	envDefaultEnabled: boolean;
	override: boolean | null;
	deModelopsViewAllStreams: boolean;
};

export type V2RoleCompatSetting = {
	adminItAsAppadmin: boolean;
	adminItAsAppadminEnvDefault: boolean;
	adminItAsAppadminOverride: boolean | null;
	allowNestedLeadGroups: boolean;
	allowNestedLeadGroupsEnvDefault: boolean;
	allowNestedLeadGroupsOverride: boolean | null;
};

const STREAM_FILTER_KEY = ["v2-runtime-settings", "stream-filter"] as const;
const ROLE_COMPAT_KEY = ["v2-runtime-settings", "role-compat"] as const;

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

export const useV2RoleCompatSetting = () =>
	useQuery<V2RoleCompatSetting>({
		queryKey: ROLE_COMPAT_KEY,
		queryFn: () =>
			apiClient<V2RoleCompatSetting>({
				url: "/v2/runtime-settings/role-compat",
				method: "GET",
			}),
		staleTime: 30_000,
	});

export const useUpdateV2RoleCompatSetting = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (patch: {
			adminItAsAppadmin?: boolean;
			allowNestedLeadGroups?: boolean;
		}) =>
			apiClient<V2RoleCompatSetting>({
				url: "/v2/runtime-settings/role-compat",
				method: "PUT",
				data: patch,
			}),
		onSuccess: (data) => {
			qc.setQueryData(ROLE_COMPAT_KEY, data);
		},
	});
};

export const useResetV2RoleCompatSetting = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () =>
			apiClient<V2RoleCompatSetting>({
				url: "/v2/runtime-settings/role-compat/override",
				method: "DELETE",
			}),
		onSuccess: (data) => {
			qc.setQueryData(ROLE_COMPAT_KEY, data);
		},
	});
};
