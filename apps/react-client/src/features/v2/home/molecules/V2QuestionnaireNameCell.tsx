import type { ICellRendererParams } from "ag-grid-community";
import { AgGridRouterLink } from "@react-client/common/tableStuff/AgGridRouterLink";
import { pathForV2QuestionnairePreview } from "@react-client/routing/common/pathHelpers";
import type { V2QuestionnaireGridRow } from "../types/v2QuestionnaireGrid.types";
import { resolveVersionRow } from "../utils/v2QuestionnaireGridValue";

export type V2QuestionnaireGridContext = {
	editLockHardDisable?: boolean;
};

/** Название / id анкеты — настоящая ссылка для ПКМ браузера. */
export function V2QuestionnaireNameCell(
	params: ICellRendererParams<V2QuestionnaireGridRow>,
) {
	const row = resolveVersionRow(params.data);
	const editLockHardDisable = Boolean(
		(params.context as V2QuestionnaireGridContext | undefined)
			?.editLockHardDisable,
	);
	if (!row) return null;

	const label =
		(typeof params.value === "string" && params.value) ||
		row.displayLabel ||
		row.calcName ||
		row.readableId ||
		row.id;

	const hardLocked = editLockHardDisable && row.isEditLocked;
	if (hardLocked) {
		return (
			<span title="Анкета сейчас редактируется">{label}</span>
		);
	}

	return (
		<AgGridRouterLink
			to={pathForV2QuestionnairePreview(row.id)}
			title={
				row.isEditLocked
					? "Анкета уже редактируется — можно открыть"
					: "Открыть анкету"
			}
		>
			{label}
		</AgGridRouterLink>
	);
}
