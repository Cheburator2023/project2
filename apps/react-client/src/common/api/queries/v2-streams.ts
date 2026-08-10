import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	buildFactoryImplementationStreamCatalog,
	normalizeImplementationStreamCatalogEntry,
	type V2ImplementationStreamCatalogEntry,
	type V2ImplementationStreamPayload,
} from "@smart-anketa/api-contract";
import { apiClient } from "../helpers/apiClient";

export type V2StreamCatalogRow = {
	id: string;
	code: string;
	label: string;
	order: number;
	isActive: boolean;
	dbNames: string[];
	legacyLabels: string[];
	keycloakAliases: string[];
	isModelStream: boolean;
	isUmbrellaStream: boolean;
	v1Labels: string[];
	payload: V2ImplementationStreamPayload;
};

const STREAMS_QUERY_KEY = ["v2-streams"] as const;

export function useV2StreamCatalog(options?: { includeInactive?: boolean }) {
	const includeInactive = options?.includeInactive === true;
	return useQuery<V2StreamCatalogRow[]>({
		queryKey: [...STREAMS_QUERY_KEY, { includeInactive }],
		queryFn: () =>
			apiClient<V2StreamCatalogRow[]>({
				url: `/v2/streams${includeInactive ? "?includeInactive=1" : ""}`,
				method: "GET",
			}),
		staleTime: 30_000,
	});
}

/** Каталог для конструктора / логики: API → factory fallback. */
export function useV2ImplementationStreamCatalog(options?: {
	includeInactive?: boolean;
}): {
	catalog: V2ImplementationStreamCatalogEntry[];
	/** Коды стрим-исполнителей без зонтичных (для анкеты / дочерних). */
	codes: string[];
	/** Зонтичные стримы (общий каталог типовых работ). */
	umbrellaCatalog: V2ImplementationStreamCatalogEntry[];
	labelByCode: Record<string, string>;
	isLoading: boolean;
	isError: boolean;
	refetch: () => void;
} {
	const query = useV2StreamCatalog(options);
	const catalog: V2ImplementationStreamCatalogEntry[] =
		query.data?.map((row) => ({
			code: row.code,
			label: row.label,
			order: row.order,
			isActive: row.isActive,
			payload: row.payload,
		})) ?? buildFactoryImplementationStreamCatalog();

	const visible = options?.includeInactive
		? catalog
		: catalog.filter((entry) => entry.isActive);

	const umbrellaCatalog = visible.filter(
		(entry) => entry.payload.isUmbrellaStream,
	);
	const active = visible.filter((entry) => !entry.payload.isUmbrellaStream);

	const labelByCode: Record<string, string> = {};
	for (const entry of active) {
		labelByCode[entry.code] = entry.label;
	}
	for (const entry of umbrellaCatalog) {
		labelByCode[entry.code] = entry.label;
	}

	return {
		catalog: active,
		codes: active.map((entry) => entry.code),
		umbrellaCatalog,
		labelByCode,
		isLoading: query.isLoading,
		isError: query.isError,
		refetch: () => {
			void query.refetch();
		},
	};
}

/** Реестр стримов (таблица v2_stream), включая неактивные. */
export function useV2StreamsRegistryItems() {
	const query = useV2StreamCatalog({ includeInactive: true });
	return {
		items: query.data ?? [],
		isLoading: query.isLoading,
		isError: query.isError,
		refetch: async () => {
			await query.refetch();
		},
	};
}

export function useInvalidateV2StreamCatalog() {
	const queryClient = useQueryClient();
	return () => {
		void queryClient.invalidateQueries({ queryKey: STREAMS_QUERY_KEY });
	};
}

export type StreamRegistryItemInput = {
	code: string;
	label: string;
	order: number;
	isActive: boolean;
	dbNames: string;
	legacyLabels: string;
	keycloakAliases: string;
	v1Labels: string;
	isModelStream: boolean;
	isUmbrellaStream: boolean;
};

function splitCsv(value: string): string[] {
	return value
		.split(/[,;\n]/)
		.map((part) => part.trim())
		.filter(Boolean);
}

export function buildStreamItemPayload(
	input: StreamRegistryItemInput,
): V2ImplementationStreamPayload {
	const isUmbrellaStream = input.isUmbrellaStream === true;
	const entry = normalizeImplementationStreamCatalogEntry({
		code: input.code,
		label: input.label,
		order: input.order,
		isActive: input.isActive,
		payload: {
			storeCode: true,
			dbNames: splitCsv(input.dbNames),
			legacyLabels: splitCsv(input.legacyLabels),
			keycloakAliases: splitCsv(input.keycloakAliases),
			v1Labels: splitCsv(input.v1Labels),
			isModelStream: isUmbrellaStream ? false : input.isModelStream,
			isUmbrellaStream,
		},
	});
	if (!entry) {
		throw new Error("Некорректный код/подпись стрима");
	}
	return entry.payload;
}

export function useCreateV2StreamItem() {
	const invalidate = useInvalidateV2StreamCatalog();
	return useMutation({
		mutationFn: async (input: StreamRegistryItemInput) =>
			apiClient<V2StreamCatalogRow>({
				url: "/v2/streams",
				method: "POST",
				data: {
					code: input.code.trim().toLowerCase(),
					label: input.label.trim(),
					order: input.order,
					isActive: input.isActive,
					payload: buildStreamItemPayload(input),
				},
			}),
		onSuccess: () => invalidate(),
	});
}

export function useUpdateV2StreamItem() {
	const invalidate = useInvalidateV2StreamCatalog();
	return useMutation({
		mutationFn: async ({
			itemId,
			input,
		}: {
			itemId: string;
			input: StreamRegistryItemInput;
		}) =>
			apiClient<V2StreamCatalogRow>({
				url: `/v2/streams/${itemId}`,
				method: "PUT",
				data: {
					label: input.label.trim(),
					order: input.order,
					isActive: input.isActive,
					payload: buildStreamItemPayload(input),
				},
			}),
		onSuccess: () => invalidate(),
	});
}

export function useDeleteV2StreamItem() {
	const invalidate = useInvalidateV2StreamCatalog();
	return useMutation({
		mutationFn: async (itemId: string) =>
			apiClient<void>({
				url: `/v2/streams/${itemId}`,
				method: "DELETE",
			}),
		onSuccess: () => invalidate(),
	});
}
