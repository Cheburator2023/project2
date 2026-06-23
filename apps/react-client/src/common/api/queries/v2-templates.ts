import {
	useMutation,
	useQuery,
	useQueryClient,
	type QueryClient,
} from "@tanstack/react-query";
import type {
	CreateV2DictionaryItemRequestDto,
	CreateV2DictionaryRequestDto,
	CreateV2TemplateRequestDto,
	CreateV2TemplateVersionRequestDto,
	PublishV2TemplateVersionRequestDto,
	RollbackV2TemplateVersionRequestDto,
	UpdateV2DictionaryItemRequestDto,
	UpdateV2DictionaryRequestDto,
	UpdateV2TemplateRequestDto,
	UpdateV2TemplateVersionRequestDto,
	V2CalculateRequestDto,
	V2CalculationResultDto,
	V2DictionaryDto,
	V2DictionaryFieldUsageDto,
	V2DictionaryItemDto,
	BulkDeleteV2DictionariesResultDto,
	BulkResetV2DictionariesResultDto,
	BulkV2DictionaryJsonResponseDto,
	V2BulkDeleteTemplateVersionsResultDto,
	V2TemplateAuditDto,
	V2TemplateDeleteSnapshotDto,
	V2TemplateDto,
	V2TemplateVersionDto,
} from "@smart-anketa/api-contract";
import { useMemo } from "react";

import { parseDictionaryJsonToEnumPair } from "@react-client/features/v2/admin_constructor/utils/dictionaryPreview";
import { apiClient } from "../helpers/apiClient";

export type DeleteV2TemplateInput =
	| string
	| { id: string; skipCacheRefresh?: boolean };

export type BulkDeleteV2TemplateVersionsInput = {
	templateId: string;
	versionIds?: string[];
	skipCacheRefresh?: boolean;
};

function resolveDeleteTemplateInput(input: DeleteV2TemplateInput): {
	id: string;
	skipCacheRefresh: boolean;
} {
	if (typeof input === "string") {
		return { id: input, skipCacheRefresh: false };
	}
	return {
		id: input.id,
		skipCacheRefresh: input.skipCacheRefresh ?? false,
	};
}

export function invalidateV2TemplatesList(queryClient: QueryClient) {
	return queryClient.invalidateQueries({
		queryKey: ["v2-templates"],
		exact: true,
	});
}

export function invalidateV2TemplateVersions(
	queryClient: QueryClient,
	templateId: string,
) {
	return queryClient.invalidateQueries({
		queryKey: ["v2-templates", templateId, "versions"],
	});
}

export function removeV2TemplateFromCache(
	queryClient: QueryClient,
	templateId: string,
) {
	return queryClient.removeQueries({ queryKey: ["v2-templates", templateId] });
}

/** Обновить список шаблонов и версии затронутых шаблонов без лишних refetch. */
export function invalidateV2TemplateRegistry(
	queryClient: QueryClient,
	templateIds: string[] = [],
) {
	void invalidateV2TemplatesList(queryClient);
	for (const templateId of [...new Set(templateIds)]) {
		void invalidateV2TemplateVersions(queryClient, templateId);
		void queryClient.invalidateQueries({
			queryKey: ["v2-templates", templateId],
			exact: true,
		});
	}
}

// Templates
export const useV2Templates = () => {
	return useQuery<V2TemplateDto[]>({
		queryKey: ["v2-templates"],
		queryFn: () =>
			apiClient<V2TemplateDto[]>({
				url: "/v2/templates",
				method: "GET",
			}),
	});
};

export const useV2Template = (id: string) => {
	return useQuery<V2TemplateDto>({
		queryKey: ["v2-templates", id],
		queryFn: () =>
			apiClient<V2TemplateDto>({
				url: `/v2/templates/${id}`,
				method: "GET",
			}),
		enabled: !!id,
	});
};

export const useV2TemplateByCode = (code: string) => {
	return useQuery<V2TemplateDto>({
		queryKey: ["v2-templates", "code", code],
		queryFn: () =>
			apiClient<V2TemplateDto>({
				url: `/v2/templates/code/${code}`,
				method: "GET",
			}),
		enabled: !!code,
	});
};

export const useCreateV2Template = () => {
	const queryClient = useQueryClient();

	return useMutation<V2TemplateDto, Error, CreateV2TemplateRequestDto>({
		mutationFn: (dto) =>
			apiClient<V2TemplateDto>({
				url: "/v2/templates",
				method: "POST",
				data: dto,
			}),
		onSuccess: () => {
			void invalidateV2TemplatesList(queryClient);
		},
	});
};

export const useUpdateV2Template = () => {
	const queryClient = useQueryClient();

	return useMutation<
		V2TemplateDto,
		Error,
		{ id: string; dto: UpdateV2TemplateRequestDto }
	>({
		mutationFn: ({ id, dto }) =>
			apiClient<V2TemplateDto>({
				url: `/v2/templates/${id}`,
				method: "PUT",
				data: dto,
			}),
		onSuccess: (_, { id }) => {
			void invalidateV2TemplatesList(queryClient);
			queryClient.invalidateQueries({ queryKey: ["v2-templates", id] });
		},
	});
};

export const useDeleteV2Template = () => {
	const queryClient = useQueryClient();

	return useMutation<V2TemplateDeleteSnapshotDto, Error, DeleteV2TemplateInput>({
		mutationFn: (input) => {
			const { id } = resolveDeleteTemplateInput(input);
			return apiClient<V2TemplateDeleteSnapshotDto>({
				url: `/v2/templates/${id}`,
				method: "DELETE",
			});
		},
		onSettled: (_, __, input) => {
			const { id, skipCacheRefresh } = resolveDeleteTemplateInput(input);
			if (skipCacheRefresh) return;
			void invalidateV2TemplatesList(queryClient);
			void removeV2TemplateFromCache(queryClient, id);
		},
	});
};

export const useRestoreV2Template = () => {
	const queryClient = useQueryClient();

	return useMutation<V2TemplateDto, Error, V2TemplateDeleteSnapshotDto>({
		mutationFn: (snapshot) =>
			apiClient<V2TemplateDto>({
				url: "/v2/templates/restore",
				method: "POST",
				data: snapshot,
			}),
		onSuccess: (_, snapshot) => {
			void invalidateV2TemplatesList(queryClient);
			queryClient.invalidateQueries({
				queryKey: ["v2-templates", snapshot.template.id, "versions"],
			});
		},
	});
};

export const useBulkDeleteV2TemplateVersions = () => {
	const queryClient = useQueryClient();

	return useMutation<
		V2BulkDeleteTemplateVersionsResultDto,
		Error,
		BulkDeleteV2TemplateVersionsInput
	>({
		mutationFn: ({ templateId, versionIds }) =>
			apiClient<V2BulkDeleteTemplateVersionsResultDto>({
				url: `/v2/templates/${templateId}/versions/bulk-delete`,
				method: "POST",
				data: versionIds?.length ? { versionIds } : {},
			}),
		onSettled: (_, __, { templateId, skipCacheRefresh }) => {
			if (skipCacheRefresh) return;
			invalidateV2TemplateRegistry(queryClient, [templateId]);
		},
	});
};

export const useRestoreV2TemplateVersions = () => {
	const queryClient = useQueryClient();

	return useMutation<
		void,
		Error,
		{ templateId: string; versions: V2TemplateVersionDto[] }
	>({
		mutationFn: ({ templateId, versions }) =>
			apiClient<void>({
				url: `/v2/templates/${templateId}/versions/restore`,
				method: "POST",
				data: { versions },
			}),
		onSuccess: (_, { templateId }) => {
			queryClient.invalidateQueries({
				queryKey: ["v2-templates", templateId, "versions"],
			});
			queryClient.invalidateQueries({ queryKey: ["v2-templates", templateId] });
		},
	});
};

// Template Versions
export const useV2TemplateVersions = (templateId: string) => {
	return useQuery<V2TemplateVersionDto[]>({
		queryKey: ["v2-templates", templateId, "versions"],
		queryFn: () =>
			apiClient<V2TemplateVersionDto[]>({
				url: `/v2/templates/${templateId}/versions`,
				method: "GET",
			}),
		enabled: !!templateId,
	});
};

export const useV2TemplateVersion = (
	templateId: string,
	versionId: string | undefined | null,
) => {
	return useQuery<V2TemplateVersionDto>({
		queryKey: ["v2-templates", templateId, "versions", versionId],
		queryFn: () =>
			apiClient<V2TemplateVersionDto>({
				url: `/v2/templates/${templateId}/versions/${versionId}`,
				method: "GET",
			}),
		enabled: !!templateId && !!versionId,
	});
};

export const useCreateV2TemplateVersionFromDefault = () => {
	const queryClient = useQueryClient();

	return useMutation<V2TemplateVersionDto, Error, string>({
		mutationFn: (templateId) =>
			apiClient<V2TemplateVersionDto>({
				url: `/v2/templates/${templateId}/versions/from-default`,
				method: "POST",
			}),
		onSuccess: (_, templateId) => {
			void invalidateV2TemplatesList(queryClient);
			queryClient.invalidateQueries({
				queryKey: ["v2-templates", templateId, "versions"],
			});
			queryClient.invalidateQueries({ queryKey: ["v2-templates", templateId] });
		},
	});
};

export const useCreateV2TemplateVersion = () => {
	const queryClient = useQueryClient();

	return useMutation<
		V2TemplateVersionDto,
		Error,
		{ templateId: string; dto: CreateV2TemplateVersionRequestDto }
	>({
		mutationFn: ({ templateId, dto }) =>
			apiClient<V2TemplateVersionDto>({
				url: `/v2/templates/${templateId}/versions`,
				method: "POST",
				data: dto,
			}),
		onSuccess: (_, { templateId }) => {
			queryClient.invalidateQueries({
				queryKey: ["v2-templates", templateId, "versions"],
			});
			queryClient.invalidateQueries({ queryKey: ["v2-templates", templateId] });
		},
	});
};

export const useUpdateV2TemplateVersion = () => {
	const queryClient = useQueryClient();

	return useMutation<
		V2TemplateVersionDto,
		Error,
		{
			templateId: string;
			versionId: string;
			dto: UpdateV2TemplateVersionRequestDto;
		}
	>({
		mutationFn: ({ templateId, versionId, dto }) =>
			apiClient<V2TemplateVersionDto>({
				url: `/v2/templates/${templateId}/versions/${versionId}`,
				method: "PUT",
				data: dto,
			}),
		onSuccess: (_, { templateId, versionId }) => {
			queryClient.invalidateQueries({
				queryKey: ["v2-templates", templateId, "versions"],
			});
			queryClient.invalidateQueries({
				queryKey: ["v2-templates", templateId, "versions", versionId],
			});
			queryClient.invalidateQueries({ queryKey: ["v2-templates", templateId] });
		},
	});
};

export const usePublishV2TemplateVersion = () => {
	const queryClient = useQueryClient();

	return useMutation<
		V2TemplateVersionDto,
		Error,
		{
			templateId: string;
			versionId: string;
			dto?: PublishV2TemplateVersionRequestDto;
		}
	>({
		mutationFn: ({ templateId, versionId, dto = {} }) =>
			apiClient<V2TemplateVersionDto>({
				url: `/v2/templates/${templateId}/versions/${versionId}/publish`,
				method: "POST",
				data: dto,
			}),
		onSuccess: (_, { templateId, versionId }) => {
			void invalidateV2TemplatesList(queryClient);
			queryClient.invalidateQueries({
				queryKey: ["v2-templates", templateId, "versions"],
			});
			queryClient.invalidateQueries({
				queryKey: ["v2-templates", templateId, "versions", versionId],
			});
			queryClient.invalidateQueries({ queryKey: ["v2-templates", templateId] });
		},
	});
};

export const useArchiveV2TemplateVersion = () => {
	const queryClient = useQueryClient();

	return useMutation<
		V2TemplateVersionDto,
		Error,
		{ templateId: string; versionId: string }
	>({
		mutationFn: ({ templateId, versionId }) =>
			apiClient<V2TemplateVersionDto>({
				url: `/v2/templates/${templateId}/versions/${versionId}/archive`,
				method: "POST",
			}),
		onSuccess: (_, { templateId, versionId }) => {
			queryClient.invalidateQueries({
				queryKey: ["v2-templates", templateId, "versions"],
			});
			queryClient.invalidateQueries({
				queryKey: ["v2-templates", templateId, "versions", versionId],
			});
		},
	});
};

export const useRollbackV2TemplateVersion = () => {
	const queryClient = useQueryClient();

	return useMutation<
		V2TemplateVersionDto,
		Error,
		{ templateId: string; dto: RollbackV2TemplateVersionRequestDto }
	>({
		mutationFn: ({ templateId, dto }) =>
			apiClient<V2TemplateVersionDto>({
				url: `/v2/templates/${templateId}/versions/rollback`,
				method: "POST",
				data: dto,
			}),
		onSuccess: (_, { templateId }) => {
			queryClient.invalidateQueries({
				queryKey: ["v2-templates", templateId, "versions"],
			});
		},
	});
};

function refreshV2TemplateRegistry(queryClient: QueryClient, templateId: string) {
	invalidateV2TemplateRegistry(queryClient, [templateId]);
}

export const useActivateV2TemplateVersionAsCurrent = () => {
	const queryClient = useQueryClient();

	return useMutation<
		V2TemplateVersionDto,
		Error,
		{ templateId: string; versionId: string }
	>({
		mutationFn: ({ templateId, versionId }) =>
			apiClient<V2TemplateVersionDto>({
				url: `/v2/templates/${templateId}/versions/${versionId}/activate-as-current`,
				method: "POST",
			}),
		onSettled: (_, __, { templateId }) => {
			refreshV2TemplateRegistry(queryClient, templateId);
			queryClient.invalidateQueries({ queryKey: ["v2-audit"] });
		},
	});
};

export const useResetV2TemplateToDefault = () => {
	const queryClient = useQueryClient();

	return useMutation<V2TemplateVersionDto, Error, string>({
		mutationFn: (templateId) =>
			apiClient<V2TemplateVersionDto>({
				url: `/v2/templates/${templateId}/versions/reset-default`,
				method: "POST",
			}),
		onSuccess: (_, templateId) => {
			queryClient.invalidateQueries({ queryKey: ["v2-audit"] });
			void invalidateV2TemplatesList(queryClient);
			queryClient.invalidateQueries({ queryKey: ["v2-templates", templateId] });
			queryClient.invalidateQueries({
				queryKey: ["v2-templates", templateId, "versions"],
			});
		},
	});
};

export const useDeleteV2TemplateVersion = () => {
	const queryClient = useQueryClient();

	return useMutation<void, Error, { templateId: string; versionId: string }>({
		mutationFn: async ({ templateId, versionId }) => {
			await apiClient<unknown>({
				url: `/v2/templates/${templateId}/versions/${versionId}`,
				method: "DELETE",
			});
		},
		onSuccess: (_, { templateId, versionId }) => {
			queryClient.invalidateQueries({
				queryKey: ["v2-templates", templateId, "versions"],
			});
			queryClient.invalidateQueries({
				queryKey: ["v2-templates", templateId, "versions", versionId],
			});
		},
	});
};

// Calculation
export const useCalculateV2Template = () => {
	return useMutation<
		V2CalculationResultDto,
		Error,
		{ templateId: string; versionId?: string; dto: V2CalculateRequestDto }
	>({
		mutationFn: ({ templateId, versionId, dto }) =>
			apiClient<V2CalculationResultDto>({
				url: `/v2/templates/${templateId}/calculate${
					versionId ? `?versionId=${encodeURIComponent(versionId)}` : ""
				}`,
				method: "POST",
				data: dto,
			}),
	});
};

// Dictionaries
export const useV2Dictionaries = () => {
	return useQuery<V2DictionaryDto[]>({
		queryKey: ["v2-dictionaries"],
		queryFn: () =>
			apiClient<V2DictionaryDto[]>({
				url: "/v2/dictionaries",
				method: "GET",
			}),
	});
};

export const useV2Dictionary = (id: string) => {
	return useQuery<V2DictionaryDto>({
		queryKey: ["v2-dictionaries", id],
		queryFn: () =>
			apiClient<V2DictionaryDto>({
				url: `/v2/dictionaries/${id}`,
				method: "GET",
			}),
		enabled: !!id,
	});
};

export const useV2DictionaryFieldUsages = (dictionaryId: string) => {
	return useQuery<V2DictionaryFieldUsageDto[]>({
		queryKey: ["v2-dictionaries", dictionaryId, "field-usages"],
		queryFn: () =>
			apiClient<V2DictionaryFieldUsageDto[]>({
				url: `/v2/dictionaries/${dictionaryId}/field-usages`,
				method: "GET",
			}),
		enabled: !!dictionaryId,
	});
};

export const useV2DictionaryByCode = (code: string) => {
	return useQuery<V2DictionaryDto>({
		queryKey: ["v2-dictionaries", "code", code],
		queryFn: () =>
			apiClient<V2DictionaryDto>({
				url: `/v2/dictionaries/code/${code}`,
				method: "GET",
			}),
		enabled: !!code,
	});
};

export const useCreateV2Dictionary = () => {
	const queryClient = useQueryClient();

	return useMutation<V2DictionaryDto, Error, CreateV2DictionaryRequestDto>({
		mutationFn: (dto) =>
			apiClient<V2DictionaryDto>({
				url: "/v2/dictionaries",
				method: "POST",
				data: dto,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["v2-dictionaries"] });
		},
	});
};

export const useUpdateV2Dictionary = () => {
	const queryClient = useQueryClient();

	return useMutation<
		V2DictionaryDto,
		Error,
		{ id: string; dto: UpdateV2DictionaryRequestDto }
	>({
		mutationFn: ({ id, dto }) =>
			apiClient<V2DictionaryDto>({
				url: `/v2/dictionaries/${id}`,
				method: "PUT",
				data: dto,
			}),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ["v2-dictionaries"] });
			queryClient.invalidateQueries({ queryKey: ["v2-dictionaries", id] });
			queryClient.invalidateQueries({
				queryKey: ["v2-dictionaries", id, "field-usages"],
			});
		},
	});
};

export const useDeleteV2Dictionary = () => {
	const queryClient = useQueryClient();

	return useMutation<void, Error, string>({
		mutationFn: async (id) => {
			await apiClient<unknown>({
				url: `/v2/dictionaries/${id}`,
				method: "DELETE",
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["v2-dictionaries"] });
			queryClient.removeQueries({ queryKey: ["v2-dictionaries", "json"] });
		},
	});
};

export const useBulkDeleteV2Dictionaries = () => {
	const queryClient = useQueryClient();

	return useMutation<BulkDeleteV2DictionariesResultDto, Error, string[]>({
		mutationFn: (ids) =>
			apiClient<BulkDeleteV2DictionariesResultDto>({
				url: "/v2/dictionaries/bulk-delete",
				method: "POST",
				data: { ids },
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["v2-dictionaries"] });
			queryClient.removeQueries({ queryKey: ["v2-dictionaries", "json"] });
		},
	});
};

export const useBulkResetV2Dictionaries = () => {
	const queryClient = useQueryClient();

	return useMutation<BulkResetV2DictionariesResultDto, Error, string[]>({
		mutationFn: (ids) =>
			apiClient<BulkResetV2DictionariesResultDto>({
				url: "/v2/dictionaries/bulk-reset",
				method: "POST",
				data: { ids },
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["v2-dictionaries"] });
			queryClient.invalidateQueries({ queryKey: ["v2-dictionaries", "json"] });
		},
	});
};

export const useResetV2DictionaryToDefault = () => {
	const queryClient = useQueryClient();

	return useMutation<V2DictionaryDto, Error, string>({
		mutationFn: (id) =>
			apiClient<V2DictionaryDto>({
				url: `/v2/dictionaries/${id}/reset-default`,
				method: "POST",
			}),
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: ["v2-dictionaries"] });
			queryClient.invalidateQueries({ queryKey: ["v2-dictionaries", id] });
			queryClient.invalidateQueries({
				queryKey: ["v2-dictionaries", id, "items"],
			});
			queryClient.invalidateQueries({ queryKey: ["v2-dictionaries", "json"] });
		},
	});
};

// Dictionary Items
export const useV2DictionaryItems = (dictionaryId: string) => {
	return useQuery<V2DictionaryItemDto[]>({
		queryKey: ["v2-dictionaries", dictionaryId, "items"],
		queryFn: () =>
			apiClient<V2DictionaryItemDto[]>({
				url: `/v2/dictionaries/${dictionaryId}/items`,
				method: "GET",
			}),
		enabled: !!dictionaryId,
	});
};

export const useV2DictionaryItem = (itemId: string) => {
	return useQuery<V2DictionaryItemDto>({
		queryKey: ["v2-dictionaries", "items", itemId],
		queryFn: () =>
			apiClient<V2DictionaryItemDto>({
				url: `/v2/dictionaries/items/${itemId}`,
				method: "GET",
			}),
		enabled: !!itemId,
	});
};

export const useCreateV2DictionaryItem = () => {
	const queryClient = useQueryClient();

	return useMutation<
		V2DictionaryItemDto,
		Error,
		{ dictionaryId: string; dto: CreateV2DictionaryItemRequestDto }
	>({
		mutationFn: ({ dictionaryId, dto }) =>
			apiClient<V2DictionaryItemDto>({
				url: `/v2/dictionaries/${dictionaryId}/items`,
				method: "POST",
				data: dto,
			}),
		onSuccess: (_, { dictionaryId }) => {
			queryClient.invalidateQueries({
				queryKey: ["v2-dictionaries", dictionaryId, "items"],
			});
			queryClient.invalidateQueries({
				queryKey: ["v2-dictionaries", dictionaryId, "field-usages"],
			});
			queryClient.invalidateQueries({ queryKey: ["v2-dictionaries", "json"] });
		},
	});
};

export const useUpdateV2DictionaryItem = () => {
	const queryClient = useQueryClient();

	return useMutation<
		V2DictionaryItemDto,
		Error,
		{ itemId: string; dto: UpdateV2DictionaryItemRequestDto }
	>({
		mutationFn: ({ itemId, dto }) =>
			apiClient<V2DictionaryItemDto>({
				url: `/v2/dictionaries/items/${itemId}`,
				method: "PUT",
				data: dto,
			}),
		onSuccess: (item) => {
			queryClient.invalidateQueries({
				queryKey: ["v2-dictionaries", item.dictionaryId, "items"],
			});
			queryClient.invalidateQueries({
				queryKey: ["v2-dictionaries", item.dictionaryId, "field-usages"],
			});
			queryClient.invalidateQueries({ queryKey: ["v2-dictionaries", "json"] });
		},
	});
};

export const useDeleteV2DictionaryItem = () => {
	const queryClient = useQueryClient();

	return useMutation<void, Error, string>({
		mutationFn: async (itemId) => {
			await apiClient<unknown>({
				url: `/v2/dictionaries/items/${itemId}`,
				method: "DELETE",
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["v2-dictionaries"] });
			queryClient.invalidateQueries({ queryKey: ["v2-dictionaries", "json"] });
		},
	});
};

export const useV2DictionaryAsJson = (code: string) => {
	return useQuery<Record<string, unknown>>({
		queryKey: ["v2-dictionaries", "json", code],
		queryFn: () =>
			apiClient<Record<string, unknown>>({
				url: `/v2/dictionaries/json/${code}`,
				method: "GET",
			}),
		enabled: !!code,
	});
};

/** Загрузка enum для всех указанных кодов словарников одним bulk-запросом. */
export const useV2DictionaryEnumsMaps = (dictionaryCodes: string[]) => {
	const uniqueSorted = useMemo(
		() =>
			[
				...new Set(
					dictionaryCodes.filter(
						(c) => typeof c === "string" && String(c).trim(),
					),
				),
			].sort(),
		[dictionaryCodes],
	);

	const { data, isPending } = useQuery<BulkV2DictionaryJsonResponseDto>({
		queryKey: ["v2-dictionaries", "json", "bulk", uniqueSorted],
		queryFn: () =>
			apiClient<BulkV2DictionaryJsonResponseDto>({
				url: "/v2/dictionaries/json/bulk",
				method: "POST",
				data: { codes: uniqueSorted },
			}),
		enabled: uniqueSorted.length > 0,
		staleTime: 5 * 60_000,
	});

	const enumMapByCode = useMemo(() => {
		const result: Record<
			string,
			{ enums: string[]; enumNames: string[] }
		> = {};
		if (!data) return result;
		for (const code of uniqueSorted) {
			const snapshot = data[code];
			if (!snapshot) continue;
			const parsed = parseDictionaryJsonToEnumPair(snapshot);
			if (parsed) result[code] = parsed;
		}
		return result;
	}, [data, uniqueSorted]);

	return { enumMapByCode, isLoading: isPending, uniqueSorted };
};

// Audit
export const useV2Audit = (templateId?: string, versionId?: string) => {
	return useQuery<V2TemplateAuditDto[]>({
		queryKey: ["v2-audit", templateId, versionId],
		queryFn: () => {
			const params = new URLSearchParams();
			if (templateId) params.append("templateId", templateId);
			if (versionId) params.append("versionId", versionId);

			return apiClient<V2TemplateAuditDto[]>({
				url: `/v2/audit?${params.toString()}`,
				method: "GET",
			});
		},
	});
};
