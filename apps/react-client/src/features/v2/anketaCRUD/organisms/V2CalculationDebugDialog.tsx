import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import CloseIcon from "@mui/icons-material/Close";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState, type ReactNode } from "react";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { toast } from "@react-client/common/toasts";
import { uncertaintySummaryText } from "./AnketaFormModals";
import type { V2AnketaSchemaEngine } from "../hooks/useV2AnketaSchemaEngine";
import { V2_UNCERTAINTY_RISK_GROUP_LABELS } from "@smart-anketa/api-contract";

type Props = {
	open: boolean;
	onClose: () => void;
	engine: V2AnketaSchemaEngine;
};

type FlatValue = {
	path: string;
	inputValue: unknown;
	calculatedValue: unknown;
	changedByCalculation: boolean;
};

type WorkContribution = {
	path: string;
	name: string;
	norm: unknown;
	coefficient: unknown;
	total: unknown;
};

type UncertaintyRiskRow = {
	key: string;
	label: string;
	level: string;
	increment: number;
};

type UncertaintyBreakdown = {
	displayLabel: string;
	storedLabel: string | null;
	riskRows: UncertaintyRiskRow[];
	riskSum: number;
	adjustmentPercent: number;
	coefficient: number;
	formulaText: string;
};

type SferaBreakdown = {
	baseScoreStream: number | null;
	scoreWithComplexityCoeff: number | null;
	deviationFromBaseline: number | null;
	stageBaseTotal: number | null;
	stageAdjustedTotal: number | null;
	atypicalAdjusted: number | null;
	formulaSteps: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function flatten(
	value: unknown,
	prefix = "",
	out = new Map<string, unknown>(),
) {
	if (Array.isArray(value)) {
		if (value.length === 0 && prefix) out.set(prefix, value);
		value.forEach((item, index) => flatten(item, `${prefix}[${index}]`, out));
		return out;
	}
	const record = asRecord(value);
	if (record) {
		const entries = Object.entries(record);
		if (entries.length === 0 && prefix) out.set(prefix, value);
		for (const [key, child] of entries) {
			flatten(child, prefix ? `${prefix}.${key}` : key, out);
		}
		return out;
	}
	if (prefix) out.set(prefix, value);
	return out;
}

function stableValue(value: unknown): string {
	if (value === undefined) return "—";
	if (value === null) return "null";
	if (typeof value === "string") return value || '""';
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

function valuesEqual(left: unknown, right: unknown): boolean {
	return stableValue(left) === stableValue(right);
}

function formatNumber(value: unknown): string {
	const number = Number(value);
	if (!Number.isFinite(number)) return stableValue(value);
	return Number.isInteger(number)
		? String(number)
		: String(Math.round(number * 100) / 100);
}

function formatPercent(value: unknown): string {
	const number = Number(value);
	if (!Number.isFinite(number)) return "—";
	return `${Math.round(number * 100) / 100}%`;
}

function mapRiskLevelToIncrement(level: string): number {
	switch (level) {
		case "Низкий":
			return 0.03;
		case "Средний":
			return 0.05;
		case "Высокий":
			return 0.07;
		case "Очень высокий":
			return 0.1;
		default:
			return 0;
	}
}

function readUncertaintyField(
	uncertainty: Record<string, unknown>,
	canonicalKey: string,
	legacyKey: string,
): unknown {
	if (uncertainty[canonicalKey] != null && uncertainty[canonicalKey] !== "") {
		return uncertainty[canonicalKey];
	}
	return uncertainty[legacyKey];
}

function buildUncertaintyBreakdown(
	formData: Record<string, unknown>,
): UncertaintyBreakdown {
	const generalInfo = asRecord(formData.generalInfo) ?? {};
	const uncertainty = asRecord(formData.uncertaintyCalculation) ?? {};
	const riskGroup = asRecord(uncertainty.riskGroup) ?? {};
	const adjustmentRaw = readUncertaintyField(
		uncertainty,
		"uncertaintyAdjustment",
		"field_QCwwo5c5",
	);
	const adjustmentPercent = Number(
		String(adjustmentRaw ?? "")
			.replace(",", ".")
			.replace("%", ""),
	);
	const finiteAdjustment = Number.isFinite(adjustmentPercent)
		? adjustmentPercent
		: 0;

	const riskRows = Object.entries(riskGroup)
		.filter(([, value]) => typeof value === "string" && value.trim().length > 0)
		.map(([key, value]) => {
			const level = String(value);
			return {
				key,
				label: V2_UNCERTAINTY_RISK_GROUP_LABELS[key] ?? key,
				level,
				increment: mapRiskLevelToIncrement(level),
			};
		});

	const riskSum = riskRows.reduce((sum, row) => sum + row.increment, 0);
	const coefficient =
		Math.round((1 + riskSum + finiteAdjustment / 100) * 100) / 100;
	const formulaText = `1 + ${riskSum.toFixed(2)}${
		finiteAdjustment ? ` + ${finiteAdjustment}%` : ""
	} = ×${coefficient.toFixed(2)}`;

	return {
		displayLabel: uncertaintySummaryText(formData),
		storedLabel:
			typeof generalInfo.overallUncertainty === "string"
				? generalInfo.overallUncertainty
				: null,
		riskRows,
		riskSum,
		adjustmentPercent: finiteAdjustment,
		coefficient,
		formulaText,
	};
}

function buildSferaBreakdown(
	summary: V2AnketaSchemaEngine["summary"],
): SferaBreakdown | null {
	if (!summary) return null;

	const totalRow = summary.detailedCalculation?.find(
		(row) => row.stageName === "Итого",
	);
	const atypicalRow = summary.detailedCalculation?.find(
		(row) => row.stageName === "Нетиповые задачи",
	);

	const stageBaseTotal =
		typeof totalRow?.baseScore === "number" ? totalRow.baseScore : null;
	const stageAdjustedTotal =
		typeof totalRow?.complexityCoeff === "number"
			? totalRow.complexityCoeff
			: null;
	const atypicalAdjusted =
		typeof atypicalRow?.complexityCoeff === "number"
			? atypicalRow.complexityCoeff
			: 0;

	const baseScoreStream =
		typeof summary.baseScoreStream === "number"
			? summary.baseScoreStream
			: stageBaseTotal;
	const scoreWithComplexityCoeff =
		typeof summary.scoreWithComplexityCoeff === "number"
			? summary.scoreWithComplexityCoeff
			: stageAdjustedTotal != null
				? Math.round((stageAdjustedTotal + atypicalAdjusted) * 100) / 100
				: null;
	const deviationFromBaseline =
		typeof summary.deviationFromBaseline === "number"
			? summary.deviationFromBaseline
			: baseScoreStream != null &&
					scoreWithComplexityCoeff != null &&
					baseScoreStream !== 0
				? Math.round(
						(scoreWithComplexityCoeff / baseScoreStream) * 10000,
					) / 100
				: null;

	const formulaSteps = [
		`База = сумма нормативов выбранных типовых работ = ${formatNumber(baseScoreStream)}`,
		`Типовые + Нетиповые = итоговая трудоёмкость = ${formatNumber(scoreWithComplexityCoeff)}`,
		`Отклонение = (Типовые + Нетиповые) / База × 100% = ${formatPercent(deviationFromBaseline)}`,
		`Справочно: этапы E2E (строка «Итого») = ${formatNumber(stageAdjustedTotal)}; нетиповые в detailedCalculation = ${formatNumber(atypicalAdjusted)}`,
	];

	return {
		baseScoreStream,
		scoreWithComplexityCoeff,
		deviationFromBaseline,
		stageBaseTotal,
		stageAdjustedTotal,
		atypicalAdjusted,
		formulaSteps,
	};
}

function ExplanationLine({ children }: { children: ReactNode }) {
	return (
		<Typography variant="body2" color="text.secondary">
			{children}
		</Typography>
	);
}

function collectWorkContributions(
	value: unknown,
	prefix = "",
	out: WorkContribution[] = [],
): WorkContribution[] {
	if (Array.isArray(value)) {
		value.forEach((item, index) =>
			collectWorkContributions(item, `${prefix}[${index}]`, out),
		);
		return out;
	}
	const record = asRecord(value);
	if (!record) return out;
	const hasWorkTotal = typeof record.total === "number";
	const hasWorkIdentity =
		typeof record.name === "string" ||
		typeof record.taskCode === "string" ||
		typeof record.workId === "string";
	if (hasWorkTotal && hasWorkIdentity) {
		out.push({
			path: prefix,
			name: String(record.name ?? record.taskCode ?? record.workId),
			norm: record.estimateHoursPerDay ?? record.norm ?? "—",
			coefficient: record.coefficient ?? "—",
			total: record.total,
		});
	}
	for (const [key, child] of Object.entries(record)) {
		collectWorkContributions(child, prefix ? `${prefix}.${key}` : key, out);
	}
	return out;
}

function FlowValue({
	label,
	value,
	color,
}: {
	label: string;
	value: unknown;
	color?: string;
}) {
	return (
		<Card
			padding="12px"
			variant="outlined"
			sx={{ minWidth: 150, flex: "1 1 150px" }}
		>
			<Typography variant="caption" color="text.secondary">
				{label}
			</Typography>
			<Typography variant="h6" fontWeight={700} color={color}>
				{formatNumber(value)}
			</Typography>
		</Card>
	);
}

function FlowArrow({ label = "→" }: { label?: string }) {
	return (
		<Typography
			variant="h6"
			color="text.secondary"
			sx={{ alignSelf: "center" }}
		>
			{label}
		</Typography>
	);
}

function DebugValueCard({
	title,
	value,
	accent,
}: {
	title: string;
	value: unknown;
	accent?: boolean;
}) {
	return (
		<Card padding="12px" variant="outlined">
			<Typography variant="caption" color="text.secondary">
				{title}
			</Typography>
			<Typography
				variant="body2"
				component="pre"
				sx={{
					m: 0,
					mt: 0.5,
					whiteSpace: "pre-wrap",
					overflowWrap: "anywhere",
					color: accent ? "warning.main" : undefined,
				}}
			>
				{stableValue(value)}
			</Typography>
		</Card>
	);
}

export function V2CalculationDebugDialog({ open, onClose, engine }: Props) {
	const [tab, setTab] = useState(0);
	const [query, setQuery] = useState("");

	const flatValues = useMemo<FlatValue[]>(() => {
		const input = flatten(engine.formData);
		const calculated = flatten(engine.displayFormData);
		const paths = [...new Set([...input.keys(), ...calculated.keys()])].sort();
		return paths.map((path) => {
			const inputValue = input.get(path);
			const calculatedValue = calculated.get(path);
			return {
				path,
				inputValue,
				calculatedValue,
				changedByCalculation: !valuesEqual(inputValue, calculatedValue),
			};
		});
	}, [engine.displayFormData, engine.formData]);
	const workContributions = useMemo(
		() => collectWorkContributions(engine.displayFormData),
		[engine.displayFormData],
	);
	const uncertaintyBreakdown = useMemo(
		() => buildUncertaintyBreakdown(engine.displayFormData),
		[engine.displayFormData],
	);
	const sferaBreakdown = useMemo(
		() => buildSferaBreakdown(engine.summary),
		[engine.summary],
	);

	const normalizedQuery = query.trim().toLocaleLowerCase("ru");
	const visibleValues = flatValues.filter(
		(row) =>
			!normalizedQuery ||
			`${row.path} ${stableValue(row.inputValue)} ${stableValue(row.calculatedValue)}`
				.toLocaleLowerCase("ru")
				.includes(normalizedQuery),
	);

	const debugSnapshot = useMemo(
		() => ({
			generatedAt: new Date().toISOString(),
			template: {
				id: engine.template?.id ?? null,
				name: engine.template?.name ?? null,
				versionId: engine.version?.id ?? null,
			},
			status: {
				isLoading: engine.calculationLoading,
				error: engine.calculationError,
				logicValidationIssueCount: engine.logicValidationIssueCount,
				logicExtraErrors: engine.logicExtraErrors,
			},
			inputFormData: engine.formData,
			calculatedFormData: engine.displayFormData,
			calculationResult: engine.calculationResult,
			calculationItems: engine.calculationItems,
			taskTriggerItems: engine.taskTriggerItems,
			logicRules: engine.logicRules,
			summary: engine.summary,
		}),
		[engine],
	);

	const copySnapshot = async () => {
		try {
			await navigator.clipboard.writeText(
				JSON.stringify(debugSnapshot, null, 2),
			);
			toast.success("Диагностика расчёта скопирована");
		} catch {
			toast.error("Не удалось скопировать диагностику");
		}
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			fullWidth
			maxWidth="xl"
			data-test-id="v2-calculation-debug-dialog"
			slotProps={{ paper: { sx: { height: "90vh" } } }}
		>
			<DialogTitle>
				<Flex alignItems="center" justifyContent="space-between" gap={2}>
					<Flex alignItems="center" gap={1}>
						<BugReportOutlinedIcon color="warning" />
						<Typography variant="h6">
							Диагностика итоговой калькуляции
						</Typography>
					</Flex>
					<IconButton
						onClick={onClose}
						aria-label="Закрыть диагностику"
						title="Закрыть"
					>
						<CloseIcon />
					</IconButton>
				</Flex>
			</DialogTitle>
			<DialogContent dividers>
				<Flex flexDirection="column" minHeight="0">
					<Flex gap={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
						<Chip
							size="small"
							label={`Версия: ${engine.version?.id ?? "не определена"}`}
						/>
						<Chip
							size="small"
							color={engine.calculationError ? "error" : "success"}
							label={
								engine.calculationError ? "Ошибка расчёта" : "Расчёт выполнен"
							}
						/>
						<Chip size="small" label={`Полей: ${flatValues.length}`} />
						<Chip
							size="small"
							label={`Изменено расчётом: ${
								flatValues.filter((row) => row.changedByCalculation).length
							}`}
						/>
						<Chip size="small" label={`Правил: ${engine.logicRules.length}`} />
					</Flex>
					{engine.calculationError ? (
						<>
							<Spacer space={12} />
							<Alert severity="error">{engine.calculationError}</Alert>
						</>
					) : null}
					<Spacer space={12} />
					<Tabs
						value={tab}
						onChange={(_, value: number) => setTab(value)}
						variant="scrollable"
					>
						<Tab label="Как получился итог" />
						<Tab label="Вклад типовых работ" />
						<Tab label="Формулы правил" />
						<Tab label="Триггеры" />
						<Tab label="Все поля" />
						<Tab label="Полный JSON" />
					</Tabs>
					<Spacer space={16} />

					{tab === 0 ? (
						<Flex flexDirection="column" gap={20}>
							<Card padding="20px" variant="outlined">
								<Typography variant="h6" fontWeight={700}>
									1. Из чего сложилась итоговая трудоёмкость
								</Typography>
								<Spacer space={12} />
								<Flex gap={8} alignItems="stretch" sx={{ flexWrap: "wrap" }}>
									<FlowValue
										label="Типовые работы"
										value={engine.summary?.typicalTotal}
									/>
									<FlowArrow label="+" />
									<FlowValue
										label="Нетиповые работы"
										value={engine.summary?.atypicalTotal}
									/>
									<FlowArrow label="=" />
									<FlowValue
										label="Итоговая трудоёмкость"
										value={engine.summary?.total}
										color="primary.main"
									/>
								</Flex>
							</Card>

							<Card padding="20px" variant="outlined">
								<Typography variant="h6" fontWeight={700}>
									2. Итоговые показатели панели оценки
								</Typography>
								<Typography variant="body2" color="text.secondary">
									Те же значения, что показываются в блоке «Итоговая оценка», с
									расшифровкой формул.
								</Typography>
								<Spacer space={16} />

								<Typography variant="subtitle1" fontWeight={700}>
									Общая неопределенность
								</Typography>
								<Spacer space={8} />
								<Flex gap={8} alignItems="stretch" sx={{ flexWrap: "wrap" }}>
									<FlowValue
										label="Итоговая подпись"
										value={uncertaintyBreakdown.displayLabel}
										color="primary.main"
									/>
									<FlowValue
										label="Коэффициент неопределенности"
										value={uncertaintyBreakdown.coefficient}
										color="warning.main"
									/>
								</Flex>
								<Spacer space={8} />
								<ExplanationLine>
									Формула: {uncertaintyBreakdown.formulaText}
								</ExplanationLine>
								<ExplanationLine>
									База 1 + сумма вкладов рисков (Низкий +0.03, Средний +0.05,
									Высокий +0.07, Очень высокий +0.10) + корректировка из модалки
									(%).
								</ExplanationLine>
								<ExplanationLine>
									Этот коэффициент (generalUncertaintyCoefficient) также
									участвует в расчёте этапов E2E на бэкенде.
								</ExplanationLine>
								{uncertaintyBreakdown.storedLabel ? (
									<ExplanationLine>
										Сохранено в generalInfo.overallUncertainty:{" "}
										{uncertaintyBreakdown.storedLabel}
									</ExplanationLine>
								) : null}
								{uncertaintyBreakdown.riskRows.length > 0 ? (
									<>
										<Spacer space={12} />
										<Flex flexDirection="column" gap={8}>
											{uncertaintyBreakdown.riskRows.map((risk) => (
												<Flex
													key={risk.key}
													gap={8}
													alignItems="center"
													sx={{ flexWrap: "wrap" }}
												>
													<Typography
														variant="body2"
														sx={{ minWidth: 280, flex: "1 1 280px" }}
													>
														{risk.label}: {risk.level}
													</Typography>
													<Chip
														size="small"
														color="info"
														label={`+${risk.increment.toFixed(2)}`}
													/>
												</Flex>
											))}
										</Flex>
									</>
								) : (
									<ExplanationLine>
										Риски не заполнены — учитывается только корректировка (
										{formatNumber(uncertaintyBreakdown.adjustmentPercent)}%).
									</ExplanationLine>
								)}

								{sferaBreakdown ? (
									<>
										<Spacer space={20} />
										<Typography variant="subtitle1" fontWeight={700}>
											Базовая оценка и отклонение
										</Typography>
										<Spacer space={8} />
										<Flex
											gap={8}
											alignItems="stretch"
											sx={{ flexWrap: "wrap" }}
										>
											<FlowValue
												label="Базовая оценка (типовые работы стримов)"
												value={sferaBreakdown.baseScoreStream}
											/>
											<FlowArrow />
											<FlowValue
												label="Оценка с коэф. (база×коэф. + нетиповые)"
												value={sferaBreakdown.scoreWithComplexityCoeff}
												color="warning.main"
											/>
											<FlowArrow label="Δ" />
											<FlowValue
												label="Отклонение, %"
												value={formatPercent(
													sferaBreakdown.deviationFromBaseline,
												)}
												color="primary.main"
											/>
										</Flex>
										<Spacer space={12} />
										<Flex flexDirection="column" gap={6}>
											{sferaBreakdown.formulaSteps.map((step) => (
												<ExplanationLine key={step}>{step}</ExplanationLine>
											))}
										</Flex>
										<Spacer space={12} />
										<Flex gap={8} sx={{ flexWrap: "wrap" }}>
											<FlowValue
												label="База этапов E2E (строка «Итого»)"
												value={sferaBreakdown.stageBaseTotal}
											/>
											<FlowArrow label="→" />
											<FlowValue
												label="Скорректированные этапы"
												value={sferaBreakdown.stageAdjustedTotal}
												color="warning.main"
											/>
											<FlowArrow label="+" />
											<FlowValue
												label="Нетиповые после поправки"
												value={sferaBreakdown.atypicalAdjusted}
											/>
										</Flex>
									</>
								) : null}
							</Card>

							{(engine.summary?.platformStreams?.length ?? 0) > 0 ? (
								<Card padding="20px" variant="outlined">
									<Typography variant="h6" fontWeight={700}>
										3. Как рассчитан каждый платформенный стрим
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Базовая сумма типовых работ проходит поправку коэффициентом,
										затем к ней отдельно добавляются нетиповые задачи.
									</Typography>
									<Spacer space={12} />
									<Flex flexDirection="column" gap={12}>
										{engine.summary?.platformStreams?.map((stream, index) => (
											<Card
												key={`${stream.streamName}-${index}`}
												padding="12px"
												variant="outlined"
											>
												<Typography variant="subtitle1" fontWeight={700}>
													{stream.streamName ?? `Стрим ${index + 1}`}
												</Typography>
												<Spacer space={8} />
												<Flex
													gap={8}
													alignItems="stretch"
													sx={{ flexWrap: "wrap" }}
												>
													<FlowValue
														label="База типовых"
														value={stream.baseTypicalScore}
													/>
													<FlowArrow />
													<FlowValue
														label={`После поправки (${formatNumber(
															stream.deviationPercent,
														)}%)`}
														value={stream.adjustedTypicalScore}
														color="warning.main"
													/>
													<FlowArrow label="+" />
													<FlowValue
														label="Нетиповые"
														value={stream.atypicalScore}
													/>
													<FlowArrow label="=" />
													<FlowValue
														label="Итого по стриму"
														value={
															Number(stream.adjustedTypicalScore ?? 0) +
															Number(stream.atypicalScore ?? 0)
														}
														color="primary.main"
													/>
												</Flex>
											</Card>
										))}
									</Flex>
								</Card>
							) : null}

							{(engine.summary?.detailedCalculation?.length ?? 0) > 0 ? (
								<Card padding="20px" variant="outlined">
									<Typography variant="h6" fontWeight={700}>
										4. Поправки этапов E2E
									</Typography>
									<Spacer space={12} />
									<Flex flexDirection="column" gap={8}>
										{engine.summary?.detailedCalculation?.map(
											(stage, index) => (
												<Flex
													key={`${stage.stageName}-${index}`}
													gap={8}
													alignItems="center"
													sx={{
														flexWrap: "wrap",
														opacity: stage.disabled ? 0.45 : 1,
													}}
												>
													<Typography
														variant="body2"
														fontWeight={600}
														sx={{ minWidth: 220 }}
													>
														{stage.stageName ?? `Этап ${index + 1}`}
													</Typography>
													<FlowValue label="База" value={stage.baseScore} />
													<FlowArrow />
													<FlowValue
														label={`С поправкой (${formatNumber(
															stage.deviationFromBase,
														)}%)`}
														value={stage.complexityCoeff}
														color="warning.main"
													/>
												</Flex>
											),
										)}
									</Flex>
								</Card>
							) : null}

							<Card padding="20px" variant="outlined">
								<Typography variant="h6" fontWeight={700}>
									5. Вычисляемые правила
								</Typography>
								<Typography variant="body2" color="text.secondary">
									Каждая строка показывает реальные значения операндов, формулу
									и получившийся результат.
								</Typography>
								<Spacer space={12} />
								<Flex flexDirection="column" gap={12}>
									{engine.calculationItems.map((item) => (
										<Card key={item.ruleId} padding="12px" variant="outlined">
											<Flex
												alignItems="center"
												justifyContent="space-between"
												gap={2}
											>
												<Flex flexDirection="column">
													<Typography variant="subtitle2">
														{item.label}
													</Typography>
													<Typography variant="caption" color="text.secondary">
														{item.targetVarPath}
													</Typography>
												</Flex>
												<Chip
													color={item.error ? "error" : "success"}
													label={
														item.error
															? item.error
															: `Результат: ${formatNumber(item.value)}`
													}
												/>
											</Flex>
											<Spacer space={8} />
											<Typography
												variant="body2"
												fontWeight={600}
												color="primary.main"
											>
												{item.formulaHint || item.kind || "Формула не указана"}
											</Typography>
											<Spacer space={8} />
											<Flex gap={8} sx={{ flexWrap: "wrap" }}>
												{item.operands.map((operand) => (
													<FlowValue
														key={operand.varPath}
														label={operand.varPath}
														value={operand.value}
													/>
												))}
												<FlowArrow label="⇒" />
												<FlowValue
													label={item.label}
													value={item.value}
													color="primary.main"
												/>
											</Flex>
										</Card>
									))}
								</Flex>
							</Card>
						</Flex>
					) : null}

					{tab === 1 ? (
						<Flex flexDirection="column" gap={12}>
							<Typography variant="body2" color="text.secondary">
								Здесь видны конкретные работы, их норма, применённый коэффициент
								и вклад в общий итог.
							</Typography>
							{workContributions.map((work) => (
								<Card key={work.path} padding="12px" variant="outlined">
									<Typography variant="subtitle2">{work.name}</Typography>
									<Typography variant="caption" color="text.secondary">
										{work.path}
									</Typography>
									<Spacer space={8} />
									<Flex gap={8} alignItems="stretch" sx={{ flexWrap: "wrap" }}>
										<FlowValue label="Норма" value={work.norm} />
										<FlowArrow label="×" />
										<FlowValue
											label="Коэффициент"
											value={work.coefficient}
											color="warning.main"
										/>
										<FlowArrow label="=" />
										<FlowValue
											label="Вклад в итог"
											value={work.total}
											color="primary.main"
										/>
									</Flex>
								</Card>
							))}
						</Flex>
					) : null}

					{tab === 4 ? (
						<Flex flexDirection="column" gap={12}>
							<TextField
								size="small"
								label="Поиск по пути или значению"
								value={query}
								onChange={(event) => setQuery(event.target.value)}
							/>
							{visibleValues.map((row) => (
								<Card key={row.path} padding="12px" variant="outlined">
									<Flex alignItems="center" gap={1} sx={{ flexWrap: "wrap" }}>
										<Typography variant="subtitle2">{row.path}</Typography>
										{row.changedByCalculation ? (
											<Chip
												size="small"
												color="warning"
												label="изменено расчётом"
											/>
										) : null}
										{/coeff|coefficient|коэфф/i.test(row.path) ? (
											<Chip size="small" color="info" label="коэффициент" />
										) : null}
									</Flex>
									<Spacer space={8} />
									<Flex gap={8} sx={{ flexWrap: "wrap" }}>
										<Flex flexGrow={1} minWidth="280px">
											<DebugValueCard title="Ввод" value={row.inputValue} />
										</Flex>
										<Flex flexGrow={1} minWidth="280px">
											<DebugValueCard
												title="После расчёта"
												value={row.calculatedValue}
												accent={row.changedByCalculation}
											/>
										</Flex>
									</Flex>
								</Card>
							))}
						</Flex>
					) : null}

					{tab === 2 ? (
						<Flex flexDirection="column" gap={12}>
							{engine.logicRules.map((rule, index) => {
								const item = asRecord(rule);
								const id = stableValue(item?.id ?? `rule-${index}`);
								const calculationItem = engine.calculationItems.find(
									(candidate) => asRecord(candidate)?.ruleId === item?.id,
								);
								return (
									<Card
										key={`${id}-${index}`}
										padding="12px"
										variant="outlined"
									>
										<Typography variant="subtitle2">
											{id} · {stableValue(item?.kind)}
										</Typography>
										<Spacer space={8} />
										<DebugValueCard title="Правило" value={rule} />
										{calculationItem ? (
											<>
												<Spacer space={8} />
												<DebugValueCard
													title="Результат выполнения"
													value={calculationItem}
													accent
												/>
											</>
										) : null}
									</Card>
								);
							})}
						</Flex>
					) : null}

					{tab === 3 ? (
						<Flex flexDirection="column" gap={12}>
							{engine.taskTriggerItems.map((item, index) => (
								<Card key={index} padding="12px" variant="outlined">
									<DebugValueCard title={`Триггер ${index + 1}`} value={item} />
								</Card>
							))}
						</Flex>
					) : null}

					{tab === 5 ? (
						<Card padding="16px" variant="outlined">
							<Typography
								component="pre"
								variant="body2"
								sx={{ m: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
							>
								{JSON.stringify(debugSnapshot, null, 2)}
							</Typography>
						</Card>
					) : null}
				</Flex>
			</DialogContent>
			<DialogActions>
				<Button
					startIcon={<ContentCopyOutlinedIcon />}
					onClick={copySnapshot}
					title="Скопировать полный JSON диагностики"
				>
					Скопировать JSON
				</Button>
				<Button onClick={onClose}>Закрыть</Button>
			</DialogActions>
		</Dialog>
	);
}
