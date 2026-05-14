import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
	V2DictionaryItemDto,
	V2TemplateAuditDto,
	V2TemplateDto,
	V2TemplateVersionDto,
} from "@smart-anketa/api-contract";
import { apiClient } from "../helpers/apiClient";

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
		onSuccess: (_, { itemId }) => {
			queryClient.invalidateQueries({
				queryKey: ["v2-dictionaries", "items", itemId],
			});
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
		onSuccess: (_, itemId) => {
			queryClient.invalidateQueries({ queryKey: ["v2-dictionaries", "items", itemId] });
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
