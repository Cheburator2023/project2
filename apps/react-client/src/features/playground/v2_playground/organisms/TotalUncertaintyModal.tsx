import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import CloseIcon from "@mui/icons-material/Close";
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
import { GENERAL_UNCERTAINTY_TOOLTIPS } from "@react-client/features/v2/admin_constructor/schemaEditor/fieldTypePresets";
import { useEffect, useMemo, useState } from "react";

const INITIATIVE_TIMELINE_DICTIONARY = "v2.method.21.сроки_инициативы";
const INITIATIVE_COST_DICTIONARY = "v2.method.22.стоимость_инициативы";
const UNCERTAINTY_ADJUSTMENT_MAX = 30;

type RiskOption = {
	id: string;
	label: string;
	tooltip?: string;
};

const RISK_GROUPS: RiskOption[] = [
	{
		id: "business_change",
		label: "Изменение, недостаточная проработка или сложности бизнес",
		tooltip: GENERAL_UNCERTAINTY_TOOLTIPS[0],
	},
	{
		id: "solution_defects",
		label: "Наличие дефектов во внедряемом решении/ ПО в рамках",
		tooltip: GENERAL_UNCERTAINTY_TOOLTIPS[1],
	},
	{
		id: "adjacent_projects",
		label: "Негативное влияние смежных проектов на показатели проекта",
		tooltip: GENERAL_UNCERTAINTY_TOOLTIPS[2],
	},
	{
		id: "labor_growth",
		label: "Увеличение трудозатрат проекта по причине недостаточной",
		tooltip: GENERAL_UNCERTAINTY_TOOLTIPS[3],
	},
	{
		id: "contractor_risk",
		label: "Недобросовестное исполнение услуг со стороны привлеченных",
		tooltip: GENERAL_UNCERTAINTY_TOOLTIPS[4],
	},
	{
		id: "staff_shortage",
		label: "Отсутствие квалифицированного персонала или ошибок",
		tooltip: GENERAL_UNCERTAINTY_TOOLTIPS[5],
	},
	{
		id: "sanctions",
		label: "Введение санкционных мер и других ограничений",
		tooltip: GENERAL_UNCERTAINTY_TOOLTIPS[6],
	},
	{
		id: "lack_of_controls",
		label: "Недостаток или отсутствие контрольных процедур",
		tooltip: GENERAL_UNCERTAINTY_TOOLTIPS[7],
	},
	{
		id: "regulatory_changes",
		label: "Изменение регуляторных требований",
		tooltip: GENERAL_UNCERTAINTY_TOOLTIPS[8],
	},
	{
		id: "post_project_usage",
		label: "Неиспользование ИС после завершения проекта",
		tooltip: GENERAL_UNCERTAINTY_TOOLTIPS[9],
	},
	{
		id: "target_architecture",
		label: "Изменения целевой ИТ архитектуры Банка",
		tooltip: GENERAL_UNCERTAINTY_TOOLTIPS[10],
	},
];

const RISK_LEVEL_OPTIONS = [
	{ value: "", label: "Не выбрано" },
	{ value: "low", label: "Низкий" },
	{ value: "medium", label: "Средний" },
	{ value: "high", label: "Высокий" },
];

export type TotalUncertaintyFormValues = {
	initiativeTimeline: string;
	initiativeCost: string;
	totalUncertaintyAdjustment: string;
	risks: Record<string, string>;
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

function clampAdjustmentInput(raw: string): string {
	const normalized = raw.replace(",", ".").replace(/%/g, "").trim();
	if (!normalized) return "";
	const parsed = Number(normalized);
	if (!Number.isFinite(parsed)) return raw;
	return String(Math.min(UNCERTAINTY_ADJUSTMENT_MAX, Math.max(0, parsed)));
}

type TotalUncertaintyModalProps = {
	open: boolean;
	onClose: () => void;
	onSubmit: (values: TotalUncertaintyFormValues) => void;
	loading?: boolean;
	defaultValues?: Partial<TotalUncertaintyFormValues>;
};

const INITIAL_VALUES: TotalUncertaintyFormValues = {
	initiativeTimeline: "",
	initiativeCost: "",
	totalUncertaintyAdjustment: "",
	risks: Object.fromEntries(RISK_GROUPS.map((risk) => [risk.id, ""])),
};

export const TotalUncertaintyModal = ({
	open,
	onClose,
	onSubmit,
	loading = false,
	defaultValues,
}: TotalUncertaintyModalProps) => {
	const { enumMapByCode } = useV2DictionaryEnumsMaps([
		INITIATIVE_TIMELINE_DICTIONARY,
		INITIATIVE_COST_DICTIONARY,
	]);
	const timelineOptions = useMemo(
		() => buildDictionaryOptions(enumMapByCode, INITIATIVE_TIMELINE_DICTIONARY),
		[enumMapByCode],
	);
	const costOptions = useMemo(
		() => buildDictionaryOptions(enumMapByCode, INITIATIVE_COST_DICTIONARY),
		[enumMapByCode],
	);

	const [values, setValues] = useState<TotalUncertaintyFormValues>({
		...INITIAL_VALUES,
		...defaultValues,
		risks: {
			...INITIAL_VALUES.risks,
			...defaultValues?.risks,
		},
	});

	useEffect(() => {
		if (!open) return;
		setValues({
			...INITIAL_VALUES,
			...defaultValues,
			risks: {
				...INITIAL_VALUES.risks,
				...defaultValues?.risks,
			},
		});
	}, [defaultValues, open]);

	const handleRiskChange =
		(riskId: string) => (event: SelectChangeEvent<string>) => {
			const nextValue = event.target.value;
			setValues((prev) => ({
				...prev,
				risks: {
					...prev.risks,
					[riskId]: nextValue,
				},
			}));
		};

	const handleSubmit = () => {
		onSubmit(values);
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
						helperText="Дополнительная экспертная поправка в диапазоне 0–30%"
					/>

					<Divider sx={{ my: 0.5 }} />

					<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
						Группа рисков
					</Typography>

					{RISK_GROUPS.map((risk) => (
						<FormControl fullWidth key={risk.id}>
							<Flex gap={0.5} alignItems="center" sx={{ mb: 0.5 }}>
								<Typography variant="body2" color="text.secondary">
									{risk.label}
								</Typography>
								{risk.tooltip ? (
									<div title={risk.tooltip}>
										<InfoOutlineIcon sx={{ fontSize: 16, color: "#88888877" }} />
									</div>
								) : null}
							</Flex>
							<Select
								displayEmpty
								value={values.risks[risk.id]}
								onChange={handleRiskChange(risk.id)}
							>
								{RISK_LEVEL_OPTIONS.map((option) => (
									<MenuItem key={option.value} value={option.value}>
										{option.label}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					))}
				</Stack>
			</DialogContent>

			<DialogActions sx={{ px: 3, py: 2 }}>
				<Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
					<Button onClick={onClose} color="inherit" disabled={loading}>
						ОТМЕНА
					</Button>
					<Button onClick={handleSubmit} variant="contained" disabled={loading}>
						ПРИМЕНИТЬ
					</Button>
				</Box>
			</DialogActions>
		</Dialog>
	);
};
