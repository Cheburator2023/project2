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
	};
	stats: V2DataImportStats;
}

export const v2DataTransferExport = (signal?: AbortSignal) =>
	apiClient<Blob>({
		url: "/v2/data-transfer/export",
		method: "GET",
		signal,
		responseType: "blob",
		timeout: 120_000,
	});

export const v2DataTransferImport = async (
	file: File,
	mode: V2DataImportMode,
	signal?: AbortSignal,
): Promise<V2DataImportResult> => {
	const formData = new FormData();
	formData.append("file", file);
	return apiClient<V2DataImportResult>({
		url: `/v2/data-transfer/import?mode=${mode}`,
		method: "POST",
		data: formData,
		headers: { "Content-Type": undefined },
		signal,
		timeout: 120_000,
	});
};

export { downloadBlob };
