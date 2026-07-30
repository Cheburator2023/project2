import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ICellRendererParams } from "ag-grid-community";
import { useQuestionnaireEditLocksStore } from "@react-client/features/v2/anketaCRUD/stores/questionnaireEditLocksStore";
import { resolveVersionRow } from "../utils/v2QuestionnaireGridValue";
import type { V2QuestionnaireGridRow } from "../types/v2QuestionnaireGrid.types";

export function V2EditLockStatusCell(
	params: ICellRendererParams<V2QuestionnaireGridRow>,
) {
	const row = resolveVersionRow(params.data);
	const id = row?.id;
	const lock = useQuestionnaireEditLocksStore((s) =>
		id ? s.locksById[id] : undefined,
	);
	if (!lock) {
		return (
			<Typography variant="caption" color="text.secondary">
				—
			</Typography>
		);
	}
	return (
		<Box
			sx={{
				display: "inline-flex",
				alignItems: "center",
				gap: 0.75,
				px: 1,
				py: 0.25,
				borderRadius: 1,
				bgcolor: "warning.50",
				border: "1px solid",
				borderColor: "warning.light",
			}}
			title="Анкета сейчас редактируется"
		>
			<Box
				sx={{
					width: 8,
					height: 8,
					borderRadius: "50%",
					bgcolor: "warning.main",
					flexShrink: 0,
				}}
			/>
			<Typography
				variant="caption"
				fontWeight={700}
				color="warning.dark"
				noWrap
			>
				Редактируется
			</Typography>
		</Box>
	);
}
