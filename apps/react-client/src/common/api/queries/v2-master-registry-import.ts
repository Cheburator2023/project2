import { apiClient, API_HEAVY_OPERATION_TIMEOUT_MS } from "../helpers/apiClient";

export type V2MasterRegistryIssue = {
	code: "dept_unmatched" | "stream_unmatched" | "prod_invalid" | "name_missing";
	value?: string;
	suggestions?: string[];
};

export type V2MasterRegistryIssueRow = {
	masterRow: number;
	masterNo: string;
	calcName: string;
	code: V2MasterRegistryIssue["code"];
	value?: string;
	suggestions?: string[];
};

export type V2MasterRegistryCandidate = {
	masterRow: number;
	masterNo: string;
	calcName: string;
	issues: V2MasterRegistryIssue[];
};

export type V2MasterRegistryImportOverrides = {
	departments?: Record<string, string>;
	streams?: Record<string, string>;
	production?: Record<string, string>;
};

export type V2MasterRegistryImportResult = {
	dryRun: boolean;
	sheetName: string;
	budgetCampaignColumn: number | null;
	stats: {
		rowsTotal: number;
		rowsSkippedEmpty: number;
		rowsReady: number;
		rowsWithoutName: number;
		mapped: Record<string, number>;
		issues: Record<string, number>;
	};
	appliedOverrides: V2MasterRegistryImportOverrides;
	catalog: {
		departments: string[];
	};
	candidates: V2MasterRegistryCandidate[];
	created: Array<{
		masterRow: number;
		masterNo: string;
		id: string;
		calcName: string;
	}>;
	failed: Array<{
		masterRow: number;
		masterNo: string;
		calcName: string;
		message: string;
	}>;
	issues: V2MasterRegistryIssueRow[];
	preview: Array<{
		masterRow: number;
		masterNo: string;
		calcName: string;
		formData: {
			meta: Record<string, unknown>;
			generalInfo: Record<string, unknown>;
		};
		issues: V2MasterRegistryIssue[];
	}>;
};

export const importV2MasterRegistry = async (
	file: File,
	options: {
		dryRun: boolean;
		templateId?: string;
		overrides?: V2MasterRegistryImportOverrides;
		masterRows?: number[];
	},
	signal?: AbortSignal,
): Promise<V2MasterRegistryImportResult> => {
	const formData = new FormData();
	formData.append("file", file);
	if (options.overrides) {
		formData.append("overrides", JSON.stringify(options.overrides));
	}
	if (options.masterRows && options.masterRows.length > 0) {
		formData.append("masterRows", JSON.stringify(options.masterRows));
	}
	const params = new URLSearchParams({
		dryRun: options.dryRun ? "true" : "false",
	});
	if (options.templateId) {
		params.set("templateId", options.templateId);
	}
	return apiClient<V2MasterRegistryImportResult>({
		url: `/v2/questionnaires/import-master-registry?${params.toString()}`,
		method: "POST",
		data: formData,
		headers: { "Content-Type": undefined },
		signal,
		timeout: API_HEAVY_OPERATION_TIMEOUT_MS,
	});
};
