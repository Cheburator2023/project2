import type { ICellRendererParams } from "ag-grid-community";
import { useEditLockHardDisableFeature } from "@react-client/common/api/queries/v2-runtime-settings";
import { AgGridRouterLink } from "@react-client/common/tableStuff/AgGridRouterLink";
import { pathForV2QuestionnairePreview } from "@react-client/routing/common/pathHelpers";
import type { V2QuestionnaireGridRow } from "../types/v2QuestionnaireGrid.types";
import { resolveVersionRow } from "../utils/v2QuestionnaireGridValue";

/** Название / id анкеты — настоящая ссылка для ПКМ браузера. */
export function V2QuestionnaireNameCell(
	params: ICellRendererParams<V2QuestionnaireGridRow>,
) {
	const row = resolveVersionRow(params.data);
	const editLockHardDisable = useEditLockHardDisableFeature();
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
