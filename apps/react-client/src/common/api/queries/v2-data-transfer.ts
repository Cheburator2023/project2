import {
	serializeV2DataTransferSections,
	V2_DATA_TRANSFER_DEFAULT_SECTIONS,
	type V2DataTransferSection,
} from "@smart-anketa/api-contract";
import { apiClient } from "../helpers/apiClient";
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

export const v2DataTransferExport = (
	sections: readonly V2DataTransferSection[] = V2_DATA_TRANSFER_DEFAULT_SECTIONS,
	signal?: AbortSignal,
) =>
	apiClient<Blob>({
		url: `/v2/data-transfer/export?sections=${encodeURIComponent(serializeV2DataTransferSections(sections))}`,
		method: "GET",
		signal,
		responseType: "blob",
		timeout: 120_000,
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
		timeout: 120_000,
	});
};

export { downloadBlob };
