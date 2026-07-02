import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type {
	V2TypicalWorkParameterDto,
	V2TypicalWorkRuleDto,
	V2WorkRuleOperator,
	V2WorkTriggerStatus,
} from "@smart-anketa/api-contract";
import {
	V2_WORK_RULE_OPERATOR_VALUES,
	catalogValueMatchesTriggerRule,
	isControlTypeTriggerParam,
	isSourceTypeTriggerParam,
} from "@smart-anketa/api-contract";
import { FuzzyAutocomplete } from "@react-client/common/muiCustom/FuzzyAutocomplete";
import { useMemo, useState } from "react";
import {
	isWorkTriggerGroupInvalid,
	methodologyCatalogFromParameters,
} from "./typicalWorkPatchErrors";
import {
	resolveSchemaParamForTriggerRule,
	schemaWorkParameterEmptyPickerMessage,
} from "./schemaWorkParameters";

type TypicalWorkTriggersSectionProps = {
	rules: V2TypicalWorkRuleDto[];
	triggerStatus: V2WorkTriggerStatus;
	archComponentType: string;
	schemaFieldCount?: number;
	paramOptions: V2TypicalWorkParameterDto[];
	methodologyCatalog?: V2TypicalWorkParameterDto[];
	streamExecutor: string;
	onChange: (rules: V2TypicalWorkRuleDto[]) => void;
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

function triggerBanner(status: V2WorkTriggerStatus, ruleCount: number) {
	switch (status) {
		case "appears":
			return {
				bg: "#e7f6ec",
				border: "#cfe9d8",
				iconBg: "#1f8a4d",
				icon: "✓",
				title: `Работа появляется в анкете (${ruleCount} ${ruleCount === 1 ? "условие" : "условия"})`,
				sub: "все условия выполнены",
				fg: "#1f8a4d",
			};
		case "invalid":
			return {
				bg: "#fdecec",
				border: "#f5c6c6",
				iconBg: "#c62828",
				icon: "!",
				title: "Условия заданы некорректно",
				sub: "проверьте параметры-триггеры",
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
	triggerStatus,
	archComponentType,
	schemaFieldCount = 0,
	paramOptions,
	methodologyCatalog = [],
	streamExecutor,
	onChange,
}: TypicalWorkTriggersSectionProps) {
	const [pickerKey, setPickerKey] = useState(0);
	const banner = triggerBanner(triggerStatus, rules.length);

	const usedParamCodes = useMemo(
		() => new Set(rules.map((r) => r.paramCode)),
		[rules],
	);

	const emptyPickerHint = schemaWorkParameterEmptyPickerMessage(
		archComponentType,
		schemaFieldCount,
		usedParamCodes.size,
	);

	const pickerItems = paramOptions.filter((p) => !usedParamCodes.has(p.code));

	const catalogForValidation = useMemo(
		() =>
			methodologyCatalogFromParameters(methodologyCatalog) ??
			methodologyCatalogFromParameters(paramOptions) ??
			[],
		[methodologyCatalog, paramOptions],
	);

	const grouped = useMemo(() => {
		const map = new Map<string, V2TypicalWorkRuleDto[]>();
		for (const rule of rules) {
			const list = map.get(rule.paramCode) ?? [];
			list.push(rule);
			map.set(rule.paramCode, list);
		}
		return [...map.entries()];
	}, [rules]);

	const toggleValue = (
		param: V2TypicalWorkParameterDto,
		valueCode: string,
		valueLabel: string,
		selected: boolean,
	) => {
		const operator = paramRulesOperator(rules, param.code);
		const isAnyOf = operator === "in" || operator === "not_in";

		if (isAnyOf) {
			const current = rules.find((r) => r.paramCode === param.code);
			const currentValues = current?.values?.length
				? current.values
				: current?.valueCode
					? [{ code: current.valueCode, label: current.valueLabel }]
					: [];
			const nextValues = selected
				? currentValues.filter((v) => v.code !== valueCode)
				: [...currentValues, { code: valueCode, label: valueLabel }];
			const withoutParam = rules.filter((r) => r.paramCode !== param.code);
			if (nextValues.length === 0) {
				onChange(withoutParam);
				return;
			}
			onChange([
				...withoutParam,
				{
					id: current?.id ?? `new-${Date.now()}`,
					streamExecutor,
					paramCode: param.code,
					paramName: param.name,
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
					(r) => !(r.paramCode === param.code && r.valueCode === valueCode),
				),
			);
			return;
		}
		const withoutParam = rules.filter((r) => r.paramCode !== param.code);
		const currentOperator =
			rules.find((r) => r.paramCode === param.code)?.operator ?? "=";
		onChange([
			...withoutParam,
			{
				id: `new-${Date.now()}-${valueCode}`,
				streamExecutor,
				paramCode: param.code,
				paramName: param.name,
				operator: currentOperator,
				valueCode,
				valueLabel,
			},
		]);
	};

	const removeParam = (paramCode: string) => {
		onChange(rules.filter((r) => r.paramCode !== paramCode));
	};

	const updateParamOperator = (
		paramCode: string,
		operator: V2WorkRuleOperator,
	) => {
		onChange(
			rules.map((rule) =>
				rule.paramCode === paramCode ? { ...rule, operator } : rule,
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
				paramCode: param.code,
				paramName: param.name,
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
				<Box sx={{ ml: "auto", minWidth: 280, maxWidth: 420, flex: "1 1 280px" }}>
					<FuzzyAutocomplete<V2TypicalWorkParameterDto>
						key={pickerKey}
						data-test-id="trig-picker-items"
						options={pickerItems}
						value={null}
						onChange={(param) => {
							if (!param) return;
							addParam(param);
						}}
						getOptionLabel={(param) => param.name}
						getOptionValue={(param) => param.code}
						getOptionSecondaryText={(param) => param.description ?? undefined}
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
			</Box>

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
				</Box>
			</Box>

			{grouped.length > 0 ? (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
					{grouped.map(([paramCode, paramRules]) => {
						const ruleSeed = {
							paramCode,
							paramName: paramRules[0]?.paramName ?? null,
						};
						const param = resolveSchemaParamForTriggerRule(
							ruleSeed,
							paramOptions,
						);
						const isKnownPseudoTrigger =
							isSourceTypeTriggerParam(ruleSeed.paramCode, ruleSeed.paramName) ||
							isControlTypeTriggerParam(ruleSeed.paramCode, ruleSeed.paramName);
						const groupInvalid = isWorkTriggerGroupInvalid(
							paramCode,
							paramRules,
							catalogForValidation,
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
								paramCode,
								[rule],
								catalogForValidation,
							);
						});
						const displayName =
							param?.name ??
							(isSourceTypeTriggerParam(ruleSeed.paramCode, ruleSeed.paramName)
								? "Тип источника данных"
								: (paramRules[0]?.paramName ?? paramCode));
						return (
							<Box
								key={paramCode}
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
										alignItems: "center",
										gap: 1,
										mb: 1.1,
									}}
								>
									<Typography
										sx={{
											flex: 1,
											fontSize: 12.5,
											fontWeight: 700,
											color: "#1d2435",
											lineHeight: 1.25,
										}}
									>
										{displayName}
									</Typography>
									<IconButton
										size="small"
										aria-label="Удалить триггер"
										onClick={() => removeParam(paramCode)}
										sx={{ color: "#c2554c" }}
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
												paramCode,
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
													toggleValue(param, value.code, value.label, selected);
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
		</Box>
	);
}

function paramRulesOperator(
	rules: V2TypicalWorkRuleDto[],
	paramCode: string,
): V2WorkRuleOperator {
	return rules.find((r) => r.paramCode === paramCode)?.operator ?? "=";
}
