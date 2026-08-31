import Typography from "@mui/material/Typography";
import { kanbanBoardTextLengthHint } from "@smart-anketa/api-contract";

type Props = {
	length: number;
	max: number;
};

export function KanbanFieldLengthHint({ length, max }: Props) {
	const hint = kanbanBoardTextLengthHint(length, max);
	return (
		<Typography
			variant="caption"
			color={
				hint.over ? "error" : hint.near ? "warning.main" : "text.secondary"
			}
			component="span"
			sx={{ whiteSpace: hint.over ? "normal" : "nowrap" }}
			title={
				hint.over
					? hint.text
					: `Лимит ${max} символов. Дальше сохранение не пройдёт.`
			}
		>
			{hint.text}
		</Typography>
	);
}
