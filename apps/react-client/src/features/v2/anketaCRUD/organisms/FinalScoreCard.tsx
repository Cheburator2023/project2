import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import {
	Box,
	Button,
	Card,
	CardContent,
	Divider,
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";

type ModelStreamRow = {
	id: string;
	stage: string;
	base: number;
	adjusted?: number;
	deviation?: number;
};

type PlatformStreamRow = {
	id: string;
	stream: string;
	base: number;
	adjusted: number;
	deviation: number;
	atypical: number;
};

const modelStreamData: ModelStreamRow[] = [
	{ id: "1", stage: "Постановка задачи", base: 33, adjusted: 25, deviation: -25 },
	{ id: "2", stage: "Поиск данных", base: 15 },
	{ id: "3", stage: "Построение витрины для разработки", base: 52 },
	{ id: "4", stage: "Разработка MVP", base: 40 },
	{ id: "5", stage: "Разработка модели", base: 37, adjusted: 55.5, deviation: 35 },
	{ id: "6", stage: "AML разработка", base: 68 },
	{ id: "7", stage: "Пилотирование модели", base: 34 },
	{ id: "8", stage: "Разработка витрины для применения модели", base: 56 },
	{ id: "9", stage: "Адаптация и внедрение", base: 50 },
];

const platformStreamData: PlatformStreamRow[] = [
	{
		id: "1",
		stream: "Платформы и решения для моделирования",
		base: 123,
		adjusted: 147,
		deviation: -15,
		atypical: 220,
	},
	{
		id: "2",
		stream: "Контроль моделей",
		base: 39,
		adjusted: 47,
		deviation: -22,
		atypical: 80,
	},
	{
		id: "3",
		stream: "Источники данных",
		base: 63,
		adjusted: 85,
		deviation: -18,
		atypical: 76,
	},
];

const getDeviationColor = (value?: number) => {
	if (value === undefined) return "text.secondary";
	return value > 0 ? "#E53935" : "#2E7D32";
};

const formatDeviation = (value?: number) => {
	if (value === undefined) return "-";
	return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
};

function SummaryRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
	return (
		<Stack
			direction="row"
			justifyContent="space-between"
			alignItems="flex-start"
			spacing={1}
			sx={{ width: "100%", minWidth: 0 }}
		>
			<Typography color="text.secondary" variant="body2" sx={{ flex: 1, minWidth: 0 }}>
				{label}
			</Typography>
			<Typography fontWeight={700} sx={{ flexShrink: 0, color: valueColor }}>
				{value}
			</Typography>
		</Stack>
	);
}

export const FinalScoreCard = () => {
	return (
		<Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
			<Paper
				elevation={0}
				sx={{
					p: { xs: 2, sm: 3 },
					borderRadius: 3,
					mb: 2,
					boxShadow: "0px 4px 16px rgba(0,0,0,0.08)",
					width: "100%",
					maxWidth: "100%",
					boxSizing: "border-box",
				}}
			>
				<Stack
					direction={{ xs: "column", sm: "row" }}
					justifyContent="space-between"
					alignItems={{ xs: "flex-start", sm: "baseline" }}
					spacing={1.5}
					mb={2}
				>
					<Typography variant="h5" fontWeight={700} color="#1F2937">
						Итоговая оценка
					</Typography>
					<Button
						color="primary"
						variant="outlined"
						size="small"
						startIcon={<FileDownloadOutlinedIcon />}
						sx={{ flexShrink: 0 }}
					>
						Экспорт в Excel
					</Button>
				</Stack>

				<Stack spacing={1.5}>
					<SummaryRow label="Базовая оценка по стриму (СФЕРА):" value="452" />
					<SummaryRow
						label="Оценка с поправкой на коэффициент сложности:"
						value="74.7"
					/>
					<SummaryRow
						label="Отклонение относительно базовой оценки по стриму (СФЕРА):"
						value="-83.47%"
						valueColor="#2E7D32"
					/>
				</Stack>
			</Paper>

			<Card
				elevation={0}
				sx={{
					borderRadius: 2,
					boxShadow: "0px 2px 12px rgba(0,0,0,0.06)",
					width: "100%",
					maxWidth: "100%",
					minWidth: 0,
				}}
			>
				<CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
					<Typography variant="h6" fontWeight={700} mb={2}>
						Подробный расчет
					</Typography>

					<Typography variant="subtitle2" fontWeight={700} mb={1}>
						Модельный стрим
					</Typography>

					<TableContainer sx={{ width: "100%", maxWidth: "100%", mb: 3 }}>
						<Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
							<TableHead>
								<TableRow>
									<TableCell sx={{ fontWeight: 700 }}>Этап</TableCell>
									<TableCell align="right" sx={{ fontWeight: 700, width: "22%" }}>
										База
									</TableCell>
									<TableCell align="right" sx={{ fontWeight: 700, width: "22%" }}>
										С поправкой
									</TableCell>
									<TableCell align="right" sx={{ fontWeight: 700, width: "22%" }}>
										Отклонение
									</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{modelStreamData.map((row, index) => (
									<TableRow key={row.id}>
										<TableCell sx={{ wordBreak: "break-word" }}>
											<Typography variant="body2" fontWeight={500}>
												{String(index + 1).padStart(2, "0")}. {row.stage}
											</Typography>
										</TableCell>
										<TableCell align="right">{row.base}</TableCell>
										<TableCell align="right">{row.adjusted ?? "-"}</TableCell>
										<TableCell
											align="right"
											sx={{
												color: getDeviationColor(row.deviation),
												fontWeight: 700,
											}}
										>
											{formatDeviation(row.deviation)}
										</TableCell>
									</TableRow>
								))}
								<TableRow>
									<TableCell>
										<Typography fontWeight={700}>Итого:</Typography>
									</TableCell>
									<TableCell align="right">
										<Typography fontWeight={700}>453</Typography>
									</TableCell>
									<TableCell align="right">
										<Typography fontWeight={700}>80.5</Typography>
									</TableCell>
									<TableCell />
								</TableRow>
							</TableBody>
						</Table>
					</TableContainer>

					<Divider sx={{ mb: 2 }} />

					<Typography variant="subtitle2" fontWeight={700} mb={1}>
						Платформенные стримы
					</Typography>

					<TableContainer sx={{ width: "100%", maxWidth: "100%" }}>
						<Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
							<TableHead>
								<TableRow>
									<TableCell sx={{ fontWeight: 700 }}>Стрим</TableCell>
									<TableCell align="right" sx={{ fontWeight: 700, width: "16%" }}>
										База
									</TableCell>
									<TableCell align="right" sx={{ fontWeight: 700, width: "16%" }}>
										С поправкой
									</TableCell>
									<TableCell align="right" sx={{ fontWeight: 700, width: "16%" }}>
										Отклон.
									</TableCell>
									<TableCell align="right" sx={{ fontWeight: 700, width: "16%" }}>
										Нетип.
									</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{platformStreamData.map((row) => (
									<TableRow key={row.id}>
										<TableCell sx={{ wordBreak: "break-word" }}>
											<Typography variant="body2" fontWeight={500}>
												{row.stream}
											</Typography>
										</TableCell>
										<TableCell align="right">{row.base}</TableCell>
										<TableCell align="right">{row.adjusted}</TableCell>
										<TableCell
											align="right"
											sx={{
												color: getDeviationColor(row.deviation),
												fontWeight: 700,
											}}
										>
											{formatDeviation(row.deviation)}
										</TableCell>
										<TableCell align="right">{row.atypical}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</CardContent>
			</Card>
		</Box>
	);
};
