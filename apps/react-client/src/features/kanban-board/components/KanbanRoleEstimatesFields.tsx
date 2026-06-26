import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
	KANBAN_BOARD_ROLE_ESTIMATE_FIELDS,
	kanbanBoardRoleEstimatesTotal,
	type KanbanBoardRoleEstimates,
} from "@smart-anketa/api-contract";

type Props = {
	value: KanbanBoardRoleEstimates;
	onChange: (next: KanbanBoardRoleEstimates) => void;
	disabled?: boolean;
};

export function KanbanRoleEstimatesFields({ value, onChange, disabled }: Props) {
	const total = kanbanBoardRoleEstimatesTotal(value);

	const setRole = (key: keyof KanbanBoardRoleEstimates, raw: string) => {
		const parsed = raw.trim() ? Number(raw) : undefined;
		const next = { ...value };
		if (parsed === undefined || Number.isNaN(parsed)) {
			delete next[key];
		} else {
			next[key] = parsed;
		}
		onChange(next);
	};

	return (
		<Stack spacing={1}>
			<Stack direction="row" alignItems="baseline" justifyContent="space-between">
				<Typography variant="subtitle2">Оценка по ролям, чд</Typography>
				{total !== undefined ? (
					<Typography variant="caption" color="text.secondary">
						Итого: {total} чд
					</Typography>
				) : null}
			</Stack>
			<Stack direction={{ xs: "column", md: "row" }} spacing={1} useFlexGap flexWrap="wrap">
				{KANBAN_BOARD_ROLE_ESTIMATE_FIELDS.map((field) => (
					<TextField
						key={field.key}
						label={field.title}
						type="number"
						size="small"
						value={value[field.key] ?? ""}
						onChange={(event) => setRole(field.key, event.target.value)}
						disabled={disabled}
						sx={{ flex: "1 1 120px", minWidth: 120 }}
						inputProps={{ min: 0, step: 0.5 }}
					/>
				))}
			</Stack>
		</Stack>
	);
}
