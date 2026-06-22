import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type {
	V2TypicalWorkFormulaDto,
	V2TypicalWorkLaborParamGroupDto,
	V2TypicalWorkRoundingDto,
	V2WorkFormulaToken,
} from "@smart-anketa/api-contract";
import {
	parseWorkFormulaText,
	tokensToText,
	validateWorkFormulaTokens,
} from "@smart-anketa/api-contract";
import { useMemo, useState } from "react";

type WorkFormulaEditorProps = {
	formula: V2TypicalWorkFormulaDto;
	rounding: V2TypicalWorkRoundingDto;
	laborParams: V2TypicalWorkLaborParamGroupDto[];
	onFormulaChange: (formula: V2TypicalWorkFormulaDto) => void;
	onRoundingChange: (rounding: V2TypicalWorkRoundingDto) => void;
	readOnly?: boolean;
};

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

	const formulaError = useMemo(
		() => validateWorkFormulaTokens(formula.tokens),
		[formula.tokens],
	);

	const appendToken = (token: V2WorkFormulaToken) => {
		const nextTokens = [...formula.tokens, token];
		onFormulaChange({ tokens: nextTokens, text: tokensToText(nextTokens) });
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

	return (
		<Box>
			<Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
				<Chip
					label="Визуально"
					color={mode === "visual" ? "primary" : "default"}
					onClick={() => setMode("visual")}
					clickable
				/>
				<Chip
					label="Вручную"
					color={mode === "manual" ? "primary" : "default"}
					onClick={() => {
						setManualText(formula.text);
						setMode("manual");
					}}
					clickable
				/>
			</Box>

			{mode === "visual" ? (
				<>
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1 }}>
						{formula.tokens.map((token, index) => {
							const isInvalidParam =
								token.kind === "param_coeff" &&
								(Boolean(token.invalid) || !laborParamCodes.has(token.paramCode));
							return (
							<Chip
								key={`${token.kind}-${index}`}
								size="small"
								color={isInvalidParam ? "error" : "default"}
								variant={isInvalidParam ? "outlined" : "filled"}
								label={
									token.kind === "param_coeff"
										? `P[${token.paramName ?? token.paramCode}]${token.invalid ? " ?" : ""}`
										: token.kind === "norm"
											? "N"
											: token.kind === "number"
												? String(token.value)
												: token.kind === "operator"
													? token.op
													: token.kind === "paren_open"
														? "("
														: ")"
								}
								title={
									isInvalidParam
										? "Параметр удалён из блока трудоёмкости — исправьте формулу"
										: undefined
								}
							/>
							);
						})}
					</Box>
					{formulaError ? (
						<Alert severity="error" sx={{ mb: 1 }}>
							{formulaError}
						</Alert>
					) : null}
					{!readOnly ? (
						<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
							<Button size="small" variant="outlined" onClick={() => appendToken({ kind: "norm" })}>
								Норма
							</Button>
							<FormControl size="small" sx={{ minWidth: 180 }}>
								<InputLabel id="formula-param-label">Коэф. параметра</InputLabel>
								<Select
									labelId="formula-param-label"
									label="Коэф. параметра"
									value=""
									disabled={paramOptions.length === 0}
									title={
										paramOptions.length === 0
											? "Сначала добавьте параметр в блок «Параметры трудоёмкости»"
											: undefined
									}
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
								</Select>
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
							<Button size="small" variant="outlined" onClick={() => appendToken({ kind: "paren_open" })}>
								(
							</Button>
							<Button size="small" variant="outlined" onClick={() => appendToken({ kind: "paren_close" })}>
								)
							</Button>
							<Button
								size="small"
								color="warning"
								onClick={() => onFormulaChange({ tokens: [{ kind: "norm" }], text: "N" })}
							>
								Очистить
							</Button>
						</Box>
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
						onChange={(e) => setManualText(e.target.value)}
						placeholder="N × P[Сложность реализации]"
					/>
					{parseError ? (
						<Alert severity="error" sx={{ mt: 1 }}>
							{parseError}
						</Alert>
					) : null}
					{!readOnly ? (
						<Button size="small" sx={{ mt: 1 }} variant="contained" onClick={switchToVisual}>
							Применить
						</Button>
					) : null}
				</>
			)}

			<Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
				<FormControl size="small" sx={{ minWidth: 180 }}>
					<InputLabel id="rounding-mode-label">Округление</InputLabel>
					<Select
						labelId="rounding-mode-label"
						label="Округление"
						value={rounding.mode}
						disabled={readOnly}
						onChange={(e) =>
							onRoundingChange({
								...rounding,
								mode: e.target.value as V2TypicalWorkRoundingDto["mode"],
							})
						}
					>
						<MenuItem value="CEIL">вверх</MenuItem>
						<MenuItem value="FLOOR">вниз</MenuItem>
						<MenuItem value="ROUND">математическое</MenuItem>
						<MenuItem value="NONE">без округления</MenuItem>
					</Select>
				</FormControl>
				<TextField
					size="small"
					label="Шаг округления"
					type="number"
					disabled={readOnly || rounding.mode === "NONE"}
					value={rounding.step ?? 0.1}
					onChange={(e) =>
						onRoundingChange({
							...rounding,
							step: Number(e.target.value.replace(",", ".")),
						})
					}
				/>
			</Box>

			<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
				{formula.text}
			</Typography>
		</Box>
	);
}
