import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ICellRendererParams } from "ag-grid-community";
import { useQuestionnaireEditLocksStore } from "@react-client/features/v2/anketaCRUD/stores/questionnaireEditLocksStore";
import { isOwnV2QuestionnaireEditLock } from "@react-client/features/v2/anketaCRUD/utils/isOwnV2QuestionnaireEditLock";
import { useUserStore } from "@react-client/common/store/userStore";
import { resolveVersionRow } from "../utils/v2QuestionnaireGridValue";
import type { V2QuestionnaireGridRow } from "../types/v2QuestionnaireGrid.types";

export function V2EditLockStatusCell(
	params: ICellRendererParams<V2QuestionnaireGridRow>,
) {
	const row = resolveVersionRow(params.data);
	const id = row?.id;
	const username = useUserStore((s) => s.username);
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
	const isOwn = isOwnV2QuestionnaireEditLock(lock, username);
	return (
		<Box
			sx={{
				display: "inline-flex",
				alignItems: "center",
				gap: 0.75,
				px: 1,
				py: 0.25,
				borderRadius: 1,
				bgcolor: isOwn ? "info.50" : "warning.50",
				border: "1px solid",
				borderColor: isOwn ? "info.light" : "warning.light",
			}}
			title={
				isOwn
					? "Вы редактируете эту анкету"
					: "Анкета сейчас редактируется"
			}
		>
			<Box
				sx={{
					width: 8,
					height: 8,
					borderRadius: "50%",
					bgcolor: isOwn ? "info.main" : "warning.main",
					flexShrink: 0,
				}}
			/>
			<Typography
				variant="caption"
				fontWeight={700}
				color={isOwn ? "info.dark" : "warning.dark"}
				noWrap
			>
				{isOwn ? "Вы редактируете" : "Редактируется"}
			</Typography>
		</Box>
	);
}
