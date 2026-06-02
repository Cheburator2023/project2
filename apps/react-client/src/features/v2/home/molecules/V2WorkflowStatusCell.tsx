import type { ICellRendererParams } from "ag-grid-community";
import { AnketaSectionStatusChip } from "@react-client/features/v2/anketaCRUD/molecules/AnketaSectionStatusChip";
import type {
	V2AnketaMainSectionId,
	V2AnketaSectionStatus,
} from "@smart-anketa/api-contract";
import type { V2QuestionnaireGridRow } from "../types/v2QuestionnaireGrid.types";
import { resolveVersionRow } from "../utils/v2QuestionnaireGridValue";

export function V2WorkflowGlobalStatusCell(
	params: ICellRendererParams<V2QuestionnaireGridRow>,
) {
	const status = resolveVersionRow(params.data)?.workflowGlobalStatus;
	if (!status) return null;
	return <AnketaSectionStatusChip kind="global" status={status} />;
}

export function v2WorkflowSectionStatusCell(sectionId: V2AnketaMainSectionId) {
	return function V2WorkflowSectionStatusCell(
		params: ICellRendererParams<V2QuestionnaireGridRow>,
	) {
		const version = resolveVersionRow(params.data);
		const status = version?.workflowSectionStatuses?.[sectionId] as
			| V2AnketaSectionStatus
			| undefined;
		if (!status) return null;
		return <AnketaSectionStatusChip kind="section" status={status} />;
	};
}
