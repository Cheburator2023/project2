import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

export function ExecutorStreamPresenceLabel({
	present,
}: {
	present: boolean;
}) {
	return (
		<Chip
			size="small"
			variant="outlined"
			label={present ? "в схеме" : "нет в схеме"}
			sx={{
				height: 20,
				ml: "auto",
				fontSize: "0.65rem",
				borderColor: present ? "#1f8a4d" : "#c62828",
				color: present ? "#1f8a4d" : "#c62828",
			}}
		/>
	);
}

export function ExecutorStreamPresenceHint({
	present,
}: {
	present: boolean;
}) {
	return (
		<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
			{present
				? "Стримовый блок есть в конструкторе — поля стрима участвуют в триггерах и коэффициентах."
				: "Стримовый блок в конструкторе отсутствует. Назначение работы в БД уже создано; расчёт подхватит её после появления блока стрима с этим исполнителем."}
		</Typography>
	);
}

export function ExecutorStreamMenuRow({
	stream,
	color,
	present,
	selected,
}: {
	stream: string;
	color: string;
	present: boolean;
	selected?: boolean;
}) {
	return (
		<Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
			<Box
				sx={{
					width: 8,
					height: 8,
					borderRadius: "2px",
					bgcolor: color,
					flexShrink: 0,
				}}
			/>
			<Typography sx={{ flex: 1, fontSize: 12.5, fontWeight: selected ? 600 : 400 }}>
				{stream}
			</Typography>
			<ExecutorStreamPresenceLabel present={present} />
		</Box>
	);
}
