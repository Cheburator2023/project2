import type { ICellRendererParams } from "ag-grid-community";
import { AgGridRouterLink } from "@react-client/common/tableStuff/AgGridRouterLink";
import { pathForV2QuestionnairePreview } from "@react-client/routing/common/pathHelpers";
import type { V2QuestionnaireGridRow } from "../types/v2QuestionnaireGrid.types";
import { resolveVersionRow } from "../utils/v2QuestionnaireGridValue";

/** Название / id анкеты — настоящая ссылка для ПКМ браузера. */
export function V2QuestionnaireNameCell(
	params: ICellRendererParams<V2QuestionnaireGridRow>,
) {
	const row = resolveVersionRow(params.data);
	if (!row) return null;

	const label =
		(typeof params.value === "string" && params.value) ||
		row.displayLabel ||
		row.calcName ||
		row.readableId ||
		row.id;

	if (row.isEditLocked) {
		return (
			<span title="Анкета сейчас редактируется">{label}</span>
		);
	}

	return (
		<AgGridRouterLink
			to={pathForV2QuestionnairePreview(row.id)}
			title="Открыть анкету"
		>
			{label}
		</AgGridRouterLink>
	);
}
