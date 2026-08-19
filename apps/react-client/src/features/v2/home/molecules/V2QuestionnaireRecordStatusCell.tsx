import type { ICellRendererParams } from "ag-grid-community";
import Chip from "@mui/material/Chip";
import { formatV2QuestionnaireStatus } from "@smart-anketa/api-contract";
import type { V2QuestionnaireGridRow } from "../types/v2QuestionnaireGrid.types";
import { resolveVersionRow } from "../utils/v2QuestionnaireGridValue";

const RECORD_STATUS_CHIP_COLOR: Record<
	string,
	"default" | "success" | "warning"
> = {
	active: "success",
	inactive: "warning",
	archived: "default",
};

/** Статус записи анкеты в реестре: Активная / Неактивная / Архив. */
export function V2QuestionnaireRecordStatusCell(
	params: ICellRendererParams<V2QuestionnaireGridRow>,
) {
	const status = resolveVersionRow(params.data)?.status;
	const label = formatV2QuestionnaireStatus(status);
	if (!label) return null;
	return (
		<Chip
			size="small"
			label={label}
			color={RECORD_STATUS_CHIP_COLOR[status ?? ""] ?? "default"}
			variant="outlined"
			title={label}
		/>
	);
}
