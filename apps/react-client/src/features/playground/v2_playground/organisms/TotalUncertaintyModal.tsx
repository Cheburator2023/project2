import CloseIcon from "@mui/icons-material/Close";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControl,
	IconButton,
	InputAdornment,
	MenuItem,
	Select,
	type SelectChangeEvent,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { useV2DictionaryEnumsMaps } from "@react-client/common/api/queries/v2-templates";
import { Flex } from "@react-client/common/primitives/Flex";
import { buildUncertaintyModalRiskGroups } from "@react-client/features/v2/anketaCRUD/utils/v2UncertaintyModalConfig";
import type { V2OverallUncertaintyCalcBreakdown } from "@smart-anketa/api-contract";
import { useEffect, useMemo, useRef, useState } from "react";

const INITIATIVE_TIMELINE_DICTIONARY = "v2.method.21.сроки_инициативы";
const INITIATIVE_COST_DICTIONARY = "v2.method.22.стоимость_инициативы";
const UNCERTAINTY_ADJUSTMENT_MAX = 30;

type UncertaintyAdjustmentProps = {
	minPct: number;
	maxPct: number;
	defaultPct: number;
	hint: string;
};

export type UncertaintyRiskSelection = {
	probability: string;
	goals: string;
};

export type TotalUncertaintyFormValues = {
	initiativeTimeline: string;
	initiativeCost: string;
	totalUncertaintyAdjustment: string;
	/** Ключ — id риска модалки; пустые probability+goals = не отмечен. */
	risks: Record<string, UncertaintyRiskSelection>;
};

type DictionarySelectOption = {
	value: string;
	label: string;
};

function buildDictionaryOptions(
	enumMapByCode: Record<string, { enums: string[]; enumNames: string[] }>,
	code: string,
): DictionarySelectOption[] {
	const pair = enumMapByCode[code];
	if (!pair) return [{ value: "", label: "Не выбрано" }];
	return [
		{ value: "", label: "Не выбрано" },
		...pair.enums.map((value, index) => ({
			value,
			label: pair.enumNames[index] ?? value,
		})),
	];
}

function toSelectOptions(
	values: string[] | undefined,
): DictionarySelectOption[] {
	if (!values || values.length === 0) {
		return [{ value: "", label: "Не выбрано" }];
	}
	return [
		{ value: "", label: "Не выбрано" },
		...values.map((value) => ({ value, label: value })),
	];
}

function clampAdjustmentInput(
	raw: string,
	minPct: number,
	maxPct: number,
): string {
	const normalized = raw.replace(",", ".").replace(/%/g, "").trim();
	if (!normalized) return "";
	const parsed = Number(normalized);
	if (!Number.isFinite(parsed)) return raw;
	return String(Math.min(maxPct, Math.max(minPct, parsed)));
}

function isRiskFilled(selection: UncertaintyRiskSelection): boolean {
	return Boolean(selection.probability.trim() && selection.goals.trim());
}

function emptyRiskSelection(): UncertaintyRiskSelection {
	return { probability: "", goals: "" };
}

type TotalUncertaintyModalProps = {
	open: boolean;
	onClose: () => void;
	onSubmit: (values: TotalUncertaintyFormValues) => void;
	/**
	 * Явный сброс рисков/поправки в formData (срок и стоимость не трогаем).
	 * Если не передан — вызывается onSubmit с очищенными значениями.
	 */
	onReset?: (values: TotalUncertaintyFormValues) => void;
	loading?: boolean;
	defaultValues?: Partial<TotalUncertaintyFormValues>;
	/** Шкалы из конфигуратора / схемы (приоритетнее словарей). */
	timelineOptions?: string[];
	costOptions?: string[];
	probabilityOptions?: string[];
	goalsOptions?: string[];
	riskGroups?: Array<{ id: string; label: string; tooltip?: string }>;
	/** Границы/дефолт/подсказка поля «Поправка» из конфигуратора. */
	adjustment?: UncertaintyAdjustmentProps;
	/** Живой предпросмотр итога по методике конфигуратора. */
	computeBreakdown?: (
		values: TotalUncertaintyFormValues,
	) => V2OverallUncertaintyCalcBreakdown;
};

export const TotalUncertaintyModal = ({
	open,
	onClose,
	onSubmit,
	onReset,
	loading = false,
	defaultValues,
	timelineOptions: timelineOptionsProp,
	costOptions: costOptionsProp,
	probabilityOptions: probabilityOptionsProp,
	goalsOptions: goalsOptionsProp,
	riskGroups: riskGroupsProp,
	adjustment,
	computeBreakdown,
}: TotalUncertaintyModalProps) => {
	const riskGroups = useMemo(
		() => riskGroupsProp ?? buildUncertaintyModalRiskGroups(),
		[riskGroupsProp],
	);
	const adjMin = adjustment?.minPct ?? 0;
	const adjMax = adjustment?.maxPct ?? UNCERTAINTY_ADJUSTMENT_MAX;
	const adjHint =
		adjustment?.hint ?? "Экспертная надбавка, добавляется к агрегату по рискам";

	const { enumMapByCode } = useV2DictionaryEnumsMaps(
		timelineOptionsProp && costOptionsProp
			? []
			: [INITIATIVE_TIMELINE_DICTIONARY, INITIATIVE_COST_DICTIONARY],
	);

	const timelineOptions = useMemo(
		() =>
			timelineOptionsProp
				? toSelectOptions(timelineOptionsProp)
				: buildDictionaryOptions(enumMapByCode, INITIATIVE_TIMELINE_DICTIONARY),
		[enumMapByCode, timelineOptionsProp],
	);
	const costOptions = useMemo(
		() =>
			costOptionsProp
				? toSelectOptions(costOptionsProp)
				: buildDictionaryOptions(enumMapByCode, INITIATIVE_COST_DICTIONARY),
		[costOptionsProp, enumMapByCode],
	);
	const probabilityOptions = useMemo(
		() => toSelectOptions(probabilityOptionsProp),
		[probabilityOptionsProp],
	);
	const goalsOptions = useMemo(
		() => toSelectOptions(goalsOptionsProp),
		[goalsOptionsProp],
	);

	const initialRisks = useMemo(
		() =>
			Object.fromEntries(
				riskGroups.map((risk) => [risk.id, emptyRiskSelection()]),
			) as Record<string, UncertaintyRiskSelection>,
		[riskGroups],
	);

	const [values, setValues] = useState<TotalUncertaintyFormValues>({
		initiativeTimeline: "",
		initiativeCost: "",
		totalUncertaintyAdjustment: "",
		risks: initialRisks,
	});

	// Сидим форму только при открытии модалки. `defaultValues` с родителя —
	// новый объект на каждый пересчёт/autosave displayFormData; если держать
	// его в deps и всегда setValues, незакоммиченные правки сбрасываются.
	const wasOpenRef = useRef(false);
	useEffect(() => {
		if (open && !wasOpenRef.current) {
			setValues({
				initiativeTimeline: defaultValues?.initiativeTimeline ?? "",
				initiativeCost: defaultValues?.initiativeCost ?? "",
				totalUncertaintyAdjustment:
					defaultValues?.totalUncertaintyAdjustment ?? "",
				risks: {
					...initialRisks,
					...defaultValues?.risks,
				},
			});
		}
		wasOpenRef.current = open;
	}, [open, defaultValues, initialRisks]);

	const patchRisk = (
		riskId: string,
		field: keyof UncertaintyRiskSelection,
		value: string,
	) => {
		setValues((prev) => ({
			...prev,
			risks: {
				...prev.risks,
				[riskId]: {
					...(prev.risks[riskId] ?? emptyRiskSelection()),
					[field]: value,
				},
			},
		}));
	};

	// Пока сроки и стоимость не выбраны, базовый уровень не определён — риски заблокированы.
	const risksLocked = !values.initiativeTimeline || !values.initiativeCost;
	const filledRiskCount = Object.values(values.risks).filter(
		isRiskFilled,
	).length;
	const breakdown = useMemo(
		() => (computeBreakdown ? computeBreakdown(values) : null),
		[computeBreakdown, values],
	);

	/** Сброс ответов по рискам и поправки; срок/стоимость не трогаем. Сразу в formData. */
	const handleReset = () => {
		const cleared: TotalUncertaintyFormValues = {
			initiativeTimeline: values.initiativeTimeline,
			initiativeCost: values.initiativeCost,
			totalUncertaintyAdjustment: "",
			risks: Object.fromEntries(
				riskGroups.map((risk) => [risk.id, emptyRiskSelection()]),
			) as Record<string, UncertaintyRiskSelection>,
		};
		setValues(cleared);
		(onReset ?? onSubmit)(cleared);
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="md"
			fullWidth
			PaperProps={{ sx: { borderRadius: 1.5, overflow: "hidden" } }}
		>
			<DialogTitle sx={{ pb: 1.5 }}>
				<Stack
					direction="row"
					alignItems="center"
					justifyContent="space-between"
				>
					<Typography variant="h5" component="span" sx={{ fontWeight: 600 }}>
						Расчет общей неопределенности
					</Typography>
					<IconButton onClick={onClose} size="small" aria-label="Закрыть">
						<CloseIcon fontSize="small" />
					</IconButton>
				</Stack>
			</DialogTitle>

			<DialogContent dividers sx={{ maxHeight: "70vh", px: 3, py: 2 }}>
				<Stack spacing={2}>
					<FormControl fullWidth>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
							Сроки инициативы
						</Typography>
						<Select
							displayEmpty
							value={values.initiativeTimeline}
							onChange={(event: SelectChangeEvent<string>) =>
								setValues((prev) => ({
									...prev,
									initiativeTimeline: event.target.value,
								}))
							}
						>
							{timelineOptions.map((option) => (
								<MenuItem key={option.value || "__empty"} value={option.value}>
									{option.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					<FormControl fullWidth>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
							Стоимость инициативы
						</Typography>
						<Select
							displayEmpty
							value={values.initiativeCost}
							onChange={(event: SelectChangeEvent<string>) =>
								setValues((prev) => ({
									...prev,
									initiativeCost: event.target.value,
								}))
							}
						>
							{costOptions.map((option) => (
								<MenuItem key={option.value || "__empty"} value={option.value}>
									{option.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					<TextField
						fullWidth
						type="number"
						label="Поправка на общую неопределенность"
						value={values.totalUncertaintyAdjustment}
						placeholder={String(adjustment?.defaultPct ?? 0)}
						onChange={(event) =>
							setValues((prev) => ({
								...prev,
								totalUncertaintyAdjustment: clampAdjustmentInput(
									event.target.value,
									adjMin,
									adjMax,
								),
							}))
						}
						inputProps={{
							min: adjMin,
							max: adjMax,
							step: 1,
						}}
						InputProps={{
							endAdornment: <InputAdornment position="end">%</InputAdornment>,
						}}
						helperText={`Опционально, ${adjMin}–${adjMax}%. ${adjHint}`}
					/>

					<Divider sx={{ my: 0.5 }} />

					<Flex gap={1} alignItems="baseline" justifyContent="space-between">
						<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
							Группа рисков
						</Typography>
						<Typography variant="caption" color="text.secondary">
							заполнено {filledRiskCount} из {riskGroups.length}
						</Typography>
					</Flex>

					{riskGroups.map((risk) => {
						const selection = values.risks[risk.id] ?? emptyRiskSelection();
						return (
							<Box key={risk.id} sx={{ opacity: risksLocked ? 0.55 : 1 }}>
								<Flex gap={0.5} alignItems="center" sx={{ mb: 0.5 }}>
									<Typography variant="body2" color="text.secondary">
										{risk.label}
									</Typography>
									{risk.tooltip ? (
										<IconButton
											size="small"
											title={risk.tooltip}
											aria-label={risk.tooltip}
											disableRipple
											sx={{ p: 0.25, flexShrink: 0, cursor: "help" }}
										>
											<InfoOutlineIcon
												sx={{
													fontSize: 16,
													color: "#88888877",
													pointerEvents: "none",
												}}
											/>
										</IconButton>
									) : null}
								</Flex>
								<Flex gap={1} wrap="wrap">
									<FormControl sx={{ flex: 1, minWidth: 200 }}>
										<Select
											displayEmpty
											disabled={risksLocked}
											value={selection.probability}
											onChange={(event: SelectChangeEvent<string>) =>
												patchRisk(risk.id, "probability", event.target.value)
											}
										>
											{probabilityOptions.map((option) => (
												<MenuItem
													key={`p-${option.value || "__empty"}`}
													value={option.value}
												>
													{option.value
														? `Вероятность: ${option.label}`
														: "Вероятность: не выбрано"}
												</MenuItem>
											))}
										</Select>
									</FormControl>
									<FormControl sx={{ flex: 1, minWidth: 200 }}>
										<Select
											displayEmpty
											disabled={risksLocked}
											value={selection.goals}
											onChange={(event: SelectChangeEvent<string>) =>
												patchRisk(risk.id, "goals", event.target.value)
											}
										>
											{goalsOptions.map((option) => (
												<MenuItem
													key={`g-${option.value || "__empty"}`}
													value={option.value}
												>
													{option.value
														? `Цели: ${option.label}`
														: "Цели: не выбрано"}
												</MenuItem>
											))}
										</Select>
									</FormControl>
								</Flex>
							</Box>
						);
					})}
					{breakdown || risksLocked ? (
						<Box
							sx={{
								borderRadius: 1.5,
								bgcolor: "#1c2333",
								color: "#fff",
								px: 2,
								py: 1.5,
							}}
						>
							<Typography
								variant="caption"
								sx={{
									textTransform: "uppercase",
									letterSpacing: 0.6,
									opacity: 0.7,
								}}
							>
								Предпросмотр формулы
							</Typography>
							{(risksLocked
								? [
										"Срок или стоимость инициативы не выбраны → коэффициент 1 (не рассчитано)",
									]
								: (breakdown?.formulaLines ?? [])
							).map((line) => (
								<Typography
									key={line}
									variant="body2"
									sx={{
										opacity: 0.92,
										fontFamily: "ui-monospace, monospace",
										fontSize: 12,
										mt: 0.5,
									}}
								>
									{line}
								</Typography>
							))}
							<Flex
								alignItems="baseline"
								justifyContent="space-between"
								sx={{ mt: 1 }}
							>
								<Typography variant="caption" sx={{ opacity: 0.7 }}>
									Общая неопределённость
								</Typography>
								<Typography variant="h5" sx={{ fontWeight: 700 }}>
									{risksLocked
										? "Не рассчитано"
										: (breakdown?.coefficient ?? 1)
												.toFixed(2)
												.replace(".", ",")}
								</Typography>
							</Flex>
						</Box>
					) : null}
				</Stack>
			</DialogContent>

			<DialogActions
				sx={{ px: 3, py: 2, justifyContent: "space-between" }}
			>
				<Button
					onClick={handleReset}
					color="inherit"
					disabled={loading}
					title="Сбросить ответы по рискам и поправку"
				>
					Сброс
				</Button>
				<Box sx={{ display: "flex", gap: 1 }}>
					<Button onClick={onClose} color="inherit" disabled={loading}>
						ОТМЕНА
					</Button>
					<Button
						onClick={() => onSubmit(values)}
						variant="contained"
						disabled={loading}
					>
						ПРИМЕНИТЬ
					</Button>
				</Box>
			</DialogActions>
		</Dialog>
	);
};
