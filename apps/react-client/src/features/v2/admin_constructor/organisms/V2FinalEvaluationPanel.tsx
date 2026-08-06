import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
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
import { TypicalWorkFormulaBreakdownView } from "@react-client/features/v2/anketaCRUD/molecules/TypicalWorkFormulaBreakdownView";
import {
	collectAppearedTypicalWorkGroups,
	formatTypicalWorkCoefficientColumn,
	formatTypicalWorkNumberValue,
	typicalWorkCoefficientColumnTitle,
	typicalWorkItemDisplayName,
} from "@react-client/features/v2/anketaCRUD/utils/anketaModalArrayTableConfig";
import { Flex } from "@react-client/common/primitives/Flex";
import type { AnketaViewerAccess } from "@react-client/features/v2/anketaCRUD/utils/anketaViewerAccess";
import {
	buildAtypicalTotalsByStreamLabel,
	collectTypicalWorkBlockBindings,
	dedupeTypicalWorkRowsByWorkId,
	isModelStreamTypicalWorkVisibleInSummary,
	resolveTypicalWorkCatalogStreamLabel,
	shouldMaskWorkEstimatesForUser,
	shouldSkipLegacyModelStreamStageSummary,
	sortModelStreamTypicalWorkRows,
	userEditsOnlyOwnStreamBlocks,
	type V2StreamBlockExecutor,
} from "@smart-anketa/api-contract";
import {
	Fragment,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
	type MouseEvent,
} from "react";

const MODEL_STREAM_LABEL = "Модельный стрим";

const TYPICAL_WORK_TABLE_COLUMNS = [
	"Название",
	"База",
	"Коэфф",
	"С поправкой",
] as const;

/** Модельный стрим: база → отклонение (от среднего по экземплярам) → коэфф → сумма с поправкой. */
const MODEL_STREAM_TYPICAL_WORK_TABLE_COLUMNS = [
	"Название",
	"База",
	"Отклонение",
	"Коэфф",
	"С поправкой",
] as const;

/** Чужой стрим: состав работ виден, оценки — нет. */
const MASKED_TYPICAL_WORK_TABLE_COLUMNS = ["Название"] as const;

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
	return Number.isInteger(value) ? value.toFixed(1) : value.toFixed(2);
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

/** (adjusted − base) / base × 100%; null если база не задана. */
function percentDeviationFromBase(
	base: number | null | undefined,
	adjusted: number | null | undefined,
): number | null {
	if (
		base === null ||
		base === undefined ||
		!Number.isFinite(base) ||
		base === 0 ||
		adjusted === null ||
		adjusted === undefined ||
		!Number.isFinite(adjusted)
	) {
		return null;
	}
	return ((adjusted - base) / base) * 100;
}

function readTypicalWorkFiniteNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value.replace(",", "."));
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

/**
 * Итоги по экземплярам формулы (уже отфильтрованные сработавшие).
 */
function readTypicalWorkInstanceTotals(
	item: Record<string, unknown>,
): number[] {
	const raw = item.formulaBreakdown;
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
	const list = (raw as Record<string, unknown>).instanceBreakdown;
	if (!Array.isArray(list)) return [];
	const totals: number[] = [];
	for (const row of list) {
		if (!row || typeof row !== "object" || Array.isArray(row)) continue;
		const total = readTypicalWorkFiniteNumber(
			(row as Record<string, unknown>).total,
		);
		if (total !== null) totals.push(total);
	}
	return totals;
}

/**
 * База для отклонения: норматив × число сработавших формул (37×3 = 111).
 * Оценка с поправкой: сумма итогов формул (166.5).
 * Отклонение: (с поправкой − база×N) / (база×N) × 100%.
 */
function resolveTypicalWorkDeviationBases(item: Record<string, unknown>): {
	unitBase: number | null;
	formulaCount: number;
	baseTotal: number | null;
	adjustedTotal: number | null;
} {
	const unitBase = readTypicalWorkFiniteNumber(item.estimateHoursPerDay);
	const instanceTotals = readTypicalWorkInstanceTotals(item);
	const formulaCount =
		instanceTotals.length > 0
			? instanceTotals.length
			: readTypicalWorkFiniteNumber(item.total) != null
				? 1
				: 0;
	const adjustedTotal =
		instanceTotals.length > 0
			? instanceTotals.reduce((acc, value) => acc + value, 0)
			: readTypicalWorkFiniteNumber(item.total);
	const baseTotal =
		unitBase !== null && formulaCount > 0 ? unitBase * formulaCount : unitBase;
	return { unitBase, formulaCount, baseTotal, adjustedTotal };
}

function sumTypicalRowTotals(rows: Record<string, unknown>[]): number {
	let sum = 0;
	for (const row of rows) {
		const total = readTypicalWorkFiniteNumber(row.total);
		if (total !== null) sum += total;
	}
	return sum;
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
	/** Роли и стримы зрителя: чужие стримы показываем без цифр (§2). */
	viewerAccess?: AnketaViewerAccess;
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
	viewerAccess,
}: Props) {
	const lastGoodSummaryRef = useRef<V2SummaryFormSlice | null>(null);
	const lastGoodLiveFormDataRef = useRef<Record<string, unknown> | null>(null);
	const lastGoodFormDataRef = useRef<Record<string, unknown> | null>(null);

	useEffect(() => {
		if (!isLoading && summary && !calculationError && !hideDetailedEstimates) {
			lastGoodSummaryRef.current = summary;
		}
	}, [calculationError, hideDetailedEstimates, isLoading, summary]);

	useEffect(() => {
		if (!isLoading && liveFormData && !hideDetailedEstimates) {
			lastGoodLiveFormDataRef.current = liveFormData;
		}
	}, [hideDetailedEstimates, isLoading, liveFormData]);

	useEffect(() => {
		if (!isLoading && formData && !hideDetailedEstimates) {
			lastGoodFormDataRef.current = formData;
		}
	}, [formData, hideDetailedEstimates, isLoading]);

	const displaySummary =
		!isLoading && summary ? summary : (summary ?? lastGoodSummaryRef.current);
	const displayLiveFormData =
		!isLoading && liveFormData
			? liveFormData
			: (liveFormData ?? lastGoodLiveFormDataRef.current);
	const displayFormData =
		!isLoading && formData
			? formData
			: (formData ?? lastGoodFormDataRef.current);

	const uncertaintySummary =
		!hideDetailedEstimates && displayFormData
			? uncertaintySummaryText(displayFormData)
			: null;
	const effectiveSummary =
		calculationError || hideDetailedEstimates ? null : displaySummary;
	const typicalWorkGroups = useMemo(
		() =>
			collectAppearedTypicalWorkGroups(
				displayFormData,
				uiSchema,
				displayLiveFormData,
			),
		[displayFormData, uiSchema, displayLiveFormData],
	);
	const hasModelStreamCatalogInSchema = useMemo(
		() => shouldSkipLegacyModelStreamStageSummary(uiSchema),
		[uiSchema],
	);
	const streamSubtotals = useMemo(() => {
		const byLabel = new Map<
			string,
			{ streamExecutors: V2StreamBlockExecutor[]; atypicalTotal: number }
		>();
		if (!uiSchema) return byLabel;
		for (const row of buildAtypicalTotalsByStreamLabel(
			displayFormData,
			uiSchema,
			displayLiveFormData,
		)) {
			byLabel.set(row.streamLabel, {
				streamExecutors: row.streamExecutors,
				atypicalTotal: row.atypicalTotal,
			});
		}
		return byLabel;
	}, [displayFormData, uiSchema, displayLiveFormData]);
	/**
	 * §2/§4: представитель стрима видит цифры только по своему стриму —
	 * ни чужих подытогов, ни сквозного итога по анкете.
	 */
	const hideCrossStreamTotals = Boolean(
		viewerAccess?.applyAccessRules &&
			userEditsOnlyOwnStreamBlocks(viewerAccess.roles),
	);
	const isStreamMasked = useCallback(
		(streamLabel: string): boolean => {
			if (!viewerAccess?.applyAccessRules) return false;
			return shouldMaskWorkEstimatesForUser(
				viewerAccess,
				streamSubtotals.get(streamLabel)?.streamExecutors ?? [],
			);
		},
		[streamSubtotals, viewerAccess],
	);
	const otherStreamCatalogLabels = useMemo(() => {
		if (!uiSchema) return [] as string[];
		const labels: string[] = [];
		for (const binding of collectTypicalWorkBlockBindings(uiSchema)) {
			if (
				binding.boundWorkIds !== undefined &&
				binding.boundWorkIds.length === 0
			) {
				continue;
			}
			const label = resolveTypicalWorkCatalogStreamLabel(
				uiSchema,
				binding.outputPath,
			);
			if (!label || label === MODEL_STREAM_LABEL) continue;
			if (!labels.includes(label)) labels.push(label);
		}
		// Стримы без типовых работ в каталоге всё равно нужны в подытогах: у них есть нетиповые.
		for (const label of streamSubtotals.keys()) {
			if (label === MODEL_STREAM_LABEL) continue;
			if (!labels.includes(label)) labels.push(label);
		}
		return labels;
	}, [uiSchema, streamSubtotals]);
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
	const otherTypicalWorkGroups = useMemo(() => {
		const appeared = typicalWorkGroups.filter(
			(group) => group.streamExecutor !== MODEL_STREAM_LABEL,
		);
		const seen = new Set(
			appeared.map((group) => group.streamExecutor ?? group.path),
		);
		const emptyFromSchema = otherStreamCatalogLabels
			.filter((label) => !seen.has(label))
			.map((streamExecutor) => ({
				path: `schema:${streamExecutor}`,
				streamExecutor,
				rows: [] as Record<string, unknown>[],
			}));
		return [...appeared, ...emptyFromSchema];
	}, [typicalWorkGroups, otherStreamCatalogLabels]);
	const typicalWorkRowCount =
		modelStreamTypicalRows.length +
		otherTypicalWorkGroups.reduce((sum, group) => sum + group.rows.length, 0);
	/** Сумма нормативов типовых работ (без коэффициентов трудоёмкости). */
	const typicalBaseSum = useMemo(() => {
		const rows = [
			...modelStreamTypicalRows,
			...otherTypicalWorkGroups.flatMap((group) => group.rows),
		];
		let sum = 0;
		for (const row of rows) {
			const { baseTotal } = resolveTypicalWorkDeviationBases(row);
			if (baseTotal != null) sum += baseTotal;
		}
		return sum;
	}, [modelStreamTypicalRows, otherTypicalWorkGroups]);
	const typicalBaseDisplay =
		effectiveSummary?.baseScoreStream != null &&
		Number.isFinite(effectiveSummary.baseScoreStream)
			? effectiveSummary.baseScoreStream
			: typicalBaseSum;
	const showModelStreamSection =
		hasModelStreamCatalogInSchema || modelStreamTypicalRows.length > 0;
	const showOtherStreamsSection = otherTypicalWorkGroups.length > 0;
	const showUnifiedHeadline = Boolean(
		!hideCrossStreamTotals &&
			typicalWorkRowCount > 0 &&
			effectiveSummary &&
			hasNonZeroUnifiedTotals(effectiveSummary),
	);
	const showLegacyHeadline = Boolean(
		!hideCrossStreamTotals &&
			typicalWorkRowCount > 0 &&
			effectiveSummary &&
			hasLegacyHeadline(effectiveSummary),
	);
	const hasData =
		(effectiveSummary && (showUnifiedHeadline || showLegacyHeadline)) ||
		typicalWorkRowCount > 0;
	const showDetailedSection =
		!hideDetailedEstimates &&
		(showModelStreamSection || showOtherStreamsSection);

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
				</Stack>

				{isLoading ? (
					<Alert
						severity="info"
						icon={<CircularProgress size={18} />}
						sx={{ mb: 2 }}
					>
						Идёт пересчёт трудоёмкости и появление типовых работ…
					</Alert>
				) : null}

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
							infoTitle={[
								"Коэффициент общей неопределённости по анкете.",
								"Учитывается в типовых работах модельного стрима и в нетиповых работах.",
								"На итоговую строку сверху отдельно не домнажается.",
							].join("\n")}
						/>
					) : null}

					{showUnifiedHeadline ? (
						<>
							<Metric
								label="Итоговая трудоёмкость (ч/д):"
								value={formatNum(effectiveSummary?.total)}
								infoTitle={[
									"Сумма типовых (с коэффициентами) и нетиповых работ (ч/д).",
									`Типовые с коэфф. = ${formatNum(effectiveSummary?.typicalTotal)}`,
									`Нетиповые = ${formatNum(effectiveSummary?.atypicalTotal)}`,
									`Итого = ${formatNum(effectiveSummary?.typicalTotal)} + ${formatNum(effectiveSummary?.atypicalTotal)} = ${formatNum(effectiveSummary?.total)}`,
								].join("\n")}
							/>
							<Metric
								label="Базовая оценка:"
								value={formatNum(typicalBaseDisplay)}
								infoTitle={[
									"Сумма всех нормативов типовых работ",
									"(без коэффициентов, которые формируются параметрами трудоёмкости).",
								].join("\n")}
							/>
							<Metric
								label="Типовые работы:"
								value={formatNum(effectiveSummary?.typicalTotal)}
								infoTitle={[
									"Сумма типовых работ с учётом коэффициентов трудоёмкости.",
									`Базовая оценка (нормативы без коэффициентов) = ${formatNum(typicalBaseDisplay)}`,
								].join("\n")}
							/>
							<Metric
								label="Нетиповые работы:"
								value={formatNum(effectiveSummary?.atypicalTotal)}
								infoTitle={[
									"Сумма нетиповых работ стримов, включённых в расчёт",
									"(учитываются строки с «Включить в расчёт»).",
									"Входит в итоговую трудоёмкость и в формулу отклонения.",
								].join("\n")}
							/>
						</>
					) : null}
					{showLegacyHeadline ? (
						<Metric
							label="Отклонение:"
							value={formatPercent(effectiveSummary?.deviationFromBaseline)}
							valueColor={deviationColor(
								(effectiveSummary?.deviationFromBaseline ?? 0) - 100,
							)}
							infoTitle={buildDeviationFormulaTitle(
								effectiveSummary,
								typicalBaseDisplay,
							)}
						/>
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
					{!hasData && isLoading ? (
						<Stack
							direction="row"
							alignItems="center"
							spacing={1.5}
							sx={{ py: 2 }}
						>
							<CircularProgress size={20} />
							<Typography variant="body2" color="text.secondary">
								Считаем типовые работы…
							</Typography>
						</Stack>
					) : null}
					{!hasData && !isLoading && typicalWorkRowCount === 0 ? (
						<Typography variant="body2" color="text.secondary">
							{hideDetailedEstimates
								? "Оценки работ недоступны для вашей роли."
								: "Заполните анкету — здесь появится расчёт по типовым работам стримов."}
						</Typography>
					) : null}

					{showDetailedSection ? (
						<Box
							sx={{
								opacity: isLoading ? 0.55 : 1,
								transition: "opacity 160ms ease",
								pointerEvents: isLoading ? "none" : "auto",
							}}
						>
							<Typography variant="h5" fontWeight={700} mb={4}>
								Подробный расчет
								{isLoading ? (
									<Typography
										component="span"
										variant="body2"
										color="text.secondary"
										sx={{ ml: 1.5, fontWeight: 500 }}
									>
										обновляется…
									</Typography>
								) : null}
							</Typography>

							{showModelStreamSection ? (
								<>
									<Flex
										justifyContent="space-between"
										alignItems="baseline"
										gap={16}
										wrap="wrap"
										margin="0 0 16px"
									>
										<Typography variant="h6" fontWeight={700}>
											Модельный стрим
										</Typography>
										<StreamSubtotal
											typicalTotal={sumTypicalRowTotals(modelStreamTypicalRows)}
											atypicalTotal={
												streamSubtotals.get(MODEL_STREAM_LABEL)
													?.atypicalTotal ?? 0
											}
											masked={isStreamMasked(MODEL_STREAM_LABEL)}
										/>
									</Flex>
									{modelStreamTypicalRows.length > 0 ? (
										<TypicalWorksMiniTable
											rows={modelStreamTypicalRows}
											showDeviations
											maskEstimates={isStreamMasked(MODEL_STREAM_LABEL)}
										/>
									) : (
										<Typography variant="body2" color="text.secondary">
											Работы модельного стрима появятся здесь после выполнения
											условий появления в анкете.
										</Typography>
									)}
									{showOtherStreamsSection ? <Divider sx={{ my: 4 }} /> : null}
								</>
							) : null}

							{showOtherStreamsSection ? (
								<>
									<Typography variant="h6" fontWeight={700} mb={2}>
										Появление типовых работ
									</Typography>
									<Stack spacing={3}>
										{otherTypicalWorkGroups.map((group) => (
											<Box key={group.path}>
												{group.streamExecutor ? (
													<Flex
														justifyContent="space-between"
														alignItems="baseline"
														gap={16}
														wrap="wrap"
														margin="0 0 12px"
													>
														<Typography
															variant="subtitle2"
															fontWeight={700}
															color="text.secondary"
														>
															{group.streamExecutor}
														</Typography>
														<StreamSubtotal
															typicalTotal={sumTypicalRowTotals(group.rows)}
															atypicalTotal={
																streamSubtotals.get(group.streamExecutor)
																	?.atypicalTotal ?? 0
															}
															masked={isStreamMasked(group.streamExecutor)}
														/>
													</Flex>
												) : null}
												{group.rows.length > 0 ? (
													<TypicalWorksMiniTable
														rows={group.rows}
														showDeviations
														maskEstimates={
															group.streamExecutor
																? isStreamMasked(group.streamExecutor)
																: false
														}
													/>
												) : (
													<Typography variant="body2" color="text.secondary">
														Работы стрима появятся здесь после выполнения
														условий появления в анкете.
													</Typography>
												)}
											</Box>
										))}
									</Stack>
								</>
							) : null}
						</Box>
					) : null}
				</CardContent>
			</Card>
		</Box>
	);
}

function buildDeviationFormulaTitle(
	summary: V2SummaryFormSlice | null | undefined,
	typicalBase?: number,
): string {
	const base = typicalBase ?? summary?.baseScoreStream;
	const atypical = summary?.atypicalTotal;
	const withCoeff = summary?.scoreWithComplexityCoeff;
	const deviation = summary?.deviationFromBaseline;
	const adjustedTypical =
		withCoeff != null &&
		atypical != null &&
		Number.isFinite(withCoeff) &&
		Number.isFinite(atypical)
			? withCoeff - atypical
			: summary?.typicalTotal ?? null;

	const laborTotal =
		summary?.total != null && Number.isFinite(summary.total)
			? summary.total
			: withCoeff;
	const lines = [
		"Отклонение = (Типовые + Нетиповые) / База × 100%",
		"Типовые + Нетиповые = итоговая трудоёмкость по анкете",
		"(с коэффициентами и общей неопределённостью).",
		`База (сумма нормативов выбранных типовых работ) = ${formatNum(base)}`,
		`Типовые (с коэфф.) = ${formatNum(adjustedTypical)}`,
		`Нетиповые = ${formatNum(atypical)}`,
		`Итоговая трудоёмкость = ${formatNum(laborTotal)}`,
		`(${formatNum(laborTotal)} / ${formatNum(base)}) × 100% = ${formatPercent(deviation)}`,
	];
	return lines.join("\n");
}

function Metric({
	label,
	value,
	valueColor,
	title,
	infoTitle,
}: {
	label: string;
	value: string;
	valueColor?: string;
	title?: string;
	/** Нативный title на иконке ℹ рядом с подписью. */
	infoTitle?: string;
}) {
	return (
		<Flex
			title={title}
			alignItems="baseline"
			justifyContent="space-between"
			gap={8}
			minWidth="0"
		>
			<Flex alignItems="center" gap={4} minWidth="0">
				<Typography variant="body2" color="text.secondary" sx={{ minWidth: 0 }}>
					{label}
				</Typography>
				{infoTitle ? (
					<Box
						component="span"
						title={infoTitle}
						aria-label={infoTitle}
						sx={{
							display: "inline-flex",
							color: "text.secondary",
							cursor: "help",
							flexShrink: 0,
							lineHeight: 0,
						}}
					>
						<InfoOutlinedIcon sx={{ fontSize: 16 }} />
					</Box>
				) : null}
			</Flex>
			<Typography variant="h6" fontWeight={700} color={valueColor} noWrap>
				{value}
			</Typography>
		</Flex>
	);
}

/** Подытог по стриму справа от его заголовка: типовые + нетиповые работы. */
function StreamSubtotal({
	typicalTotal,
	atypicalTotal,
	masked = false,
}: {
	typicalTotal: number;
	atypicalTotal: number;
	/** Чужой стрим: показываем состав работ, но без цифр (§2). */
	masked?: boolean;
}) {
	if (masked) {
		return (
			<Typography
				variant="body2"
				color="text.disabled"
				noWrap
				title="Оценки чужого стрима недоступны для вашей роли."
			>
				Оценки скрыты
			</Typography>
		);
	}
	return (
		<Typography
			variant="body2"
			color="text.secondary"
			noWrap
			title="Подытог по стриму: сумма типовых работ + сумма нетиповых работ, включённых в расчёт."
		>
			Типовые: {formatNum(typicalTotal)} · Нетиповые: {formatNum(atypicalTotal)}{" "}
			· Итого:{" "}
			<Typography
				component="span"
				variant="body2"
				fontWeight={700}
				color="text.primary"
			>
				{formatNum(typicalTotal + atypicalTotal)}
			</Typography>
		</Typography>
	);
}

function TypicalWorksMiniTable({
	rows,
	showDeviations = false,
	maskEstimates = false,
}: {
	rows: Record<string, unknown>[];
	/** Модельный стрим: колонка отклонения после базы (база×N формул vs сумма с поправкой). */
	showDeviations?: boolean;
	/** Чужой стрим: оставляем только названия работ, без нормативов и итогов (§2). */
	maskEstimates?: boolean;
}) {
	const [openByKey, setOpenByKey] = useState<Record<string, boolean>>({});
	const [deviationOpenByKey, setDeviationOpenByKey] = useState<
		Record<string, boolean>
	>({});
	const columns = maskEstimates
		? MASKED_TYPICAL_WORK_TABLE_COLUMNS
		: showDeviations
			? MODEL_STREAM_TYPICAL_WORK_TABLE_COLUMNS
			: TYPICAL_WORK_TABLE_COLUMNS;
	const deviationRows = useMemo(() => {
		if (!showDeviations || maskEstimates) return null;
		return rows.map((item) => {
			const { unitBase, formulaCount, baseTotal, adjustedTotal } =
				resolveTypicalWorkDeviationBases(item);
			const rowDeviation = percentDeviationFromBase(baseTotal, adjustedTotal);
			const deviationCoeff =
				baseTotal !== null && baseTotal !== 0 && adjustedTotal !== null
					? adjustedTotal / baseTotal
					: null;
			return {
				rowDeviation,
				deviationCoeff,
				unitBase,
				formulaCount,
				baseTotal,
				adjustedTotal,
			};
		});
	}, [rows, showDeviations]);

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
								width:
									index === 0 ? (showDeviations ? "30%" : "42%") : undefined,
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
					if (maskEstimates) {
						return (
							<TableRow key={rowKey}>
								<TableCell>
									<Typography fontWeight={500}>{name}</Typography>
								</TableCell>
							</TableRow>
						);
					}
					const open = Boolean(openByKey[rowKey]);
					const deviationOpen = Boolean(deviationOpenByKey[rowKey]);
					const toggle = () =>
						setOpenByKey((prev) => ({
							...prev,
							[rowKey]: !prev[rowKey],
						}));
					const toggleDeviation = (event: MouseEvent | KeyboardEvent) => {
						event.stopPropagation();
						setDeviationOpenByKey((prev) => ({
							...prev,
							[rowKey]: !prev[rowKey],
						}));
					};
					const deviations = deviationRows?.[index];
					const deviationCoeff = deviations?.deviationCoeff ?? null;
					const workTitleParts = [
						open ? "Скрыть формулу" : "Показать формулу",
						deviations?.baseTotal != null && deviations?.adjustedTotal != null
							? `База×N=${formatTypicalWorkNumberValue(deviations.baseTotal)} · с поправкой=${formatTypicalWorkNumberValue(deviations.adjustedTotal)}`
							: null,
						deviations?.rowDeviation != null
							? `Отклонение: ${formatPercent(deviations.rowDeviation)}`
							: null,
					].filter(Boolean);
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
								title={workTitleParts.join(" · ")}
								sx={{
									cursor: "pointer",
									bgcolor: open ? "action.hover" : undefined,
									"& > td": { borderBottom: open ? "none" : undefined },
								}}
							>
								<TableCell>
									<Stack direction="row" spacing={1} alignItems="flex-start">
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
								{showDeviations && deviations ? (
									<TableCell
										align="right"
										sx={{ color: deviationColor(deviations.rowDeviation) }}
										title={
											"Отклонение = (сумма с поправкой − база×N) / (база×N) × 100%, " +
											"где N — число сработавших формул. " +
											(deviations.unitBase != null &&
											deviations.formulaCount > 0
												? `База: ${formatTypicalWorkNumberValue(deviations.unitBase)}×${deviations.formulaCount}=${formatTypicalWorkNumberValue(deviations.baseTotal)}. `
												: "") +
											(deviations.adjustedTotal != null
												? `С поправкой: ${formatTypicalWorkNumberValue(deviations.adjustedTotal)}.`
												: "")
										}
									>
										{formatPercent(deviations.rowDeviation ?? undefined)}
									</TableCell>
								) : null}
								<TableCell
									align="right"
									title={
										typicalWorkCoefficientColumnTitle(item) ??
										"Сводный коэффициент поправки (для трудозатрат может быть Σ по экземплярам)"
									}
								>
									{formatTypicalWorkCoefficientColumn(item)}
								</TableCell>
								<TableCell
									align="right"
									title="Сумма оценок с поправкой по экземплярам (трудозатраты). Отклонение = (эта сумма − база×N) / (база×N)."
								>
									{formatTypicalWorkNumberValue(item.total)}
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell
									colSpan={columns.length}
									sx={{
										py: 0,
										px: 0.75,
										borderBottom: open ? undefined : "none",
									}}
								>
									<Collapse in={open} timeout="auto" unmountOnExit>
										<Box sx={{ pb: 1.25, pt: 0.25, width: "100%" }}>
											<TypicalWorkFormulaBreakdownView item={item} />
											{showDeviations ? (
												<Box
													sx={{
														mt: 1.25,
														pt: 1,
														borderTop: "1px dashed",
														borderColor: "divider",
													}}
												>
													<Stack
														direction="row"
														alignItems="center"
														spacing={0.5}
														onClick={toggleDeviation}
														onKeyDown={(event) => {
															if (event.key === "Enter" || event.key === " ") {
																event.preventDefault();
																toggleDeviation(event);
															}
														}}
														tabIndex={0}
														role="button"
														aria-expanded={deviationOpen}
														title={
															deviationOpen
																? "Скрыть расчёт отклонений"
																: "Показать расчёт отклонений"
														}
														sx={{
															cursor: "pointer",
															width: "fit-content",
															userSelect: "none",
														}}
													>
														{deviationOpen ? (
															<ExpandLessIcon
																fontSize="small"
																sx={{ color: "text.secondary" }}
															/>
														) : (
															<ExpandMoreIcon
																fontSize="small"
																sx={{ color: "text.secondary" }}
															/>
														)}
														<Typography
															variant="caption"
															color="text.secondary"
															fontWeight={700}
														>
															Расчёт отклонений
														</Typography>
													</Stack>
													<Collapse
														in={deviationOpen}
														timeout="auto"
														unmountOnExit
													>
														<Stack spacing={0.35} sx={{ mt: 0.75, pl: 0.5 }}>
															<Typography
																variant="caption"
																color="text.secondary"
																sx={{ display: "block", mb: 0.25 }}
															>
																База общая = норматив × число сработавших
																формул; отклонение от суммы с поправкой.
															</Typography>
															<Typography
																variant="body2"
																sx={{
																	fontFamily:
																		"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
																	fontSize: 12.5,
																	lineHeight: 1.4,
																	wordBreak: "break-word",
																}}
															>
																база ={" "}
																{formatTypicalWorkNumberValue(
																	deviations?.unitBase ??
																		item.estimateHoursPerDay,
																)}
																{deviations && deviations.formulaCount > 1
																	? ` × ${deviations.formulaCount} = ${formatTypicalWorkNumberValue(deviations.baseTotal)}`
																	: null}
															</Typography>
															<Typography
																variant="body2"
																sx={{
																	fontFamily:
																		"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
																	fontSize: 12.5,
																	lineHeight: 1.4,
																	wordBreak: "break-word",
																}}
															>
																с поправкой (сумма формул) ={" "}
																{formatTypicalWorkNumberValue(
																	deviations?.adjustedTotal ?? item.total,
																)}
															</Typography>
															<Typography
																variant="body2"
																sx={{
																	fontFamily:
																		"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
																	fontSize: 12.5,
																	lineHeight: 1.4,
																	color: deviationColor(
																		deviations?.rowDeviation ?? undefined,
																	),
																	wordBreak: "break-word",
																}}
															>
																отклонение = (с поправкой − база×N) / (база×N) ×
																100% ={" "}
																{formatPercent(
																	deviations?.rowDeviation ?? undefined,
																)}
																{deviationCoeff != null &&
																Number.isFinite(deviationCoeff)
																	? ` · коэфф. = ${deviationCoeff.toFixed(2)}`
																	: null}
															</Typography>
														</Stack>
													</Collapse>
												</Box>
											) : null}
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
