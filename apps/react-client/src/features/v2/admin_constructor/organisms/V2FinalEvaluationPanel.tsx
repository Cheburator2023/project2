import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
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
import {
	dedupeTypicalWorkRowsByWorkId,
	isModelStreamTypicalWorkVisibleInSummary,
	sortModelStreamTypicalWorkRows,
	type TypicalWorkFormulaBreakdownDto,
} from "@smart-anketa/api-contract";
import { Fragment, useMemo, useState } from "react";

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
	/** Скрыть оценки работ (валидатор и т.п.). */
	hideDetailedEstimates?: boolean;
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
	hideDetailedEstimates = false,
}: Props) {
	const uncertaintySummary =
		!hideDetailedEstimates && formData
			? uncertaintySummaryText(formData)
			: null;
	const effectiveSummary =
		calculationError || hideDetailedEstimates ? null : summary;
	const rows = effectiveSummary?.detailedCalculation ?? [];
	const platformRows = effectiveSummary?.platformStreams ?? [];
	const typicalWorkGroups = useMemo(
		() => collectAppearedTypicalWorkGroups(formData, uiSchema, liveFormData),
		[formData, uiSchema, liveFormData],
	);
	const hasModelStreamCatalog = useMemo(
		() =>
			typicalWorkGroups.some(
				(group) =>
					group.streamExecutor === MODEL_STREAM_LABEL && group.rows.length > 0,
			),
		[typicalWorkGroups],
	);
	const modelStreamTypicalRows = useMemo(
		() =>
			sortModelStreamTypicalWorkRows(
				dedupeTypicalWorkRowsByWorkId(
					typicalWorkGroups
						.filter((group) => group.streamExecutor === MODEL_STREAM_LABEL)
						.flatMap((group) => group.rows),
				).filter(isModelStreamTypicalWorkVisibleInSummary),
			),
		[typicalWorkGroups],
	);
	const useModelStreamTypicalWorksTable = hasModelStreamCatalog;
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
		hasModelStreamCatalog || (!hasModelStreamCatalog && rows.length > 0);
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
		!hideDetailedEstimates &&
		(showModelStreamSection ||
			platformRows.length > 0 ||
			otherTypicalWorkGroups.length > 0);

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
					{onExportExcel ? (
						<Button
							size="small"
							variant="contained"
							startIcon={<FileDownloadOutlinedIcon />}
							disabled={isLoading}
							title="Экспорт расчёта в Excel"
							onClick={onExportExcel}
						>
							Экспорт в Excel
						</Button>
					) : null}
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
					borderRadius: "8px",
					boxShadow: "0px 4px 20px rgba(0,0,0,0.04)",
					mt: compact ? -5 : -7.5,
					width: "100%",
					minWidth: 0,
				}}
			>
				<CardContent sx={{ p: compact ? 3 : 4, pt: compact ? 5 : 6 }}>
					{!hasData && !isLoading && typicalWorkRowCount === 0 ? (
						<Typography variant="body2" color="text.secondary">
							{hideDetailedEstimates
								? "Оценки работ недоступны для вашей роли."
								: "Заполните анкету — здесь появится расчёт поэтапам и платформенным стримам."}
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
									{useModelStreamTypicalWorksTable ? (
										modelStreamTypicalRows.length > 0 ? (
											<TypicalWorksMiniTable rows={modelStreamTypicalRows} />
										) : (
											<Typography variant="body2" color="text.secondary">
												Работы модельного стрима появятся здесь после выполнения
												условий появления в анкете.
											</Typography>
										)
									) : rows.length > 0 ? (
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
									{platformRows.length > 0 ? <Divider sx={{ mb: 5 }} /> : null}
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

function readFormulaBreakdown(
	item: Record<string, unknown>,
): TypicalWorkFormulaBreakdownDto | null {
	const raw = item.formulaBreakdown;
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
	const record = raw as Record<string, unknown>;
	const symbolic =
		typeof record.symbolic === "string" ? record.symbolic.trim() : "";
	const expanded =
		typeof record.expanded === "string" ? record.expanded.trim() : "";
	if (!symbolic && !expanded) return null;
	const factors = Array.isArray(record.factors)
		? record.factors
				.filter(
					(factor): factor is Record<string, unknown> =>
						factor != null &&
						typeof factor === "object" &&
						!Array.isArray(factor),
				)
				.map((factor) => {
					const parts = Array.isArray(factor.parts)
						? factor.parts
								.filter(
									(part): part is Record<string, unknown> =>
										part != null &&
										typeof part === "object" &&
										!Array.isArray(part),
								)
								.map((part) => ({
									sourceLabel:
										typeof part.sourceLabel === "string"
											? part.sourceLabel
											: null,
									answerLabel:
										typeof part.answerLabel === "string"
											? part.answerLabel
											: "—",
									coefficient:
										typeof part.coefficient === "number" &&
										Number.isFinite(part.coefficient)
											? part.coefficient
											: Number.NaN,
								}))
								.filter((part) => Number.isFinite(part.coefficient))
						: undefined;
					return {
						paramCode:
							typeof factor.paramCode === "string" ? factor.paramCode : "",
						paramName:
							typeof factor.paramName === "string"
								? factor.paramName
								: typeof factor.paramCode === "string"
									? factor.paramCode
									: "Параметр",
						value:
							typeof factor.value === "number" && Number.isFinite(factor.value)
								? factor.value
								: Number.NaN,
						valueLabel:
							typeof factor.valueLabel === "string"
								? factor.valueLabel
								: undefined,
						aggregation:
							factor.aggregation === "max" || factor.aggregation === "single"
								? factor.aggregation
								: undefined,
						parts: parts?.length ? parts : undefined,
					};
				})
				.filter((factor) => Number.isFinite(factor.value))
		: [];
	return {
		symbolic: symbolic || "N",
		expanded:
			expanded ||
			`${formatTypicalWorkNumberValue(item.estimateHoursPerDay)} × ${formatTypicalWorkNumberValue(item.coefficient)} = ${formatTypicalWorkNumberValue(item.total)}`,
		factors,
		baseNorm:
			typeof record.baseNorm === "number" && Number.isFinite(record.baseNorm)
				? record.baseNorm
				: Number(item.estimateHoursPerDay) || 0,
		coefficient:
			typeof record.coefficient === "number" &&
			Number.isFinite(record.coefficient)
				? record.coefficient
				: Number(item.coefficient) || 1,
		total:
			typeof record.total === "number" && Number.isFinite(record.total)
				? record.total
				: Number(item.total) || 0,
	};
}

function buildFallbackFormulaBreakdown(
	item: Record<string, unknown>,
): TypicalWorkFormulaBreakdownDto {
	const base = formatTypicalWorkNumberValue(item.estimateHoursPerDay);
	const coeff = formatTypicalWorkNumberValue(item.coefficient);
	const total = formatTypicalWorkNumberValue(item.total);
	const coeffDisplay =
		typeof item.coefficientDisplay === "string" &&
		item.coefficientDisplay.trim()
			? item.coefficientDisplay.trim()
			: null;
	return {
		symbolic: "N × коэффициент",
		expanded: coeffDisplay
			? `${base} × ${coeffDisplay} = ${total}`
			: `${base} × ${coeff} = ${total}`,
		factors: [],
		baseNorm: Number(item.estimateHoursPerDay) || 0,
		coefficient: Number(item.coefficient) || 1,
		total: Number(item.total) || 0,
	};
}

function TypicalWorkFormulaDetails({
	item,
}: {
	item: Record<string, unknown>;
}) {
	const breakdown =
		readFormulaBreakdown(item) ?? buildFallbackFormulaBreakdown(item);
	const multiFactors = breakdown.factors.filter(
		(factor) => factor.aggregation === "max" && (factor.parts?.length ?? 0) > 1,
	);

	return (
		<Box
			sx={{
				width: "100%",
				px: 1.5,
				py: 1.25,
				borderRadius: 1,
				bgcolor: "action.hover",
			}}
		>
			{breakdown.symbolic ? (
				<Typography
					variant="caption"
					color="text.secondary"
					display="block"
					sx={{ mb: 0.5, lineHeight: 1.4 }}
				>
					{breakdown.symbolic}
				</Typography>
			) : null}
			<Typography
				variant="body2"
				fontWeight={600}
				sx={{
					fontFamily:
						"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
					fontSize: 13,
					letterSpacing: 0.15,
					lineHeight: 1.45,
					wordBreak: "break-word",
				}}
			>
				{breakdown.expanded}
			</Typography>
			{multiFactors.length > 0 ? (
				<Stack spacing={0.75} sx={{ mt: 1 }}>
					{multiFactors.map((factor) => (
						<Box key={factor.paramCode || factor.paramName}>
							<Typography
								variant="caption"
								color="text.secondary"
								display="block"
								sx={{ lineHeight: 1.35 }}
							>
								{factor.paramName}: {factor.valueLabel ?? formatTypicalWorkNumberValue(factor.value)}
								{" → "}
								{formatTypicalWorkNumberValue(factor.value)}
							</Typography>
							<Stack spacing={0.15} sx={{ mt: 0.25, pl: 1 }}>
								{(factor.parts ?? []).map((part, partIndex) => (
									<Typography
										key={`${factor.paramCode}-${partIndex}`}
										variant="caption"
										color="text.secondary"
										sx={{
											fontFamily:
												"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
											lineHeight: 1.35,
										}}
									>
										·{" "}
										{part.sourceLabel?.trim()
											? `${part.sourceLabel.trim()}: `
											: ""}
										{part.answerLabel} →{" "}
										{formatTypicalWorkNumberValue(part.coefficient)}
									</Typography>
								))}
							</Stack>
						</Box>
					))}
				</Stack>
			) : null}
		</Box>
	);
}

function TypicalWorksMiniTable({ rows }: { rows: Record<string, unknown>[] }) {
	const [openByKey, setOpenByKey] = useState<Record<string, boolean>>({});

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
					{TYPICAL_WORK_TABLE_COLUMNS.map((col, index) => (
						<TableCell
							key={col}
							align={index === 0 ? "left" : "right"}
							sx={{
								fontWeight: 700,
								color: "text.secondary",
								width: index === 0 ? "42%" : undefined,
							}}
						>
							{col}
						</TableCell>
					))}
				</TableRow>
			</TableHead>
			<TableBody>
				{rows.map((item, index) => {
					const name = typicalWorkItemDisplayName(item, index);
					const rowKey = `${String(item.workId ?? name)}-${index}`;
					const open = Boolean(openByKey[rowKey]);
					const toggle = () =>
						setOpenByKey((prev) => ({
							...prev,
							[rowKey]: !prev[rowKey],
						}));
					return (
						<Fragment key={rowKey}>
							<TableRow
								hover
								onClick={toggle}
								onKeyDown={(event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										toggle();
									}
								}}
								tabIndex={0}
								role="button"
								aria-expanded={open}
								title={open ? "Скрыть формулу" : "Показать формулу"}
								sx={{
									cursor: "pointer",
									bgcolor: open ? "action.hover" : undefined,
									"& > td": { borderBottom: open ? "none" : undefined },
								}}
							>
								<TableCell>
									<Stack direction="row" spacing={1} alignItems="flex-start">
										<Typography color="text.secondary" sx={{ minWidth: 28 }}>
											{String(index + 1).padStart(2, "0")}.
										</Typography>
										<Typography fontWeight={500} sx={{ flex: 1, minWidth: 0 }}>
											{name}
										</Typography>
										{open ? (
											<ExpandLessIcon
												fontSize="small"
												sx={{ color: "text.secondary", mt: 0.15 }}
											/>
										) : (
											<ExpandMoreIcon
												fontSize="small"
												sx={{ color: "text.secondary", mt: 0.15 }}
											/>
										)}
									</Stack>
								</TableCell>
								<TableCell align="right">
									{formatTypicalWorkNumberValue(item.estimateHoursPerDay)}
								</TableCell>
								<TableCell align="right">
									{formatTypicalWorkNumberValue(item.coefficient)}
								</TableCell>
								<TableCell align="right">
									{formatTypicalWorkNumberValue(item.total)}
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell
									colSpan={TYPICAL_WORK_TABLE_COLUMNS.length}
									sx={{
										py: 0,
										px: 0.75,
										borderBottom: open ? undefined : "none",
									}}
								>
									<Collapse in={open} timeout="auto" unmountOnExit>
										<Box sx={{ pb: 1.25, pt: 0.25, width: "100%" }}>
											<TypicalWorkFormulaDetails item={item} />
										</Box>
									</Collapse>
								</TableCell>
							</TableRow>
						</Fragment>
					);
				})}
			</TableBody>
		</Table>
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
