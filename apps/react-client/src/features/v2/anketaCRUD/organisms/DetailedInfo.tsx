import AddIcon from "@mui/icons-material/Add";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
	Box,
	Button,
	Chip,
	FormControl,
	Grid,
	Link,
	MenuItem,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";
import { SelectWithPlaceholder } from "@react-client/common/muiCustom/SelectWithPlaceholder";

const systems = [
	{
		name: "CRM Retail",
		type: "Внутренний",
		replica: true,
		requirements: "Понятны",
	},
	{
		name: "DWH Profile",
		type: "Внутренний",
		replica: false,
		requirements: "Неясны",
	},
];

const statusChip = (label: string, color: string) => (
	<Chip
		label={label}
		size="small"
		sx={{
			fontWeight: 500,
			color: "#fff",
			backgroundColor: color,
		}}
	/>
);

export function DetailedInfo() {
	return (
		<AnketaSectionAccordion title="Детальная информация" titleVariant="h5">
			<Typography variant="h6" fontWeight={700} mb={2}>
				Параметры
			</Typography>

			<Grid container spacing={2} mb={3} sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormControl fullWidth size="small">
						<SelectWithPlaceholder
							placeholder="Параметр 1"
							defaultValue="x0.75"
							renderSelected={(selected) => {
								if (selected === "x0.75") return "×0.75";
								if (selected === "x1") return "×1";
								return "×1.25";
							}}
						>
							<MenuItem value="x0.75">×0.75</MenuItem>
							<MenuItem value="x1">×1</MenuItem>
							<MenuItem value="x1.25">×1.25</MenuItem>
						</SelectWithPlaceholder>
					</FormControl>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormControl fullWidth size="small">
						<SelectWithPlaceholder
							placeholder="Параметр 2"
							defaultValue="none"
							renderSelected={(selected) =>
								selected === "required" ? "Требуется" : "Не требуется"
							}
						>
							<MenuItem value="none">Не требуется</MenuItem>
							<MenuItem value="required">Требуется</MenuItem>
						</SelectWithPlaceholder>
					</FormControl>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormControl fullWidth size="small">
						<SelectWithPlaceholder placeholder="Параметр 3" defaultValue="+10%">
							<MenuItem value="+10%">+10%</MenuItem>
							<MenuItem value="+20%">+20%</MenuItem>
						</SelectWithPlaceholder>
					</FormControl>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormControl fullWidth size="small">
						<SelectWithPlaceholder
							placeholder="Параметр 4"
							defaultValue="yes"
							renderSelected={(selected) => (selected === "yes" ? "Да" : "Нет")}
						>
							<MenuItem value="yes">Да</MenuItem>
							<MenuItem value="no">Нет</MenuItem>
						</SelectWithPlaceholder>
					</FormControl>
				</Grid>
			</Grid>

			<Typography variant="h6" fontWeight={700} mb={1.5}>
				Системы источники
			</Typography>

			<TableContainer
				sx={{
					width: "100%",
					maxWidth: "100%",
					border: "1px solid #E5E7EB",
					borderRadius: 2,
				}}
			>
				<Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
					<TableHead>
						<TableRow sx={{ backgroundColor: "#FAFAFA" }}>
							<TableCell sx={{ fontWeight: 600 }}>Источник</TableCell>
							<TableCell sx={{ fontWeight: 600, width: "18%" }}>Тип</TableCell>
							<TableCell sx={{ fontWeight: 600, width: "18%" }}>Реплика</TableCell>
							<TableCell sx={{ fontWeight: 600, width: "18%" }}>Требования</TableCell>
							<TableCell sx={{ fontWeight: 600, width: "12%" }}>Конфид.</TableCell>
							<TableCell sx={{ fontWeight: 600, width: "12%" }}>NDA</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{systems.map((system) => (
							<TableRow key={system.name} hover>
								<TableCell sx={{ wordBreak: "break-word" }}>
									<Link
										href="#"
										underline="none"
										color="inherit"
										sx={{
											display: "inline-flex",
											alignItems: "center",
											gap: 0.5,
											fontWeight: 500,
											maxWidth: "100%",
										}}
									>
										{system.name}
										<OpenInNewIcon sx={{ fontSize: 14, flexShrink: 0 }} />
									</Link>
								</TableCell>
								<TableCell>{system.type}</TableCell>
								<TableCell>
									{system.replica
										? statusChip("Есть", "#2E7D32")
										: statusChip("Нет", "#D32F2F")}
								</TableCell>
								<TableCell>
									{system.requirements === "Понятны"
										? statusChip("Понятны", "#2E7D32")
										: statusChip("Неясны", "#D32F2F")}
								</TableCell>
								<TableCell>
									<Chip label="Нет" size="small" />
								</TableCell>
								<TableCell>
									<Chip label="Нет" size="small" />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>

			<Box mt={2}>
				<Button variant="outlined" startIcon={<AddIcon />} size="small">
					Добавить систему
				</Button>
			</Box>
		</AnketaSectionAccordion>
	);
}
