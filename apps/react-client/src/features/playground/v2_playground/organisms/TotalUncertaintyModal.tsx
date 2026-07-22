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
import { useEffect, useMemo, useState } from "react";

const INITIATIVE_TIMELINE_DICTIONARY = "v2.method.21.сроки_инициативы";
const INITIATIVE_COST_DICTIONARY = "v2.method.22.стоимость_инициативы";
const UNCERTAINTY_ADJUSTMENT_MAX = 30;

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

function toSelectOptions(values: string[] | undefined): DictionarySelectOption[] {
	if (!values || values.length === 0) {
		return [{ value: "", label: "Не выбрано" }];
	}
	return [
		{ value: "", label: "Не выбрано" },
		...values.map((value) => ({ value, label: value })),
	];
}

function clampAdjustmentInput(raw: string): string {
	const normalized = raw.replace(",", ".").replace(/%/g, "").trim();
	if (!normalized) return "";
	const parsed = Number(normalized);
	if (!Number.isFinite(parsed)) return raw;
	return String(Math.min(UNCERTAINTY_ADJUSTMENT_MAX, Math.max(0, parsed)));
}

function emptyRiskSelection(): UncertaintyRiskSelection {
	return { probability: "", goals: "" };
}

type TotalUncertaintyModalProps = {
	open: boolean;
	onClose: () => void;
	onSubmit: (values: TotalUncertaintyFormValues) => void;
	loading?: boolean;
	defaultValues?: Partial<TotalUncertaintyFormValues>;
	/** Шкалы из конфигуратора / схемы (приоритетнее словарей). */
	timelineOptions?: string[];
	costOptions?: string[];
	probabilityOptions?: string[];
	goalsOptions?: string[];
	riskGroups?: Array<{ id: string; label: string; tooltip?: string }>;
};

export const TotalUncertaintyModal = ({
	open,
	onClose,
	onSubmit,
	loading = false,
	defaultValues,
	timelineOptions: timelineOptionsProp,
	costOptions: costOptionsProp,
	probabilityOptions: probabilityOptionsProp,
	goalsOptions: goalsOptionsProp,
	riskGroups: riskGroupsProp,
}: TotalUncertaintyModalProps) => {
	const riskGroups = useMemo(
		() => riskGroupsProp ?? buildUncertaintyModalRiskGroups(),
		[riskGroupsProp],
	);

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

	useEffect(() => {
		if (!open) return;
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
	}, [defaultValues, initialRisks, open]);

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

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="md"
			fullWidth
			PaperProps={{ sx: { borderRadius: 1.5, overflow: "hidden" } }}
		>
			<DialogTitle sx={{ pb: 1.5 }}>
				<Stack direction="row" alignItems="center" justifyContent="space-between">
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
						onChange={(event) =>
							setValues((prev) => ({
								...prev,
								totalUncertaintyAdjustment: clampAdjustmentInput(
									event.target.value,
								),
							}))
						}
						inputProps={{
							min: 0,
							max: UNCERTAINTY_ADJUSTMENT_MAX,
							step: 1,
						}}
						InputProps={{
							endAdornment: (
								<InputAdornment position="end">%</InputAdornment>
							),
						}}
						helperText="Опционально, 0–30%. Если задана — полностью перекрывает автосчёт по рискам"
					/>

					<Divider sx={{ my: 0.5 }} />

					<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
						Группа рисков
					</Typography>
					<Typography variant="caption" color="text.secondary">
						Отметьте применимые риски: вероятность и влияние на Цели
					</Typography>

					{riskGroups.map((risk) => {
						const selection = values.risks[risk.id] ?? emptyRiskSelection();
						return (
							<Box key={risk.id}>
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
				</Stack>
			</DialogContent>

			<DialogActions sx={{ px: 3, py: 2 }}>
				<Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
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
