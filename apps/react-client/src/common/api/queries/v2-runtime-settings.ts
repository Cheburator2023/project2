import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../helpers/apiClient";

export type V2StreamFilterSetting = {
	enabled: boolean;
	envDefaultEnabled: boolean;
	override: boolean | null;
	deModelopsViewAllStreams: boolean;
};

export type V2WorkEstimatesStreamFilterSetting = {
	enabled: boolean;
	envDefaultEnabled: boolean;
	override: boolean | null;
};

export type V2RoleCompatSetting = {
	adminItAsAppadmin: boolean;
	adminItAsAppadminEnvDefault: boolean;
	adminItAsAppadminOverride: boolean | null;
	allowNestedLeadGroups: boolean;
	allowNestedLeadGroupsEnvDefault: boolean;
	allowNestedLeadGroupsOverride: boolean | null;
};

export type V2DadmProgramManagerSetting = {
	enabled: boolean;
	envDefaultEnabled: boolean;
	override: boolean | null;
};

export type V2EditLockHardDisableSetting = {
	enabled: boolean;
	envDefaultEnabled: boolean;
	override: boolean | null;
};

const STREAM_FILTER_KEY = ["v2-runtime-settings", "stream-filter"] as const;
const WORK_ESTIMATES_STREAM_FILTER_KEY = [
	"v2-runtime-settings",
	"work-estimates-stream-filter",
] as const;
const ROLE_COMPAT_KEY = ["v2-runtime-settings", "role-compat"] as const;
const DADM_PROGRAM_MANAGER_KEY = [
	"v2-runtime-settings",
	"dadm-program-manager",
] as const;
const EDIT_LOCK_HARD_DISABLE_KEY = [
	"v2-runtime-settings",
	"edit-lock-hard-disable",
] as const;

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

export const useV2WorkEstimatesStreamFilterSetting = () =>
	useQuery<V2WorkEstimatesStreamFilterSetting>({
		queryKey: WORK_ESTIMATES_STREAM_FILTER_KEY,
		queryFn: () =>
			apiClient<V2WorkEstimatesStreamFilterSetting>({
				url: "/v2/runtime-settings/work-estimates-stream-filter",
				method: "GET",
			}),
		staleTime: 30_000,
	});

export const useUpdateV2WorkEstimatesStreamFilterSetting = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (enabled: boolean) =>
			apiClient<V2WorkEstimatesStreamFilterSetting>({
				url: "/v2/runtime-settings/work-estimates-stream-filter",
				method: "PUT",
				data: { enabled },
			}),
		onSuccess: (data) => {
			qc.setQueryData(WORK_ESTIMATES_STREAM_FILTER_KEY, data);
		},
	});
};

export const useResetV2WorkEstimatesStreamFilterSetting = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () =>
			apiClient<V2WorkEstimatesStreamFilterSetting>({
				url: "/v2/runtime-settings/work-estimates-stream-filter/override",
				method: "DELETE",
			}),
		onSuccess: (data) => {
			qc.setQueryData(WORK_ESTIMATES_STREAM_FILTER_KEY, data);
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

export const useV2DadmProgramManagerSetting = () =>
	useQuery<V2DadmProgramManagerSetting>({
		queryKey: DADM_PROGRAM_MANAGER_KEY,
		queryFn: () =>
			apiClient<V2DadmProgramManagerSetting>({
				url: "/v2/runtime-settings/dadm-program-manager",
				method: "GET",
			}),
		staleTime: 30_000,
	});

export const useUpdateV2DadmProgramManagerSetting = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (enabled: boolean) =>
			apiClient<V2DadmProgramManagerSetting>({
				url: "/v2/runtime-settings/dadm-program-manager",
				method: "PUT",
				data: { enabled },
			}),
		onSuccess: (data) => {
			qc.setQueryData(DADM_PROGRAM_MANAGER_KEY, data);
		},
	});
};

export const useResetV2DadmProgramManagerSetting = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () =>
			apiClient<V2DadmProgramManagerSetting>({
				url: "/v2/runtime-settings/dadm-program-manager/override",
				method: "DELETE",
			}),
		onSuccess: (data) => {
			qc.setQueryData(DADM_PROGRAM_MANAGER_KEY, data);
		},
	});
};

/** Convenience: default ON until settings loaded. */
export function useDadmProgramManagerFeature(): boolean {
	const { data } = useV2DadmProgramManagerSetting();
	return data?.enabled !== false;
}

export const useV2EditLockHardDisableSetting = () =>
	useQuery<V2EditLockHardDisableSetting>({
		queryKey: EDIT_LOCK_HARD_DISABLE_KEY,
		queryFn: () =>
			apiClient<V2EditLockHardDisableSetting>({
				url: "/v2/runtime-settings/edit-lock-hard-disable",
				method: "GET",
			}),
		staleTime: 5 * 60 * 1000,
		refetchOnMount: false,
	});

export const useUpdateV2EditLockHardDisableSetting = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (enabled: boolean) =>
			apiClient<V2EditLockHardDisableSetting>({
				url: "/v2/runtime-settings/edit-lock-hard-disable",
				method: "PUT",
				data: { enabled },
			}),
		onSuccess: (data) => {
			qc.setQueryData(EDIT_LOCK_HARD_DISABLE_KEY, data);
		},
	});
};

export const useResetV2EditLockHardDisableSetting = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () =>
			apiClient<V2EditLockHardDisableSetting>({
				url: "/v2/runtime-settings/edit-lock-hard-disable/override",
				method: "DELETE",
			}),
		onSuccess: (data) => {
			qc.setQueryData(EDIT_LOCK_HARD_DISABLE_KEY, data);
		},
	});
};

/** Convenience: default OFF until settings loaded. */
export function useEditLockHardDisableFeature(): boolean {
	const { data } = useV2EditLockHardDisableSetting();
	return data?.enabled === true;
}
