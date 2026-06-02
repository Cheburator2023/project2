import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

export type V2SummaryFormSlice = {
	total?: number;
	typicalTotal?: number;
	atypicalTotal?: number;
	baseScoreStream?: number;
	scoreWithComplexityCoeff?: number;
	deviationFromBaseline?: number;
	detailedCalculation?: Array<{
		stageName?: string;
		baseScore?: number;
		complexityCoeff?: number | null;
		deviationFromBase?: number | null;
		disabled?: boolean;
	}>;
	platformStreams?: Array<{
		streamName?: string;
		baseTypicalScore?: number;
		adjustedTypicalScore?: number;
		deviationPercent?: number | null;
		atypicalScore?: number;
	}>;
};

function formatNum(value: number | null | undefined): string {
	if (value === null || value === undefined || !Number.isFinite(value)) {
		return "—";
	}
	return Math.abs(value) >= 100
		? value.toFixed(0)
		: Number.isInteger(value)
			? String(value)
			: value.toFixed(1);
}

function formatPercent(value: number | null | undefined): string {
	if (value === null || value === undefined || !Number.isFinite(value)) {
		return "—";
	}
	const sign = value > 0 ? "+" : "";
	return `${sign}${value.toFixed(2)}%`;
}

function deviationColor(value: number | null | undefined): string | undefined {
	if (value === null || value === undefined || !Number.isFinite(value)) {
		return undefined;
	}
	if (value > 0) return "error.main";
	if (value < 0) return "success.main";
	return undefined;
}

type Props = {
	summary?: V2SummaryFormSlice | null;
	isLoading?: boolean;
	compact?: boolean;
	onExportExcel?: () => void;
	/** Подзаголовок источника данных (например, движок v1). */
	engineCaption?: string;
};

export function V2FinalEvaluationPanel({
	summary,
	isLoading,
	compact,
	onExportExcel,
	engineCaption,
}: Props) {
	const rows = summary?.detailedCalculation ?? [];
	const platformRows = summary?.platformStreams ?? [];
	const hasUnified =
		summary &&
		(summary.total !== undefined ||
			summary.typicalTotal !== undefined ||
			summary.atypicalTotal !== undefined);
	const hasData =
		summary &&
		(hasUnified ||
			summary.baseScoreStream !== undefined ||
			rows.length > 0 ||
			platformRows.length > 0);

	return (
		<Box sx={{ width: "100%", minWidth: 0 }}>
			<Paper
				elevation={0}
				sx={{
					p: compact ? "24px 24px" : "32px 32px",
					zIndex: 1,
					position: "relative",
					mb: 4,
					boxShadow: "0px 10px 20px rgba(0,0,0,0.2)",
				}}
			>
				<Stack
					direction="row"
					justifyContent="space-between"
					alignItems="baseline"
					gap={2}
				>
					<Box sx={{ minWidth: 0 }}>
						<Typography variant={compact ? "h5" : "h4"} fontWeight={700} mb={4}>
							Итоговая оценка
						</Typography>
						{engineCaption ? (
							<Typography
								variant="caption"
								color="text.secondary"
								display="block"
							>
								{engineCaption}
							</Typography>
						) : null}
					</Box>
					<Stack direction="row" gap={1} alignItems="center" flexShrink={0}>
						{isLoading ? <CircularProgress size={16} /> : null}
						{onExportExcel ? (
							<Button
								size="small"
								variant="contained"
								startIcon={<FileDownloadOutlinedIcon />}
								onClick={onExportExcel}
							>
								Экспорт в Excel
							</Button>
						) : null}
					</Stack>
				</Stack>

				<Stack spacing={2}>
					{hasUnified ? (
						<>
							<Metric
								label="Итоговая трудоёмкость (ч/д):"
								value={formatNum(summary?.total)}
							/>
							<Metric
								label="Типовые работы:"
								value={formatNum(summary?.typicalTotal)}
							/>
							<Metric
								label="Нетиповые работы:"
								value={formatNum(summary?.atypicalTotal)}
							/>
						</>
					) : (
						<>
							<Metric
								label="Базовая оценка по стриму (СФЕРА):"
								value={formatNum(summary?.baseScoreStream)}
							/>
							<Metric
								label="Оценка с поправкой на коэффициент сложности:"
								value={formatNum(summary?.scoreWithComplexityCoeff)}
							/>
							<Metric
								label="Отклонение относительно базовой оценки по стриму (СФЕРА):"
								value={formatPercent(summary?.deviationFromBaseline)}
								valueColor={deviationColor(summary?.deviationFromBaseline)}
							/>
						</>
					)}
				</Stack>
			</Paper>

			<Card
				elevation={0}
				sx={{
					borderRadius: "0 4px",
					boxShadow: "0px 4px 20px rgba(0,0,0,0.04)",
					mt: compact ? -5 : -7.5,
					width: "100%",
					minWidth: 0,
				}}
			>
				<CardContent sx={{ p: compact ? 3 : 4, pt: compact ? 5 : 6 }}>
					{!hasData && !isLoading ? (
						<Typography variant="body2" color="text.secondary">
							Заполните анкету — здесь появится расчёт по 11 этапам E2E и
							платформенным стримам.
						</Typography>
					) : null}

					{rows.length > 0 ? (
						<>
							<Typography variant="h5" fontWeight={700} mb={4}>
								Подробный расчет
							</Typography>
							<Typography variant="h6" fontWeight={700} mb={2}>
								Модельный стрим
							</Typography>
							<MiniTable
								columns={[
									"Наименование этапа E2E планирования",
									"Базовая оценка",
									"Оценка с поправкой",
									"Отклонение",
								]}
								rows={rows.map((r) => ({
									name: r.stageName ?? "—",
									c1: formatNum(r.baseScore),
									c2: formatNum(r.complexityCoeff ?? undefined),
									c3: formatPercent(r.deviationFromBase ?? undefined),
									c3Color: deviationColor(r.deviationFromBase ?? undefined),
									muted: r.disabled,
									bold: r.stageName === "Итого",
								}))}
							/>
							<Divider sx={{ mb: 5 }} />
						</>
					) : null}

					{platformRows.length > 0 ? (
						<>
							<Typography variant="h6" fontWeight={700} mb={2}>
								Платформенные стримы
							</Typography>
							<MiniTable
								columns={[
									"Наименование стрима",
									"Базовая оценка",
									"Оценка с поправкой",
									"Отклонение",
									"Оценка нетиповых задач",
								]}
								rows={platformRows.map((r) => ({
									name: r.streamName ?? "—",
									c1: formatNum(r.baseTypicalScore),
									c2: formatNum(r.adjustedTypicalScore),
									c3: formatPercent(r.deviationPercent ?? undefined),
									c3Color: deviationColor(r.deviationPercent ?? undefined),
									c4: formatNum(r.atypicalScore),
								}))}
								fiveCols
							/>
						</>
					) : null}
				</CardContent>
			</Card>
		</Box>
	);
}

function Metric({
	label,
	value,
	valueColor,
}: {
	label: string;
	value: string;
	valueColor?: string;
}) {
	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "baseline",
				justifyContent: "space-between",
				gap: 2,
				minWidth: 0,
			}}
		>
			<Typography variant="body2" color="text.secondary" sx={{ minWidth: 0 }}>
				{label}
			</Typography>
			<Typography variant="h6" fontWeight={700} color={valueColor} noWrap>
				{value}
			</Typography>
		</Box>
	);
}

function MiniTable({
	columns,
	rows,
	fiveCols,
}: {
	columns: string[];
	rows: Array<{
		name: string;
		c1: string;
		c2: string;
		c3: string;
		c4?: string;
		c3Color?: string;
		muted?: boolean;
		bold?: boolean;
	}>;
	fiveCols?: boolean;
}) {
	return (
		<Table
			size="small"
			sx={{
				tableLayout: "fixed",
				width: "100%",
				"& td, & th": {
					px: 0.75,
					py: 0.5,
					fontSize: 12,
					verticalAlign: "top",
					wordBreak: "break-word",
				},
			}}
		>
			<TableHead>
				<TableRow>
					{columns.map((col, index) => (
						<TableCell
							key={col}
							align={index === 0 ? "left" : "right"}
							sx={{
								fontWeight: 700,
								color: "text.secondary",
								width: index === 0 ? (fiveCols ? "32%" : "42%") : undefined,
							}}
						>
							{col}
						</TableCell>
					))}
				</TableRow>
			</TableHead>
			<TableBody>
				{rows.map((row, index) => (
					<TableRow
						key={`${row.name}-${index}`}
						sx={{
							opacity: row.muted ? 0.45 : 1,
							"& td": { fontWeight: row.bold ? 700 : 400 },
						}}
					>
						<TableCell>
							{fiveCols ? (
								<Typography fontWeight={row.bold ? 700 : 500}>
									{row.name}
								</Typography>
							) : (
								<Stack direction="row" spacing={2}>
									<Typography color="text.secondary" sx={{ minWidth: 28 }}>
										{String(index + 1).padStart(2, "0")}.
									</Typography>
									<Typography fontWeight={row.bold ? 700 : 500}>
										{row.name}
									</Typography>
								</Stack>
							)}
						</TableCell>
						<TableCell align="right">{row.c1}</TableCell>
						<TableCell align="right">{row.c2}</TableCell>
						<TableCell align="right" sx={{ color: row.c3Color }}>
							{row.c3}
						</TableCell>
						{fiveCols ? (
							<TableCell align="right">{row.c4 ?? "—"}</TableCell>
						) : null}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
