import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { SelectWithPlaceholder } from "@react-client/common/muiCustom/SelectWithPlaceholder";
import type {
	V2TypicalWorkFormulaDto,
	V2TypicalWorkLaborParamGroupDto,
	V2TypicalWorkRoundingDto,
	V2WorkFormulaToken,
} from "@smart-anketa/api-contract";
import {
	formatWorkFormulaGeneralSummary,
	parseWorkFormulaText,
	tokensToText,
	validateWorkFormulaTokens,
} from "@smart-anketa/api-contract";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { V2_TEMPLATE_EDIT_TEST_IDS as TID } from "@react-client/features/v2/admin_constructor/testIds";
import { useMemo, useState } from "react";

type WorkFormulaEditorProps = {
	formula: V2TypicalWorkFormulaDto;
	rounding: V2TypicalWorkRoundingDto;
	laborParams: V2TypicalWorkLaborParamGroupDto[];
	onFormulaChange: (formula: V2TypicalWorkFormulaDto) => void;
	onRoundingChange: (rounding: V2TypicalWorkRoundingDto) => void;
	readOnly?: boolean;
};

const ROUNDING_OPTIONS: {
	mode: V2TypicalWorkRoundingDto["mode"];
	label: string;
}[] = [
	{ mode: "CEIL", label: "вверх" },
	{ mode: "FLOOR", label: "вниз" },
	{ mode: "ROUND", label: "мат." },
	{ mode: "NONE", label: "без" },
];

function paramIndex(
	paramCode: string,
	laborParams: V2TypicalWorkLaborParamGroupDto[],
): number | null {
	const idx = laborParams.findIndex((g) => g.paramCode === paramCode);
	return idx >= 0 ? idx + 1 : null;
}

function formulaTokenLabel(
	token: V2WorkFormulaToken,
	laborParams: V2TypicalWorkLaborParamGroupDto[],
): string {
	if (token.kind === "param_coeff") {
		const idx = paramIndex(token.paramCode, laborParams);
		const base = idx != null ? `Кэф-П${idx}` : `Кэф[${token.paramName ?? token.paramCode}]`;
		return token.invalid ? `${base} ?` : base;
	}
	if (token.kind === "norm") return "H";
	if (token.kind === "number") return String(token.value);
	if (token.kind === "operator") {
		if (token.op === "*") return "×";
		if (token.op === "/") return "÷";
		return token.op;
	}
	if (token.kind === "paren_open") return "(";
	return ")";
}

function formulaTokenHint(
	token: V2WorkFormulaToken,
	laborParams: V2TypicalWorkLaborParamGroupDto[],
): string | undefined {
	if (token.kind !== "param_coeff") return undefined;
	const group = laborParams.find((g) => g.paramCode === token.paramCode);
	return group?.paramName ?? token.paramName ?? token.paramCode;
}

export function WorkFormulaEditor({
	formula,
	rounding,
	laborParams,
	onFormulaChange,
	onRoundingChange,
	readOnly = false,
}: WorkFormulaEditorProps) {
	const [mode, setMode] = useState<"visual" | "manual">("visual");
	const [manualText, setManualText] = useState(formula.text);
	const [parseError, setParseError] = useState<string | null>(null);
	const [numberInput, setNumberInput] = useState("");

	const paramOptions = useMemo(
		() =>
			laborParams.map((group) => ({
				code: group.paramCode,
				name: group.paramName ?? group.paramCode,
			})),
		[laborParams],
	);

	const laborParamCodes = useMemo(
		() => new Set(laborParams.map((group) => group.paramCode)),
		[laborParams],
	);

	const paramOrder = useMemo(
		() => laborParams.map((group) => group.paramCode),
		[laborParams],
	);

	const formulaError = useMemo(
		() => validateWorkFormulaTokens(formula.tokens),
		[formula.tokens],
	);

	const generalSummary = useMemo(
		() => formatWorkFormulaGeneralSummary(formula.tokens, paramOrder),
		[formula.tokens, paramOrder],
	);

	const appendToken = (token: V2WorkFormulaToken) => {
		const nextTokens = [...formula.tokens, token];
		onFormulaChange({ tokens: nextTokens, text: tokensToText(nextTokens) });
	};

	const commitTokens = (tokens: V2WorkFormulaToken[]) => {
		onFormulaChange({ tokens, text: tokensToText(tokens) });
	};

	const removeToken = (index: number) => {
		commitTokens(formula.tokens.filter((_, idx) => idx !== index));
	};

	const moveToken = (index: number, direction: -1 | 1) => {
		const nextIndex = index + direction;
		if (nextIndex < 0 || nextIndex >= formula.tokens.length) return;
		const nextTokens = [...formula.tokens];
		const current = nextTokens[index];
		const target = nextTokens[nextIndex];
		if (!current || !target) return;
		nextTokens[index] = target;
		nextTokens[nextIndex] = current;
		commitTokens(nextTokens);
	};

	const switchToVisual = () => {
		const parsed = parseWorkFormulaText(manualText);
		if (parsed.error) {
			setParseError(parsed.error);
			return;
		}
		setParseError(null);
		onFormulaChange({
			tokens: parsed.tokens,
			text: tokensToText(parsed.tokens),
		});
		setMode("visual");
	};

	const resetFormula = () => {
		onFormulaChange({ tokens: [{ kind: "norm" }], text: "H" });
	};

	return (
		<Flex flexDirection="column" gap={12} data-test-id={TID.workFormulaEditor}>
			<Flex gap={8} wrap="wrap">
				<Chip
					label="Визуально"
					data-test-id={TID.workFormulaVisualMode}
					color={mode === "visual" ? "primary" : "default"}
					onClick={() => setMode("visual")}
					clickable={!readOnly}
					variant={mode === "visual" ? "filled" : "outlined"}
				/>
				<Chip
					label="Вручную"
					data-test-id={TID.workFormulaManualMode}
					color={mode === "manual" ? "primary" : "default"}
					onClick={() => {
						setManualText(formula.text);
						setMode("manual");
					}}
					clickable={!readOnly}
					variant={mode === "manual" ? "filled" : "outlined"}
				/>
			</Flex>

			{mode === "visual" ? (
				<>
					<Card
						padding="12px"
						sx={{
							bgcolor: "#fafbfd",
							border: "1px solid #e6e8ee",
							borderRadius: "10px",
						}}
					>
						<Flex wrap="wrap" gap={8} alignItems="center" minHeight="40px">
							{formula.tokens.length === 0 ? (
								<Typography variant="body2" color="text.secondary">
									Добавьте элементы формулы
								</Typography>
							) : (
								formula.tokens.map((token, index) => {
									const isInvalidParam =
										token.kind === "param_coeff" &&
										(Boolean(token.invalid) ||
											!laborParamCodes.has(token.paramCode));
									const hint = formulaTokenHint(token, laborParams);
									return (
										<Flex
											key={`${token.kind}-${index}`}
											alignItems="center"
											gap={4}
											sx={{
												border: "1px solid #dfe3ea",
												borderRadius: "8px",
												bgcolor: "#fff",
												px: 1,
												py: 0.5,
											}}
										>
											<Chip
												size="small"
												color={isInvalidParam ? "error" : "default"}
												variant={isInvalidParam ? "outlined" : "filled"}
												label={formulaTokenLabel(token, laborParams)}
												title={
													isInvalidParam
														? "Параметр удалён из блока трудоёмкости — исправьте формулу"
														: hint
												}
												sx={{ fontWeight: 700, fontFamily: "monospace" }}
											/>
											{!readOnly ? (
												<Flex gap={2}>
													<Button
														size="small"
														disabled={index === 0}
														title="Сдвинуть влево"
														onClick={() => moveToken(index, -1)}
														sx={{ minWidth: 24, px: 0.3, fontSize: 11 }}
													>
														←
													</Button>
													<Button
														size="small"
														disabled={index === formula.tokens.length - 1}
														title="Сдвинуть вправо"
														onClick={() => moveToken(index, 1)}
														sx={{ minWidth: 24, px: 0.3, fontSize: 11 }}
													>
														→
													</Button>
													<Button
														size="small"
														color="error"
														title="Удалить"
														onClick={() => removeToken(index)}
														sx={{ minWidth: 24, px: 0.3, fontSize: 11 }}
													>
														×
													</Button>
												</Flex>
											) : null}
										</Flex>
									);
								})
							)}
						</Flex>
					</Card>

					{formulaError ? (
						<Alert severity="error">{formulaError}</Alert>
					) : null}

					{!readOnly ? (
						<Flex wrap="wrap" gap={8} alignItems="center">
							<Button
								size="small"
								variant="outlined"
								data-test-id={TID.workFormulaAddNorm}
								onClick={() => appendToken({ kind: "norm" })}
							>
								Норма H
							</Button>
							<FormControl size="small" sx={{ minWidth: 180 }}>
								<SelectWithPlaceholder
									placeholder="Коэф. параметров"
									value=""
									data-test-id={TID.workFormulaParamSelect}
									disabled={paramOptions.length === 0}
									title={
										paramOptions.length === 0
											? "Сначала добавьте параметр в блок «Параметры трудоёмкости»"
											: undefined
									}
									disableTypeahead
									onChange={(e) => {
										const code = String(e.target.value);
										const param = paramOptions.find((p) => p.code === code);
										appendToken({
											kind: "param_coeff",
											paramCode: code,
											paramName: param?.name,
										});
									}}
								>
									{paramOptions.map((param) => (
										<MenuItem key={param.code} value={param.code}>
											{param.name}
										</MenuItem>
									))}
								</SelectWithPlaceholder>
							</FormControl>
							{(["+", "-", "*", "/"] as const).map((op) => (
								<Button
									key={op}
									size="small"
									variant="outlined"
									onClick={() => appendToken({ kind: "operator", op })}
								>
									{op}
								</Button>
							))}
							<Button
								size="small"
								variant="outlined"
								onClick={() => appendToken({ kind: "paren_open" })}
							>
								(
							</Button>
							<Button
								size="small"
								variant="outlined"
								onClick={() => appendToken({ kind: "paren_close" })}
							>
								)
							</Button>
							<Flex alignItems="center" gap={4}>
								<TextField
									size="small"
									type="number"
									placeholder="0"
									value={numberInput}
									onChange={(e) => setNumberInput(e.target.value)}
									inputProps={{
										step: "any",
										style: { width: 64, padding: "4px 8px" },
									}}
									sx={{ "& .MuiInputBase-root": { height: 30 } }}
								/>
								<Button
									size="small"
									variant="outlined"
									disabled={numberInput === "" || Number.isNaN(Number(numberInput))}
									onClick={() => {
										appendToken({ kind: "number", value: Number(numberInput) });
										setNumberInput("");
									}}
								>
									число
								</Button>
							</Flex>
							<Button
								size="small"
								color="warning"
								data-test-id={TID.workFormulaClear}
								onClick={resetFormula}
							>
								очистить
							</Button>
						</Flex>
					) : null}
				</>
			) : (
				<>
					<TextField
						size="small"
						fullWidth
						multiline
						minRows={2}
						value={manualText}
						disabled={readOnly}
						data-test-id={TID.workFormulaManualInput}
						onChange={(e) => setManualText(e.target.value)}
						placeholder="H × P[Сложность реализации]"
					/>
					{parseError ? <Alert severity="error">{parseError}</Alert> : null}
					{!readOnly ? (
						<Button
							size="small"
							variant="contained"
							data-test-id={TID.workFormulaApplyManual}
							onClick={switchToVisual}
						>
							Применить
						</Button>
					) : null}
				</>
			)}

			<Flex alignItems="center" gap={12} wrap="wrap">
				<Typography variant="body2" fontWeight={600} color="text.secondary">
					Округлять до
				</Typography>
				<Flex gap={6} wrap="wrap">
					{ROUNDING_OPTIONS.map((option) => (
						<Chip
							key={option.mode}
							label={option.label}
							size="small"
							color={rounding.mode === option.mode ? "primary" : "default"}
							variant={rounding.mode === option.mode ? "filled" : "outlined"}
							onClick={
								readOnly
									? undefined
									: () => onRoundingChange({ ...rounding, mode: option.mode })
							}
							clickable={!readOnly}
						/>
					))}
				</Flex>
				{rounding.mode !== "NONE" ? (
					<TextField
						size="small"
						label="шаг"
						type="number"
						disabled={readOnly}
						value={rounding.step ?? 0.1}
						onChange={(e) =>
							onRoundingChange({
								...rounding,
								step: Number(e.target.value.replace(",", ".")),
							})
						}
						inputProps={{ step: "any", min: 0.0001, max: 1000 }}
						sx={{ width: 88 }}
					/>
				) : null}
			</Flex>

			<Card
				padding="10px 14px"
				sx={{
					bgcolor: "#1e293b",
					color: "#f8fafc",
					borderRadius: "10px",
					border: "none",
				}}
			>
				<Flex
					justifyContent="space-between"
					alignItems="center"
					gap={12}
					wrap="wrap"
				>
					<Flex flexDirection="column" gap={4} minWidth="0">
						<Typography variant="caption" sx={{ color: "#94a3b8" }}>
							Общая формула норматива
						</Typography>
						<Typography
							variant="body1"
							fontWeight={700}
							data-test-id={TID.workFormulaGeneralSummary}
							sx={{ fontFamily: "ui-monospace, monospace" }}
						>
							{generalSummary || "H"}
						</Typography>
					</Flex>
					<Typography variant="caption" sx={{ color: "#94a3b8", whiteSpace: "nowrap" }}>
						единица: чел.-дн
					</Typography>
				</Flex>
			</Card>
		</Flex>
	);
}
