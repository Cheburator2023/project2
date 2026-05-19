import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Card } from "@react-client/common/muiCustom/Card";

export type V2SummaryFormSlice = {
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
};

export function V2FinalEvaluationPanel({
	summary,
	isLoading,
	compact,
	onExportExcel,
}: Props) {
	const rows = summary?.detailedCalculation ?? [];
	const platformRows = summary?.platformStreams ?? [];
	const hasData =
		summary &&
		(summary.baseScoreStream !== undefined ||
			rows.length > 0 ||
			platformRows.length > 0);

	return (
		<Card
			variant="outlined"
		>
			<Box
				sx={{
					px: compact ? 1.5 : 2,
					py: 1.5,
					borderBottom: 1,
					borderColor: "divider",
					display: "flex",
					alignItems: "center",
					gap: 1,
				}}
			>
				<Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
					Итоговая оценка
				</Typography>
				{isLoading ? <CircularProgress size={16} /> : null}
				{onExportExcel ? (
					<Button
						size="small"
						variant="outlined"
						startIcon={<FileDownloadOutlinedIcon />}
						onClick={onExportExcel}
					>
						Экспорт в Excel
					</Button>
				) : null}
			</Box>

			<Box sx={{ px: compact ? 1.5 : 2, py: 1.5 }}>
				{!hasData && !isLoading ? (
					<Typography variant="body2" color="text.secondary">
						Заполните анкету — здесь появится расчёт по 11 этапам E2E и
						платформенным стримам.
					</Typography>
				) : null}

				{hasData ? (
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: compact ? "1fr" : "1fr 1fr 1fr",
							gap: 1.5,
							mb: 2,
						}}
					>
						<Metric
							label="Базовая оценка по стриму (СФЕРА)"
							value={formatNum(summary?.baseScoreStream)}
						/>
						<Metric
							label="Оценка с поправкой на коэффициент сложности"
							value={formatNum(summary?.scoreWithComplexityCoeff)}
						/>
						<Metric
							label="Отклонение относительно базовой оценки по стриму (СФЕРА)"
							value={formatPercent(summary?.deviationFromBaseline)}
							valueColor={deviationColor(summary?.deviationFromBaseline)}
						/>
					</Box>
				) : null}

				{rows.length > 0 ? (
					<>
						<Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
							Подробный расчёт
						</Typography>
						<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
							Модельный стрим
						</Typography>
						<MiniTable
							columns={[
								"Наименование этапа E2E планирования",
								"Базовая оценка",
								"С поправкой",
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
					</>
				) : null}

				{platformRows.length > 0 ? (
					<Box sx={{ mt: 2 }}>
						<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
							Платформенные стримы
						</Typography>
						<MiniTable
							columns={[
								"Стрим",
								"База (типовые)",
								"С поправкой",
								"Отклонение",
								"Нетиповые",
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
					</Box>
				) : null}
			</Box>
		</Card>
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
		<Box>
			<Typography variant="caption" color="text.secondary" display="block">
				{label}
			</Typography>
			<Typography variant="h6" fontWeight={700} color={valueColor}>
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
		<Table size="small" sx={{ "& td, & th": { px: 0.75, py: 0.5, fontSize: 12 } }}>
			<TableHead>
				<TableRow>
					{columns.map((col) => (
						<TableCell key={col} sx={{ fontWeight: 700, color: "text.secondary" }}>
							{col}
						</TableCell>
					))}
				</TableRow>
			</TableHead>
			<TableBody>
				{rows.map((row) => (
					<TableRow
						key={row.name}
						sx={{
							opacity: row.muted ? 0.45 : 1,
							"& td": { fontWeight: row.bold ? 700 : 400 },
						}}
					>
						<TableCell>{row.name}</TableCell>
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
