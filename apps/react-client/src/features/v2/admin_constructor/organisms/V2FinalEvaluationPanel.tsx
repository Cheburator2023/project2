import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import Alert from "@mui/material/Alert";
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
import { uncertaintySummaryText } from "@react-client/features/v2/anketaCRUD/organisms/AnketaFormModals";
import {
	collectAppearedTypicalWorkGroups,
	formatTypicalWorkNumberValue,
	typicalWorkItemDisplayName,
} from "@react-client/features/v2/anketaCRUD/utils/anketaModalArrayTableConfig";
import { useMemo } from "react";

const MODEL_STREAM_LABEL = "Модельный стрим";

const TYPICAL_WORK_TABLE_COLUMNS = [
	"Название типовой работы",
	"Базовая оценка",
	"Коэффициент",
	"Итог",
] as const;

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

/** Unified-итоги (типовые + нетиповые): показываем, если есть ненулевые значения. */
function hasNonZeroUnifiedTotals(summary: V2SummaryFormSlice): boolean {
	return (
		(summary.total ?? 0) > 0 ||
		(summary.typicalTotal ?? 0) > 0 ||
		(summary.atypicalTotal ?? 0) > 0
	);
}

function hasLegacyHeadline(summary: V2SummaryFormSlice): boolean {
	return (
		summary.baseScoreStream !== undefined ||
		summary.scoreWithComplexityCoeff !== undefined ||
		summary.deviationFromBaseline !== undefined
	);
}

type Props = {
	summary?: V2SummaryFormSlice | null;
	formData?: Record<string, unknown> | null;
	calculationError?: string | null;
	isLoading?: boolean;
	compact?: boolean;
	onExportExcel?: () => void;
	/** Подзаголовок источника данных (например, движок v1). */
	engineCaption?: string;
	uiSchema?: Record<string, unknown>;
	/** Свежие данные расчёта с сервера (массивы типовых работ). */
	liveFormData?: Record<string, unknown> | null;
};

export function V2FinalEvaluationPanel({
	summary,
	formData,
	calculationError,
	isLoading,
	compact,
	onExportExcel,
	engineCaption,
	uiSchema,
	liveFormData,
}: Props) {
	const uncertaintySummary = formData ? uncertaintySummaryText(formData) : null;
	const effectiveSummary = calculationError ? null : summary;
	const rows = effectiveSummary?.detailedCalculation ?? [];
	const platformRows = effectiveSummary?.platformStreams ?? [];
	const typicalWorkGroups = useMemo(
		() => collectAppearedTypicalWorkGroups(formData, uiSchema, liveFormData),
		[formData, uiSchema, liveFormData],
	);
	const modelStreamTypicalRows = useMemo(
		() =>
			typicalWorkGroups
				.filter((group) => group.streamExecutor === MODEL_STREAM_LABEL)
				.flatMap((group) => group.rows),
		[typicalWorkGroups],
	);
	const otherTypicalWorkGroups = useMemo(
		() =>
			typicalWorkGroups.filter(
				(group) => group.streamExecutor !== MODEL_STREAM_LABEL,
			),
		[typicalWorkGroups],
	);
	const typicalWorkRowCount =
		modelStreamTypicalRows.length +
		otherTypicalWorkGroups.reduce((sum, group) => sum + group.rows.length, 0);
	const showModelStreamSection =
		rows.length > 0 || modelStreamTypicalRows.length > 0;
	const showUnifiedHeadline = Boolean(
		effectiveSummary && hasNonZeroUnifiedTotals(effectiveSummary),
	);
	const showLegacyHeadline = Boolean(
		effectiveSummary && hasLegacyHeadline(effectiveSummary),
	);
	const hasData =
		(effectiveSummary &&
			(showUnifiedHeadline ||
				showLegacyHeadline ||
				rows.length > 0 ||
				platformRows.length > 0)) ||
		typicalWorkRowCount > 0;
	const showDetailedSection =
		showModelStreamSection ||
		platformRows.length > 0 ||
		otherTypicalWorkGroups.length > 0;

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
					alignItems="center"
					flexWrap="wrap"
					justifyContent="space-between"
					gap={1.5}
					mb={engineCaption ? 1 : 4}
				>
					<Typography variant={compact ? "h5" : "h4"} fontWeight={700}>
						Итоговая оценка
					</Typography>
					<Button
						size="small"
						variant="contained"
						startIcon={<FileDownloadOutlinedIcon />}
						disabled={isLoading || !onExportExcel}
						title={
							onExportExcel
								? "Экспорт расчёта в Excel"
								: "Экспорт будет доступен позже"
						}
						onClick={onExportExcel}
					>
						Экспорт в Excel
					</Button>
					{isLoading ? <CircularProgress size={16} /> : null}
				</Stack>

				{calculationError ? (
					<Alert severity="error" sx={{ mb: 2 }}>
						Итог недоступен: {calculationError}
					</Alert>
				) : null}

				<Stack spacing={2}>
					{uncertaintySummary != null ? (
						<Metric
							label="Общая неопределенность:"
							value={uncertaintySummary}
						/>
					) : null}

					{showUnifiedHeadline ? (
						<>
							<Metric
								label="Итоговая трудоёмкость (ч/д):"
								value={formatNum(effectiveSummary?.total)}
							/>
							<Metric
								label="Типовые работы:"
								value={formatNum(effectiveSummary?.typicalTotal)}
							/>
							<Metric
								label="Нетиповые работы:"
								value={formatNum(effectiveSummary?.atypicalTotal)}
							/>
						</>
					) : null}
					{showLegacyHeadline ? (
						<>
							<Metric
								label="Базовая оценка по стриму (СФЕРА):"
								value={formatNum(effectiveSummary?.baseScoreStream)}
							/>
							<Metric
								label="Оценка с поправкой на коэффициент сложности:"
								value={formatNum(effectiveSummary?.scoreWithComplexityCoeff)}
							/>
							<Metric
								label="Отклонение относительно базовой оценки по стриму (СФЕРА):"
								value={formatPercent(effectiveSummary?.deviationFromBaseline)}
								valueColor={deviationColor(
									effectiveSummary?.deviationFromBaseline,
								)}
							/>
						</>
					) : null}
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
					{!hasData && !isLoading && typicalWorkRowCount === 0 ? (
						<Typography variant="body2" color="text.secondary">
							Заполните анкету — здесь появится расчёт по 11 этапам E2E и
							платформенным стримам.
						</Typography>
					) : null}

					{showDetailedSection ? (
						<>
							<Typography variant="h5" fontWeight={700} mb={4}>
								Подробный расчет
							</Typography>

							{showModelStreamSection ? (
								<>
									<Typography variant="h6" fontWeight={700} mb={2}>
										Модельный стрим
									</Typography>
									{rows.length > 0 ? (
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
												c3Color: deviationColor(
													r.deviationFromBase ?? undefined,
												),
												muted: r.disabled,
												bold: r.stageName === "Итого",
											}))}
										/>
									) : null}
									{modelStreamTypicalRows.length > 0 ? (
										<Box sx={{ mt: rows.length > 0 ? 3 : 0 }}>
											{rows.length > 0 ? (
												<Typography
													variant="subtitle2"
													fontWeight={700}
													color="text.secondary"
													mb={1.5}
												>
													Типовые работы
												</Typography>
											) : null}
											<TypicalWorksMiniTable rows={modelStreamTypicalRows} />
										</Box>
									) : null}
									{otherTypicalWorkGroups.length > 0 ||
									platformRows.length > 0 ? (
										<Divider sx={{ my: 4 }} />
									) : null}
								</>
							) : null}

							{otherTypicalWorkGroups.length > 0 ? (
								<>
									<Typography variant="h6" fontWeight={700} mb={2}>
										Появление типовых работ
									</Typography>
									<Stack spacing={3} mb={platformRows.length > 0 ? 4 : 0}>
										{otherTypicalWorkGroups.map((group) => (
											<Box key={group.path}>
												{group.streamExecutor ? (
													<Typography
														variant="subtitle2"
														fontWeight={700}
														color="text.secondary"
														mb={1.5}
													>
														{group.streamExecutor}
													</Typography>
												) : null}
												<TypicalWorksMiniTable rows={group.rows} />
											</Box>
										))}
									</Stack>
									{platformRows.length > 0 ? (
										<Divider sx={{ mb: 5 }} />
									) : null}
								</>
							) : null}

							{platformRows.length > 0 ? (
								<>
									<Typography variant="h6" fontWeight={700} mb={2}>
										Стримы
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

function TypicalWorksMiniTable({
	rows,
}: {
	rows: Record<string, unknown>[];
}) {
	return (
		<MiniTable
			columns={[...TYPICAL_WORK_TABLE_COLUMNS]}
			rows={rows.map((item, index) => ({
				name: typicalWorkItemDisplayName(item, index),
				c1: formatTypicalWorkNumberValue(item.estimateHoursPerDay),
				c2: formatTypicalWorkNumberValue(item.coefficient),
				c3: formatTypicalWorkNumberValue(item.total),
			}))}
		/>
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
