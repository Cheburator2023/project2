import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE,
	buildFactoryImplementationStreamCatalog,
	normalizeImplementationStreamCatalogEntry,
	type V2ImplementationStreamCatalogEntry,
	type V2ImplementationStreamPayload,
} from "@smart-anketa/api-contract";
import { apiClient } from "../helpers/apiClient";
import {
	useCreateV2DictionaryItem,
	useDeleteV2DictionaryItem,
	useUpdateV2DictionaryItem,
	useV2DictionaryByCode,
	useV2DictionaryItems,
} from "./v2-templates";

export type V2StreamCatalogRow = {
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

export function useV2StreamsDictionary() {
	return useV2DictionaryByCode(V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE);
}

export function useV2StreamsRegistryItems() {
	const dictionaryQuery = useV2StreamsDictionary();
	const dictionaryId = dictionaryQuery.data?.id ?? "";
	const itemsQuery = useV2DictionaryItems(dictionaryId);
	return {
		dictionary: dictionaryQuery.data,
		dictionaryId,
		items: itemsQuery.data ?? [],
		isLoading: dictionaryQuery.isLoading || itemsQuery.isLoading,
		isError: dictionaryQuery.isError || itemsQuery.isError,
		refetch: async () => {
			await dictionaryQuery.refetch();
			await itemsQuery.refetch();
		},
	};
}

export function useInvalidateV2StreamCatalog() {
	const queryClient = useQueryClient();
	return () => {
		void queryClient.invalidateQueries({ queryKey: STREAMS_QUERY_KEY });
		void queryClient.invalidateQueries({ queryKey: ["v2-dictionaries"] });
		void queryClient.invalidateQueries({
			queryKey: ["v2-dictionaries", "json"],
		});
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
	return (
		entry?.payload ?? {
			storeCode: true,
			dbNames: splitCsv(input.dbNames),
			legacyLabels: splitCsv(input.legacyLabels),
			keycloakAliases: splitCsv(input.keycloakAliases),
			v1Labels: splitCsv(input.v1Labels),
			isModelStream: isUmbrellaStream ? false : input.isModelStream,
			isUmbrellaStream,
		}
	);
}

export function useCreateV2StreamItem() {
	const createItem = useCreateV2DictionaryItem();
	const invalidate = useInvalidateV2StreamCatalog();
	return useMutation({
		mutationFn: async ({
			dictionaryId,
			input,
		}: {
			dictionaryId: string;
			input: StreamRegistryItemInput;
		}) =>
			createItem.mutateAsync({
				dictionaryId,
				dto: {
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
	const updateItem = useUpdateV2DictionaryItem();
	const invalidate = useInvalidateV2StreamCatalog();
	return useMutation({
		mutationFn: async ({
			itemId,
			input,
		}: {
			itemId: string;
			input: StreamRegistryItemInput;
		}) =>
			updateItem.mutateAsync({
				itemId,
				dto: {
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
	const deleteItem = useDeleteV2DictionaryItem();
	const invalidate = useInvalidateV2StreamCatalog();
	return useMutation({
		mutationFn: async (itemId: string) => deleteItem.mutateAsync(itemId),
		onSuccess: () => invalidate(),
	});
}
