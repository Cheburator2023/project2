import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import type {
	V2TriggerFormulaToken,
	V2TypicalWorkParameterDto,
	V2WorkRuleOperator,
} from "@smart-anketa/api-contract";
import { V2_WORK_RULE_OPERATOR_VALUES } from "@smart-anketa/api-contract";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { useEffect, useMemo, useState } from "react";
import {
	isSchemaTextualParam,
	schemaParamRuleName,
} from "./schemaWorkParameters";

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

type TriggerParamTokenDialogProps = {
	open: boolean;
	token: Extract<V2TriggerFormulaToken, { kind: "param" }> | null;
	param: V2TypicalWorkParameterDto | null;
	onClose: () => void;
	onSave: (token: Extract<V2TriggerFormulaToken, { kind: "param" }>) => void;
};

export function TriggerParamTokenDialog({
	open,
	token,
	param,
	onClose,
	onSave,
}: TriggerParamTokenDialogProps) {
	const [draft, setDraft] = useState(token);
	useEffect(() => {
		if (open) setDraft(token);
	}, [open, token]);

	const selectedCodes = useMemo(() => {
		if (!draft) return new Set<string>();
		if (draft.values?.length) return new Set(draft.values.map((v) => v.code));
		return draft.valueCode ? new Set([draft.valueCode]) : new Set<string>();
	}, [draft]);

	if (!draft || !param) return null;

	const operator = draft.operator ?? "=";
	const isAnyOf = operator === "in" || operator === "not_in";

	const toggleValue = (code: string, label: string) => {
		if (isAnyOf) {
			const current = draft.values?.length
				? draft.values
				: draft.valueCode
					? [{ code: draft.valueCode, label: draft.valueLabel }]
					: [];
			const exists = current.some((v) => v.code === code);
			const next = exists
				? current.filter((v) => v.code !== code)
				: [...current, { code, label }];
			setDraft({
				...draft,
				valueCode: null,
				valueLabel: null,
				values: next.map((v) => ({ code: v.code, label: v.label ?? null })),
			});
			return;
		}
		setDraft({
			...draft,
			valueCode: code,
			valueLabel: label,
			values: undefined,
		});
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>
				Условие: {param.name}
			</DialogTitle>
			<DialogContent>
				<Flex alignItems="center" gap={8} wrap="wrap">
					<Typography sx={{ fontSize: 12, color: "#64748b" }}>Оператор</Typography>
					<Select
						size="small"
						value={operator}
						onChange={(event) =>
							setDraft({
								...draft,
								operator: event.target.value as V2WorkRuleOperator,
							})
						}
						sx={{ minWidth: 76, height: 32 }}
					>
						{V2_WORK_RULE_OPERATOR_VALUES.filter((op) => {
							if (op === "in" || op === "not_in") return !param.numeric;
							if (op === "=" || op === "!=") return true;
							return param.numeric === true;
						}).map((op) => (
							<MenuItem key={op} value={op}>
								{OPERATOR_LABELS[op]}
							</MenuItem>
						))}
					</Select>
				</Flex>
				<Spacer space={12} />
				{isSchemaTextualParam(param) || param.values.length === 0 ? (
					<Typography sx={{ fontSize: 12, color: "#64748b" }}>
						{isSchemaTextualParam(param)
							? "Поле считается выполненным, если заполнено."
							: "Задайте порог через операторы сравнения."}
					</Typography>
				) : param.values.length > 16 ? (
					<FormControl fullWidth size="small">
						<Select
							displayEmpty
							value={
								draft.values?.length
									? (draft.values[0]?.code ?? "")
									: (draft.valueCode ?? "")
							}
							onChange={(event) => {
								const code = String(event.target.value);
								const found = param.values.find((v) => v.code === code);
								if (!found) {
									setDraft({
										...draft,
										valueCode: null,
										valueLabel: null,
										values: isAnyOf ? [] : undefined,
									});
									return;
								}
								if (isAnyOf) {
									setDraft({
										...draft,
										valueCode: null,
										valueLabel: null,
										values: [{ code: found.code, label: found.label }],
									});
									return;
								}
								setDraft({
									...draft,
									valueCode: found.code,
									valueLabel: found.label,
									values: undefined,
								});
							}}
							MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
						>
							<MenuItem value="">
								<em>Не выбрано</em>
							</MenuItem>
							{param.values.map((value) => (
								<MenuItem key={value.code} value={value.code} dense>
									{value.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				) : (
					<Flex wrap="wrap" gap={8}>
						{param.values.map((value) => {
							const selected = selectedCodes.has(value.code);
							return (
								<Button
									key={value.code}
									size="small"
									variant={selected ? "contained" : "outlined"}
									onClick={() => toggleValue(value.code, value.label)}
									sx={{ textTransform: "none", fontSize: 12 }}
								>
									{value.label}
								</Button>
							);
						})}
					</Flex>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Отмена</Button>
				<Button
					variant="contained"
					onClick={() =>
						onSave({
							...draft,
							paramName: schemaParamRuleName(param),
							schemaFieldUid: param.schemaFieldUid ?? null,
						})
					}
				>
					Сохранить
				</Button>
			</DialogActions>
		</Dialog>
	);
}
