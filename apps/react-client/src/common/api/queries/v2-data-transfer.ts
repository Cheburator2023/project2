import {
	serializeV2DataTransferSections,
	V2_DATA_TRANSFER_DEFAULT_SECTIONS,
	type V2DataTransferSection,
} from "@smart-anketa/api-contract";
import { apiClient, API_HEAVY_OPERATION_TIMEOUT_MS } from "../helpers/apiClient";
import { downloadBlob } from "./kanban-board";

export type V2DataImportMode = "merge" | "replace";

export interface V2DataImportStats {
	mode: V2DataImportMode;
	inserted: Record<string, number>;
	skipped: Record<string, number>;
}

export interface V2DataImportResult {
	meta: {
		formatVersion: number;
		exportedAt: string;
		sha256: string;
		counts: Record<string, number>;
		sections?: V2DataTransferSection[];
	};
	stats: V2DataImportStats;
}

type V2DataTransferErrorBody = {
	message?: string | string[];
	expectedSha256?: string;
	actualSha256?: string;
};

export function formatV2DataTransferImportError(error: unknown): string {
	const body = (error as { response?: { data?: V2DataTransferErrorBody } })
		.response?.data;
	if (body?.expectedSha256 && body?.actualSha256) {
		return `Контрольная сумма файла не совпадает. Ожидалась ${body.expectedSha256}, получена ${body.actualSha256}. Файл мог быть изменён после выгрузки.`;
	}
	const message = body?.message;
	if (Array.isArray(message)) {
		return message.join(", ");
	}
	if (typeof message === "string" && message.trim()) {
		return message;
	}
	if (error instanceof Error && error.message) {
		return error.message;
	}
	return "Ошибка импорта";
}

export const v2DataTransferExport = (
	sections: readonly V2DataTransferSection[] = V2_DATA_TRANSFER_DEFAULT_SECTIONS,
	signal?: AbortSignal,
) =>
	apiClient<Blob>({
		url: `/v2/data-transfer/export?sections=${encodeURIComponent(serializeV2DataTransferSections(sections))}`,
		method: "GET",
		signal,
		responseType: "blob",
		timeout: API_HEAVY_OPERATION_TIMEOUT_MS,
	});

export const v2DataTransferImport = async (
	file: File,
	mode: V2DataImportMode,
	sections: readonly V2DataTransferSection[] = V2_DATA_TRANSFER_DEFAULT_SECTIONS,
	signal?: AbortSignal,
): Promise<V2DataImportResult> => {
	const formData = new FormData();
	formData.append("file", file);
	return apiClient<V2DataImportResult>({
		url: `/v2/data-transfer/import?mode=${mode}&sections=${encodeURIComponent(serializeV2DataTransferSections(sections))}`,
		method: "POST",
		data: formData,
		headers: { "Content-Type": undefined },
		signal,
		timeout: API_HEAVY_OPERATION_TIMEOUT_MS,
	});
};

export { downloadBlob };
