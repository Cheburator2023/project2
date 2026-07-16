import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import type {
	V2TypicalWorkParameterDto,
	V2TypicalWorkRuleDto,
	V2TypicalWorkTriggerArchCountCombinator,
	V2TypicalWorkTriggerArchCountDto,
	V2TypicalWorkTriggerFormulaDto,
	V2TypicalWorkTriggerMode,
	V2WorkFormulaArchCountKind,
	V2WorkRuleOperator,
	V2WorkTriggerStatus,
} from "@smart-anketa/api-contract";
import {
	V2_WORK_FORMULA_ARCH_COUNT_KINDS,
	V2_WORK_RULE_OPERATOR_VALUES,
	catalogValueMatchesTriggerRule,
	defaultTriggerArchCount,
	defaultTriggerFormula,
	formatWorkArchCountKindLabel,
	isControlTypeTriggerParam,
	isSourceTypeTriggerParam,
	validateArchCountCoeffSteps,
} from "@smart-anketa/api-contract";
import { FuzzyAutocomplete } from "@react-client/common/muiCustom/FuzzyAutocomplete";
import { SegmentBar } from "@react-client/common/muiCustom/SegmentBar";
import { V2_TEMPLATE_EDIT_TEST_IDS as TID } from "@react-client/features/v2/admin_constructor/testIds";
import { useEffect, useMemo, useState } from "react";
import {
	ArchCountCoeffStepsEditor,
	formatArchCountCoeffChipSubtitle,
} from "./ArchCountCoeffStepsEditor";
import {
	catalogForTriggerRuleGroup,
	isWorkTriggerGroupInvalid,
	type TriggerPreviewState,
	type TriggerValidationIssue,
} from "./typicalWorkPatchErrors";
import {
	excludeRulesByGroupKey,
	filterRulesByGroupKey,
	isSchemaTextualParam,
	resolveSchemaParamForTriggerRule,
	resolveSchemaParamFieldRef,
	schemaParamDisplayName,
	schemaParamRuleName,
	schemaWorkParameterEmptyPickerMessage,
	triggerRuleGroupKey,
} from "./schemaWorkParameters";
import { TypicalWorkValueMatchingInfo } from "./typicalWorkValueMatchingHelp";
import { TriggerFormulaEditor } from "./TriggerFormulaEditor";

const TRIGGER_MODE_SEGMENTS: Array<{
	id: V2TypicalWorkTriggerMode;
	label: string;
	title?: string;
}> = [
	{
		id: "simple",
		label: "Простые условия",
		title: "Параметры-триггеры с объединением по И",
	},
	{
		id: "formula",
		label: "Формула",
		title: "Произвольная логика: И, ИЛИ, скобки",
	},
];

type TypicalWorkTriggersSectionProps = {
	rules: V2TypicalWorkRuleDto[];
	triggerMode?: V2TypicalWorkTriggerMode;
	triggerFormula?: V2TypicalWorkTriggerFormulaDto;
	triggerArchCount?: V2TypicalWorkTriggerArchCountDto;
	triggerStatus: V2WorkTriggerStatus;
	triggerPreviewState?: TriggerPreviewState;
	validationIssues?: TriggerValidationIssue[];
	schemaFieldCount?: number;
	paramOptions: V2TypicalWorkParameterDto[];
	methodologyCatalog?: V2TypicalWorkParameterDto[];
	streamExecutor: string;
	onChange: (rules: V2TypicalWorkRuleDto[]) => void;
	onTriggerModeChange: (mode: V2TypicalWorkTriggerMode) => void;
	onTriggerFormulaChange: (formula: V2TypicalWorkTriggerFormulaDto) => void;
	onTriggerArchCountChange: (value: V2TypicalWorkTriggerArchCountDto) => void;
	onNavigateToSchemaField?: (pointer: string) => void;
	/** Id параметра (`schema:…`) — подставить в поиск «Параметр-триггер». */
	triggerParamPickId?: string | null;
	onTriggerParamPickConsumed?: () => void;
};

const OPERATOR_LABELS: Record<V2WorkRuleOperator, string> = {
	"=": "=",
	"!=": "≠",
	">=": "≥",
	"<=": "≤",
	">": ">",
	"<": "<",
	in: "∈",
	not_in: "∉",
};

type ArchCountOption = {
	kind: V2WorkFormulaArchCountKind;
	label: string;
};

const TRIGGER_ARCH_COUNT_FIELD_SX = {
	"& .MuiOutlinedInput-root": {
		bgcolor: "#eff6ff",
		color: "#1d4ed8",
		borderColor: "#bfdbfe",
		outline: "none",
		"&:hover": {
			borderColor: "#bfdbfe",
		},
		"&.Mui-focused": {
			outline: "none",
			boxShadow: "none",
			borderColor: "#1d4ed8",
		},
	},
	"& .MuiInputBase-root.Mui-disabled": {
		opacity: 0.65,
	},
	"& .MuiSelect-select": {
		fontWeight: 600,
		fontSize: 13,
	},
} as const;

function triggerBanner(
	status: V2WorkTriggerStatus,
	ruleCount: number,
	issues: TriggerValidationIssue[] = [],
	previewState: TriggerPreviewState = "none",
) {
	if (status === "hidden" && previewState === "none" && ruleCount > 0) {
		return {
			bg: "#eef4ff",
			border: "#d4e2f7",
			iconBg: "#2f6bd8",
			icon: "i",
			title: `Условия настроены (${ruleCount} ${ruleCount === 1 ? "условие" : "условия"})`,
			sub: "заполните поля стрима или систему-источник в превью анкеты — тогда проверим появление работы",
			fg: "#2f6bd8",
		};
	}

	switch (status) {
		case "appears":
			return {
				bg: "#e7f6ec",
				border: "#cfe9d8",
				iconBg: "#1f8a4d",
				icon: "✓",
				title: `Работа появляется в анкете (${ruleCount} ${ruleCount === 1 ? "условие" : "условия"})`,
				sub: "все условия выполнены для источника в превью",
				fg: "#1f8a4d",
			};
		case "invalid":
			return {
				bg: "#fdecec",
				border: "#f5c6c6",
				iconBg: "#c62828",
				icon: "!",
				title: "Условия заданы некорректно",
				sub:
					issues.length > 0
						? issues.map((item) => item.message).join(" · ")
						: "проверьте параметры-триггеры",
				fg: "#c62828",
			};
		case "hidden":
			return {
				bg: "#eef1f6",
				border: "#dfe2ea",
				iconBg: "#5b6577",
				icon: "–",
				title: "Работа скрыта при текущих ответах",
				sub: "есть триггеры, но условия не выполнены",
				fg: "#5b6577",
			};
		default:
			return {
				bg: "#fdf3e0",
				border: "#f0e3c8",
				iconBg: "#b5791f",
				icon: "•",
				title: "Без триггеров — работа не появится в анкете",
				sub: "добавьте хотя бы одно условие, чтобы работа участвовала в расчёте",
				fg: "#b5791f",
			};
	}
}

export function TypicalWorkTriggersSection({
	rules,
	triggerMode = "simple",
	triggerFormula = defaultTriggerFormula(),
	triggerArchCount = defaultTriggerArchCount(),
	triggerStatus,
	triggerPreviewState = "none",
	validationIssues = [],
	schemaFieldCount = 0,
	paramOptions,
	methodologyCatalog = [],
	streamExecutor,
	onChange,
	onTriggerModeChange,
	onTriggerFormulaChange,
	onTriggerArchCountChange,
	onNavigateToSchemaField,
	triggerParamPickId,
	onTriggerParamPickConsumed,
}: TypicalWorkTriggersSectionProps) {
	const [pickerKey, setPickerKey] = useState(0);
	const [archCountPickerKey, setArchCountPickerKey] = useState(0);
	const [archCountEditOpen, setArchCountEditOpen] = useState(false);
	const [triggerPickerSearchTerm, setTriggerPickerSearchTerm] = useState<
		string | undefined
	>(undefined);
	const configuredConditionCount = useMemo(() => {
		if (triggerMode === "formula") {
			return triggerFormula.tokens.filter(
				(token) => token.kind === "param" || token.kind === "arch_count",
			).length;
		}
		return rules.length + (triggerArchCount.kind ? 1 : 0);
	}, [
		triggerMode,
		triggerFormula.tokens,
		rules.length,
		triggerArchCount.kind,
	]);

	const banner = triggerBanner(
		triggerStatus,
		configuredConditionCount,
		validationIssues,
		triggerPreviewState,
	);

	const usedGroupKeys = useMemo(
		() => new Set(rules.map((r) => triggerRuleGroupKey(r, paramOptions))),
		[rules, paramOptions],
	);

	const pickerItems = useMemo(
		() => paramOptions.filter((p) => !usedGroupKeys.has(p.code)),
		[paramOptions, usedGroupKeys],
	);

	const emptyPickerHint = schemaWorkParameterEmptyPickerMessage(
		schemaFieldCount,
		usedGroupKeys.size,
		pickerItems.length,
	);

	const archCountInvalid =
		triggerArchCount.kind != null &&
		Boolean(
			validateArchCountCoeffSteps(
				triggerArchCount.kind,
				triggerArchCount.steps,
			),
		);

	useEffect(() => {
		if (!triggerParamPickId?.trim()) return;
		setTriggerPickerSearchTerm(triggerParamPickId);
		setPickerKey((key) => key + 1);
		onTriggerParamPickConsumed?.();
	}, [triggerParamPickId, onTriggerParamPickConsumed]);

	const grouped = useMemo(() => {
		const map = new Map<string, V2TypicalWorkRuleDto[]>();
		for (const rule of rules) {
			const key = triggerRuleGroupKey(rule, paramOptions);
			const list = map.get(key) ?? [];
			list.push(rule);
			map.set(key, list);
		}
		return [...map.entries()];
	}, [rules, paramOptions]);

	const toggleValue = (
		groupKey: string,
		param: V2TypicalWorkParameterDto,
		valueCode: string,
		valueLabel: string,
		selected: boolean,
	) => {
		const operator = paramRulesOperator(rules, groupKey, paramOptions);
		const isAnyOf = operator === "in" || operator === "not_in";

		if (isAnyOf) {
			const groupRules = filterRulesByGroupKey(rules, groupKey, paramOptions);
			const current = groupRules[0];
			const currentValues = current?.values?.length
				? current.values
				: current?.valueCode
					? [{ code: current.valueCode, label: current.valueLabel }]
					: [];
			const nextValues = selected
				? currentValues.filter((v) => v.code !== valueCode)
				: [...currentValues, { code: valueCode, label: valueLabel }];
			const withoutGroup = excludeRulesByGroupKey(
				rules,
				groupKey,
				paramOptions,
			);
			if (nextValues.length === 0) {
				onChange(withoutGroup);
				return;
			}
			onChange([
				...withoutGroup,
				{
					id: current?.id ?? `new-${Date.now()}`,
					streamExecutor,
					schemaFieldUid: param.schemaFieldUid ?? null,
					paramCode: param.code,
					paramName: schemaParamRuleName(param),
					operator,
					valueCode: null,
					valueLabel: null,
					values: nextValues.map((v) => ({
						code: v.code,
						label: v.label ?? null,
					})),
				},
			]);
			return;
		}

		if (selected) {
			onChange(
				rules.filter(
					(r) =>
						!(
							triggerRuleGroupKey(r, paramOptions) === groupKey &&
							r.valueCode === valueCode
						),
				),
			);
			return;
		}
		const withoutGroup = excludeRulesByGroupKey(rules, groupKey, paramOptions);
		const currentOperator =
			filterRulesByGroupKey(rules, groupKey, paramOptions)[0]?.operator ?? "=";
		onChange([
			...withoutGroup,
			{
				id: `new-${Date.now()}-${valueCode}`,
				streamExecutor,
				schemaFieldUid: param.schemaFieldUid ?? null,
				paramCode: param.code,
				paramName: schemaParamRuleName(param),
				operator: currentOperator,
				valueCode,
				valueLabel,
			},
		]);
	};

	const removeParam = (groupKey: string) => {
		onChange(excludeRulesByGroupKey(rules, groupKey, paramOptions));
	};

	const updateParamOperator = (
		groupKey: string,
		operator: V2WorkRuleOperator,
	) => {
		onChange(
			rules.map((rule) =>
				triggerRuleGroupKey(rule, paramOptions) === groupKey
					? { ...rule, operator }
					: rule,
			),
		);
	};

	const addParam = (param: V2TypicalWorkParameterDto) => {
		const firstValue = param.values[0];
		onChange([
			...rules,
			{
				id: `new-${Date.now()}`,
				streamExecutor,
				schemaFieldUid: param.schemaFieldUid ?? null,
				paramCode: param.code,
				paramName: schemaParamRuleName(param),
				operator: "=",
				valueCode: firstValue?.code ?? null,
				valueLabel: firstValue?.label ?? null,
			},
		]);
		setPickerKey((key) => key + 1);
	};

	return (
		<Box
			sx={{
				bgcolor: "#fff",
				border: "1px solid #e6e8ee",
				borderRadius: "12px",
				p: "15px 17px",
				mb: 1.5,
			}}
		>
			<Box
				sx={{
					display: "flex",
					alignItems: "flex-start",
					gap: 1.1,
					mb: 1.4,
					flexWrap: "wrap",
				}}
			>
				<Typography
					sx={{ fontSize: 13.5, fontWeight: 700, color: "#1d2435", pt: 0.75 }}
				>
					Условия появления работы
				</Typography>
				<SegmentBar
					data-test-id={TID.workTriggerModeBar}
					segments={TRIGGER_MODE_SEGMENTS}
					value={triggerMode}
					onChange={onTriggerModeChange}
				/>
				{triggerMode === "simple" ? (
				<Box
					sx={{ ml: "auto", minWidth: 280, maxWidth: 420, flex: "1 1 280px" }}
				>
					<FuzzyAutocomplete<V2TypicalWorkParameterDto>
						key={pickerKey}
						data-test-id="trig-picker-items"
						options={pickerItems}
						value={null}
						onChange={(param) => {
							if (!param) return;
							addParam(param);
							setTriggerPickerSearchTerm(undefined);
						}}
						getOptionLabel={(param) => param.name}
						getOptionValue={(param) => param.code}
						getOptionSecondaryText={(param) => {
							const ref = resolveSchemaParamFieldRef(param);
							if (ref.varPath) {
								return `${param.id} · ${ref.varPath} · ${ref.fieldKey}`;
							}
							return param.id;
						}}
						initialSearchTerm={triggerPickerSearchTerm}
						autoOpenOnInitialSearch={Boolean(triggerPickerSearchTerm)}
						label="Параметр-триггер"
						placeholder="Выберите поле схемы…"
						emptyLabel="Выберите поле схемы…"
						searchPlaceholder="поиск параметра…"
						noMatchesText="Параметры не найдены"
						allowEmpty
						disabled={pickerItems.length === 0}
						helperText={pickerItems.length === 0 ? emptyPickerHint : undefined}
						statusAlert={
							pickerItems.length === 0
								? {
										severity: "info",
										message: emptyPickerHint,
									}
								: null
						}
					/>
				</Box>
				) : null}
			</Box>

			<TypicalWorkValueMatchingInfo variant="triggers" />

			{triggerMode === "formula" ? (
				<TriggerFormulaEditor
					formula={triggerFormula}
					paramOptions={paramOptions}
					onChange={onTriggerFormulaChange}
				/>
			) : null}

			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 1.4,
					borderRadius: "10px",
					p: "11px 13px",
					mb: 1.5,
					bgcolor: banner.bg,
					border: `1px solid ${banner.border}`,
				}}
			>
				<Box
					sx={{
						width: 26,
						height: 26,
						borderRadius: "50%",
						bgcolor: banner.iconBg,
						color: "#fff",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: 14,
						fontWeight: 700,
						flexShrink: 0,
					}}
				>
					{banner.icon}
				</Box>
				<Box>
					<Typography sx={{ fontSize: 13, fontWeight: 700, color: banner.fg }}>
						{banner.title}
					</Typography>
					<Typography sx={{ fontSize: 11.5, color: "#6b7484", mt: 0.15 }}>
						{banner.sub}
					</Typography>
					{triggerStatus === "invalid" && validationIssues.length > 1 ? (
						<Box
							component="ul"
							sx={{
								m: "6px 0 0",
								pl: 2.2,
								fontSize: 11.5,
								color: "#6b7484",
							}}
						>
							{validationIssues.map((issue) => (
								<Box component="li" key={`${issue.paramCode}-${issue.message}`}>
									{issue.message}
								</Box>
							))}
						</Box>
					) : null}
				</Box>
			</Box>

			{triggerMode === "simple" ? (
			<>
			{grouped.length > 0 ? (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
					{grouped.map(([groupKey, paramRules]) => {
						const ruleSeed = {
							paramCode: paramRules[0]?.paramCode ?? groupKey,
							paramName: paramRules[0]?.paramName ?? null,
						};
						const param =
							paramOptions.find((item) => item.code === groupKey) ??
							resolveSchemaParamForTriggerRule(ruleSeed, paramOptions);
						const isKnownPseudoTrigger =
							isSourceTypeTriggerParam(
								ruleSeed.paramCode,
								ruleSeed.paramName,
							) ||
							isControlTypeTriggerParam(ruleSeed.paramCode, ruleSeed.paramName);
						const validationCatalog = catalogForTriggerRuleGroup(
							ruleSeed,
							paramOptions,
							methodologyCatalog,
						);
						const groupInvalid = isWorkTriggerGroupInvalid(
							groupKey,
							paramRules,
							validationCatalog,
						);
						const selectedCodes = new Set(
							(
								paramRules[0]?.values?.map((v) => v.code) ??
								paramRules.map((r) => r.valueCode)
							).filter(Boolean),
						);
						const staleRules = paramRules.filter((rule) => {
							if (!rule.valueCode && !rule.valueLabel) return false;
							if (param) {
								return !param.values.some((value) =>
									catalogValueMatchesTriggerRule(value, {
										...ruleSeed,
										valueCode: rule.valueCode,
										valueLabel: rule.valueLabel,
									}),
								);
							}
							return isWorkTriggerGroupInvalid(
								groupKey,
								[rule],
								validationCatalog,
							);
						});
						const displayName =
							param?.name ??
							(isSourceTypeTriggerParam(ruleSeed.paramCode, ruleSeed.paramName)
								? "Тип источника данных"
								: schemaParamDisplayName(paramRules[0]?.paramName) || groupKey);
						const fieldRef = resolveSchemaParamFieldRef(param);
						return (
							<Box
								key={groupKey}
								data-work-trigger-param={groupKey}
								sx={{
									border: `1px solid ${groupInvalid ? "#f5c6c6" : "#f0e3d2"}`,
									bgcolor: groupInvalid ? "#fff5f5" : "#fdf8f1",
									borderRadius: "11px",
									p: "11px 12px",
								}}
							>
								<Box
									sx={{
										display: "flex",
										alignItems: "flex-start",
										gap: 1,
										mb: 1.1,
									}}
								>
									<Box sx={{ flex: 1, minWidth: 0 }}>
										<Typography
											sx={{
												fontSize: 12.5,
												fontWeight: 700,
												color: "#1d2435",
												lineHeight: 1.25,
											}}
										>
											{displayName}
										</Typography>
										{fieldRef.varPath ? (
											<Typography
												sx={{
													mt: 0.35,
													fontSize: 10.5,
													color: "#8a93a3",
													fontFamily:
														"ui-monospace, SFMono-Regular, Menlo, monospace",
													lineHeight: 1.35,
													wordBreak: "break-all",
												}}
											>
												{fieldRef.varPath} · {fieldRef.fieldKey}
											</Typography>
										) : (
											<Typography
												sx={{ mt: 0.35, fontSize: 10.5, color: "#8a93a3" }}
											>
												{groupKey}
											</Typography>
										)}
									</Box>
									{fieldRef.pointer && onNavigateToSchemaField ? (
										<Button
											size="small"
											variant="outlined"
											title="Выделить поле на холсте конструктора"
											startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
											onClick={() => onNavigateToSchemaField(fieldRef.pointer!)}
											sx={{
												flexShrink: 0,
												minWidth: 0,
												px: 1,
												py: 0.35,
												fontSize: 11,
												fontWeight: 600,
												textTransform: "none",
												borderColor: "#dfe2ea",
												color: "#4b5565",
											}}
										>
											К конструктору
										</Button>
									) : null}
									<IconButton
										size="small"
										aria-label="Удалить триггер"
										onClick={() => removeParam(groupKey)}
										sx={{ color: "#c2554c", mt: -0.25 }}
									>
										<DeleteOutlineIcon fontSize="small" />
									</IconButton>
								</Box>
								<Typography sx={{ fontSize: 11, color: "#9a7b52", mb: 0.9 }}>
									Работа появляется, если ответ соответствует условию:
								</Typography>
								<Box
									sx={{
										display: "flex",
										alignItems: "center",
										gap: 1,
										mb: 1,
										flexWrap: "wrap",
									}}
								>
									<Typography sx={{ fontSize: 11.5, color: "#6b7484" }}>
										Оператор
									</Typography>
									<Select
										size="small"
										value={paramRules[0]?.operator ?? "="}
										onChange={(event) =>
											updateParamOperator(
												groupKey,
												event.target.value as V2WorkRuleOperator,
											)
										}
										sx={{
											height: 30,
											minWidth: 76,
											bgcolor: "#fff",
											"& .MuiSelect-select": { py: 0.4, fontSize: 12 },
										}}
									>
										{V2_WORK_RULE_OPERATOR_VALUES.filter((op) => {
											if (op === "in" || op === "not_in") {
												return param?.numeric !== true;
											}
											if (op === "=" || op === "!=") return true;
											return param?.numeric === true;
										}).map((operator) => (
											<MenuItem key={operator} value={operator}>
												{OPERATOR_LABELS[operator]}
											</MenuItem>
										))}
									</Select>
								</Box>
								{groupInvalid ? (
									<Typography
										sx={{ fontSize: 11.5, color: "#c62828", mb: 0.9 }}
									>
										{!param && !isKnownPseudoTrigger
											? "Поле удалено из схемы — обновите условия"
											: "Выбраны значения, которых больше нет в справочнике"}
									</Typography>
								) : null}
								{staleRules.length > 0 ? (
									<Box
										sx={{
											display: "flex",
											flexWrap: "wrap",
											gap: 0.75,
											mb: 0.9,
										}}
									>
										{staleRules.map((rule) => (
											<Box
												key={rule.id}
												sx={{
													display: "inline-flex",
													alignItems: "center",
													height: 30,
													px: 1.4,
													borderRadius: "8px",
													fontSize: 12,
													fontWeight: 600,
													bgcolor: "#fdecec",
													color: "#c62828",
													border: "1px solid #f5c6c6",
												}}
												title="Значение удалено из схемы"
											>
												{rule.valueLabel ?? rule.valueCode}
											</Box>
										))}
									</Box>
								) : null}
								{param &&
								(param.values.length === 0 || isSchemaTextualParam(param)) ? (
									<Typography
										sx={{ fontSize: 11.5, color: "#6b7484", mb: 0.9 }}
									>
										{isSchemaTextualParam(param)
											? "Работа появляется, если поле заполнено (любое непустое значение)."
											: param.numeric
												? "Задайте порог в условии через операторы сравнения."
												: "Условие «поле заполнено» — значение не выбирается."}
									</Typography>
								) : null}
								<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
									{(param?.values ?? []).map((value) => {
										const selected =
											selectedCodes.has(value.code) ||
											paramRules.some((rule) =>
												catalogValueMatchesTriggerRule(value, {
													...ruleSeed,
													valueCode: rule.valueCode,
													valueLabel: rule.valueLabel,
												}),
											);
										return (
											<Box
												key={value.code}
												component="button"
												type="button"
												onClick={() => {
													if (!param) return;
													toggleValue(
														groupKey,
														param,
														value.code,
														value.label,
														selected,
													);
												}}
												sx={{
													display: "inline-flex",
													alignItems: "center",
													gap: 0.75,
													height: 30,
													px: 1.4,
													borderRadius: "8px",
													cursor: "pointer",
													fontFamily: "inherit",
													fontSize: 12,
													fontWeight: selected ? 700 : 500,
													bgcolor: selected ? "#fff7ed" : "#fff",
													color: selected ? "#9a5b13" : "#5b6577",
													border: `1px solid ${selected ? "#e8c9a0" : "#dfe2ea"}`,
												}}
											>
												<span>{selected ? "[v]" : "[ ]"}</span>
												{value.label}
											</Box>
										);
									})}
								</Box>
							</Box>
						);
					})}
					<Typography sx={{ fontSize: 11, color: "#8a93a3", px: 0.25 }}>
						Несколько параметров-триггеров объединяются по <b>И</b> — работа
						появляется, когда выполнены все.
					</Typography>
				</Box>
			) : null}
			<Box
				sx={{
					mt: grouped.length > 0 ? 0.5 : 0,
					border: "1px solid #e6e8ee",
					borderRadius: "11px",
					bgcolor: "#f8fafc",
					p: "12px 13px",
				}}
			>
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								gap: 1,
								mb: 1.1,
								flexWrap: "wrap",
							}}
						>
							<Typography sx={{ fontSize: 11.5, color: "#6b7484" }}>
								Все параметры-триггеры
							</Typography>
							<Select
								size="small"
								value={triggerArchCount.combinator}
								onChange={(event) =>
									onTriggerArchCountChange({
										...triggerArchCount,
										combinator: event.target
											.value as V2TypicalWorkTriggerArchCountCombinator,
									})
								}
								sx={{
									height: 30,
									minWidth: 72,
									bgcolor: "#fff",
									"& .MuiSelect-select": {
										py: 0.4,
										fontSize: 12,
										fontWeight: 700,
									},
								}}
							>
								<MenuItem value="and">И</MenuItem>
								<MenuItem value="or">ИЛИ</MenuItem>
							</Select>
							<Typography sx={{ fontSize: 11.5, color: "#6b7484" }}>
								условие по количеству компонентов
							</Typography>
						</Box>
						{triggerArchCount.kind ? (
							<Box
								sx={{
									display: "flex",
									flexWrap: "wrap",
									gap: 0.75,
									mb: 1,
								}}
							>
								<Box
									component="button"
									type="button"
									onClick={() => setArchCountEditOpen(true)}
									title={`кол-во: ${formatWorkArchCountKindLabel(triggerArchCount.kind)}`}
									sx={{
										display: "inline-flex",
										alignItems: "center",
										gap: 0.75,
										height: 30,
										px: 1.4,
										borderRadius: "8px",
										cursor: "pointer",
										fontFamily: "inherit",
										fontSize: 12,
										fontWeight: 600,
										bgcolor: archCountInvalid ? "#fdecec" : "#eff6ff",
										color: archCountInvalid ? "#c62828" : "#1d4ed8",
										border: `1px solid ${archCountInvalid ? "#f5c6c6" : "#bfdbfe"}`,
									}}
								>
									<span>
										{formatWorkArchCountKindLabel(triggerArchCount.kind)}
									</span>
									<span style={{ opacity: 0.75 }}>
										{formatArchCountCoeffChipSubtitle(triggerArchCount.steps)}
									</span>
								</Box>
								<IconButton
									size="small"
									aria-label="Удалить условие по количеству компонентов"
									onClick={() =>
										onTriggerArchCountChange(defaultTriggerArchCount())
									}
									sx={{ color: "#c2554c" }}
								>
									<DeleteOutlineIcon fontSize="small" />
								</IconButton>
							</Box>
						) : null}
						<Box>
							<Typography
								sx={{
									fontSize: 11,
									color: "#64748b",
									fontWeight: 600,
									mb: 0.5,
								}}
							>
								По количеству компонентов
							</Typography>
							<FuzzyAutocomplete<ArchCountOption>
								key={`arch-count-global-${archCountPickerKey}`}
								data-test-id={TID.workTriggerArchCountSelect}
								options={V2_WORK_FORMULA_ARCH_COUNT_KINDS.filter(
									(kind) => kind !== triggerArchCount.kind,
								).map((kind) => ({
									kind,
									label: formatWorkArchCountKindLabel(kind),
								}))}
								value={null}
								onChange={(option) => {
									if (!option) return;
									onTriggerArchCountChange({
										...triggerArchCount,
										kind: option.kind,
										steps: [{ count: 1, coefficient: 1 }],
									});
									setArchCountEditOpen(true);
									setArchCountPickerKey((key) => key + 1);
								}}
								getOptionLabel={(option) => option.label}
								getOptionValue={(option) => option.kind}
								getOptionSecondaryText={() =>
									"условие появления зависит от числа компонентов в анкете"
								}
								placeholder="Выберите компонент…"
								emptyLabel="Выберите компонент…"
								searchPlaceholder="Поиск компонента…"
								noMatchesText="Компоненты не найдены"
								allowEmpty
								size="small"
								disabled={triggerArchCount.kind != null}
								textFieldSx={TRIGGER_ARCH_COUNT_FIELD_SX}
								statusAlert={
									triggerArchCount.kind != null
										? {
												severity: "info",
												message:
													"Компонент уже выбран — удалите или отредактируйте текущее условие",
											}
										: null
								}
							/>
						</Box>
					</Box>
			</>
			) : null}
			{triggerMode === "simple" && triggerArchCount.kind ? (
				<ArchCountCoeffStepsEditor
					open={archCountEditOpen}
					kind={triggerArchCount.kind}
					steps={triggerArchCount.steps}
					onClose={() => setArchCountEditOpen(false)}
					onSave={(steps) => {
						onTriggerArchCountChange({ ...triggerArchCount, steps });
						setArchCountEditOpen(false);
					}}
				/>
			) : null}
		</Box>
	);
}

function paramRulesOperator(
	rules: V2TypicalWorkRuleDto[],
	groupKey: string,
	paramOptions: V2TypicalWorkParameterDto[],
): V2WorkRuleOperator {
	return (
		filterRulesByGroupKey(rules, groupKey, paramOptions)[0]?.operator ?? "="
	);
}
