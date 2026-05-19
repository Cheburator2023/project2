import {
	useMutation,
	useQueries,
	useQuery,
	useQueryClient,
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
	V2DictionaryDto,
	V2DictionaryFieldUsageDto,
	V2DictionaryItemDto,
	BulkDeleteV2DictionariesResultDto,
	BulkResetV2DictionariesResultDto,
	V2TemplateAuditDto,
	V2TemplateDto,
	V2TemplateVersionDto,
} from "@smart-anketa/api-contract";
import { useMemo } from "react";

import { apiClient } from "../helpers/apiClient";

/** Разбор тела `/v2/dictionaries/json/:code` для enum в превью конструктора. */
function parseDictionaryJsonResponse(data: unknown): {
	enums: string[];
	enumNames: string[];
} | null {
	if (!data || typeof data !== "object") return null;
	const raw = data as Record<string, unknown>;
	const items = raw.items;
	if (!Array.isArray(items)) return null;
	const enums: string[] = [];
	const enumNames: string[] = [];
	for (const it of items) {
		if (!it || typeof it !== "object") continue;
		const row = it as Record<string, unknown>;
		const code = row.code;
		if (typeof code !== "string" || !code.trim()) continue;
		enums.push(code);
		const label = row.label;
		enumNames.push(typeof label === "string" && label.trim() ? label : code);
	}
	if (!enums.length) return null;
	return { enums, enumNames };
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
			queryClient.invalidateQueries({ queryKey: ["v2-templates"] });
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
			queryClient.invalidateQueries({ queryKey: ["v2-templates"] });
			queryClient.invalidateQueries({ queryKey: ["v2-templates", id] });
		},
	});
};

export const useDeleteV2Template = () => {
	const queryClient = useQueryClient();

	return useMutation<void, Error, string>({
		mutationFn: async (id) => {
			await apiClient<unknown>({
				url: `/v2/templates/${id}`,
				method: "DELETE",
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["v2-templates"] });
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
		onSuccess: (_, { templateId }) => {
			queryClient.invalidateQueries({ queryKey: ["v2-templates"] });
			queryClient.invalidateQueries({
				queryKey: ["v2-templates", templateId, "versions"],
			});
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
			queryClient.invalidateQueries({ queryKey: ["v2-templates"] });
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
			queryClient.invalidateQueries({ queryKey: ["v2-dictionaries", "json"] });
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

/** Параллельная загрузка enum для всех указанных кодов словарников (превью V2). */
export const useV2DictionaryEnumsMaps = (dictionaryCodes: string[]) => {
	const uniqueSorted = useMemo(
		() =>
			[
				...new Set(
					dictionaryCodes.filter((c) => typeof c === "string" && String(c).trim()),
				),
			].sort(),
		[dictionaryCodes],
	);

	const queries = useQueries({
		queries: uniqueSorted.map((code) => ({
			queryKey: ["v2-dictionaries", "json", code] as const,
			queryFn: () =>
				apiClient<Record<string, unknown>>({
					url: `/v2/dictionaries/json/${encodeURIComponent(code)}`,
					method: "GET",
				}),
			enabled: !!code,
			staleTime: 30_000,
		})),
	});

	const enumMapByCode: Record<string, { enums: string[]; enumNames: string[] }> =
		{};
	for (let i = 0; i < uniqueSorted.length; i++) {
		const code = uniqueSorted[i]!;
		const row = queries[i];
		if (row?.data) {
			const parsed = parseDictionaryJsonResponse(row.data);
			if (parsed) enumMapByCode[code] = parsed;
		}
	}

	const isLoading = queries.some((q) => q.isPending || q.isFetching);

	return { enumMapByCode, isLoading, uniqueSorted };
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
