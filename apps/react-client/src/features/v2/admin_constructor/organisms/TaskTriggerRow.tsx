import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import type { TaskTriggerItem } from "../utils/calculationEngine";

export function TaskTriggerRow({ item }: { item: TaskTriggerItem }) {
	const hintText = [
		item.hint || "Триггер типовой работы.",
		`Код: ${item.taskCode}`,
		`Сработал: ${item.passes ? "да" : "нет"}`,
	]
		.filter(Boolean)
		.join("\n");

	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				gap: 1,
				px: 1,
				py: 0.75,
				borderRadius: 1,
				border: 1,
				borderColor: item.passes ? "success.light" : "divider",
				bgcolor: item.passes ? "action.selected" : "background.paper",
				opacity: item.passes ? 1 : 0.7,
			}}
		>
			<Chip
				size="small"
				label={item.taskCode}
				color={item.passes ? "success" : "default"}
				variant="outlined"
				sx={{ height: 20 }}
			/>
			<Typography
				variant="body2"
				sx={{ flex: 1, minWidth: 0 }}
				noWrap
				title={item.label}
			>
				{item.label}
			</Typography>
			<Chip
				size="small"
				label={item.passes ? "Появится" : "Нет"}
				color={item.passes ? "success" : "default"}
				variant={item.passes ? "filled" : "outlined"}
				sx={{ height: 20, flexShrink: 0 }}
			/>
			<IconButton size="small" title={hintText} aria-label="Подсказка">
				<InfoOutlinedIcon sx={{ fontSize: 16 }} />
			</IconButton>
		</Box>
	);
}
