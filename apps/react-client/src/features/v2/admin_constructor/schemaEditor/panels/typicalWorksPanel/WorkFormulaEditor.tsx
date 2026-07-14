import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import type {
	V2TypicalWorkFormulaDto,
	V2TypicalWorkLaborParamGroupDto,
	V2TypicalWorkRoundingDto,
	V2WorkFormulaToken,
} from "@smart-anketa/api-contract";
import {
	detectTransitiveCycle,
	formatWorkFormulaGeneralSummary,
	hasWorkRefToken,
	isTransitiveOnlyFormula,
	isWorkFormulaLaborParamKnown,
	normalizeWorkFormulaLaborParamTokens,
	parseWorkFormulaText,
	tokensToText,
	validateWorkFormulaTokens,
} from "@smart-anketa/api-contract";
import { Flex } from "@react-client/common/primitives/Flex";
import { FuzzyAutocomplete } from "@react-client/common/muiCustom/FuzzyAutocomplete";
import { SegmentBar } from "@react-client/common/muiCustom/SegmentBar";
import { V2_TEMPLATE_EDIT_TEST_IDS as TID } from "@react-client/features/v2/admin_constructor/testIds";
import { roundingModeLabel } from "./typicalWorksUi";
import { cursorAfterTokenDelete } from "./workFormulaCursor";
import {
	Fragment,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { TypicalWorkValueMatchingInfo } from "./typicalWorkValueMatchingHelp";

export type TransitiveSourceOption = {
	assignmentId: string;
	workId: string;
	workName: string;
	streamExecutor: string;
	archComponentType: string;
};

type WorkFormulaEditorProps = {
	formula: V2TypicalWorkFormulaDto;
	rounding: V2TypicalWorkRoundingDto;
	laborParams: V2TypicalWorkLaborParamGroupDto[];
	normValue: number | null;
	currentAssignmentId?: string | null;
	transitiveSources?: TransitiveSourceOption[];
	transitiveEdges?: ReadonlyMap<string, string | null | undefined>;
	onFormulaChange: (formula: V2TypicalWorkFormulaDto) => void;
	onRoundingChange: (rounding: V2TypicalWorkRoundingDto) => void;
	readOnly?: boolean;
	/** Читаемое имя параметра по коду (для подписи чипов формулы). */
	resolveParamName?: (paramCode: string, paramName?: string | null) => string;
};

type ParamOption = {
	code: string;
	name: string;
	/** Число отмеченных значений в множестве any-of (только для any-of пикера). */
	anyOfValueCount?: number;
};

function resolveLaborAnyOfValueCount(
	laborParams: V2TypicalWorkLaborParamGroupDto[],
	paramCode: string,
): number {
	const group = laborParams.find((g) => g.paramCode === paramCode);
	if (!group || group.kind !== "any_of") return 0;
	return group.anyOf?.valueCodes.length ?? 0;
}

const ROUNDING_OPTIONS: {
	mode: V2TypicalWorkRoundingDto["mode"];
	label: string;
}[] = [
	{ mode: "CEIL", label: "вверх" },
	{ mode: "FLOOR", label: "вниз" },
	{ mode: "ROUND", label: "матем." },
	{ mode: "NONE", label: "без" },
];

function formatNormValue(value: number | null): string {
	if (value == null || !Number.isFinite(value)) return "—";
	return String(value);
}

function isFormulaValueOperand(token: V2WorkFormulaToken): boolean {
	return (
		token.kind === "norm" ||
		token.kind === "number" ||
		token.kind === "param_coeff" ||
		token.kind === "param_anyof" ||
		token.kind === "work_ref"
	);
}

/** Левый операнд неявного умножения: значение или «)» после подвыражения. */
function isImplicitMultiplyLeftOperand(token: V2WorkFormulaToken): boolean {
	return isFormulaValueOperand(token) || token.kind === "paren_close";
}

function insertTokenAt(
	tokens: V2WorkFormulaToken[],
	index: number,
	token: V2WorkFormulaToken,
): V2WorkFormulaToken[] {
	const next = [...tokens];
	next.splice(index, 0, token);
	return next;
}

function tokenChipColors(token: V2WorkFormulaToken): {
	bg: string;
	color: string;
	border: string;
} {
	switch (token.kind) {
		case "norm":
			return { bg: "#1e293b", color: "#f8fafc", border: "#1e293b" };
		case "param_coeff":
			return { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" };
		case "param_anyof":
			return { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" };
		case "work_ref":
			return { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" };
		case "number":
			return { bg: "#f8fafc", color: "#334155", border: "#e2e8f0" };
		case "operator":
			return { bg: "#f8fafc", color: "#334155", border: "#e2e8f0" };
		default:
			return { bg: "#fff", color: "#334155", border: "#e2e8f0" };
	}
}

function formulaPickerFieldSx(colors: {
	bg: string;
	color: string;
	border: string;
}): SxProps<Theme> {
	return {
		"& .MuiOutlinedInput-root": {
			bgcolor: colors.bg,
			color: colors.color,
			borderColor: colors.border,
			outline: "none",
			"&:hover": {
				borderColor: colors.border,
			},
			"&.Mui-focused": {
				outline: "none",
				boxShadow: "none",
				borderColor: colors.color,
			},
		},
		"& .MuiInputBase-root.Mui-disabled": {
			opacity: 0.65,
		},
		"& .MuiSelect-select": {
			fontWeight: 600,
			fontSize: 13,
		},
	};
}

const FORMULA_INLINE_NUMBER_FIELD_SX: SxProps<Theme> = {
	"& .MuiOutlinedInput-root": {
		height: 28,
		border: "none",
		bgcolor: "transparent",
		outline: "none",
		"&.Mui-focused": {
			outline: "none",
			boxShadow: "none",
			border: "none",
		},
	},
	"& .MuiOutlinedInput-notchedOutline": {
		border: "none",
	},
};

const FORMULA_PICKER_FIELD_SX = {
	paramCoeff: formulaPickerFieldSx(
		tokenChipColors({ kind: "param_coeff", paramCode: "" }),
	),
	paramAnyOf: formulaPickerFieldSx(
		tokenChipColors({ kind: "param_anyof", paramCode: "" }),
	),
	workRef: formulaPickerFieldSx(
		tokenChipColors({
			kind: "work_ref",
			assignmentId: "",
		}),
	),
} as const;

/** Подпись чипа параметра: читаемое имя + код (id), если имя известно и отличается. */
function formatParamSubtitle(
	name: string | null | undefined,
	paramCode: string,
): string {
	const trimmed = name?.trim();
	return trimmed && trimmed !== paramCode
		? `${trimmed} · ${paramCode}`
		: paramCode;
}

function tokenDisplayLabel(
	token: V2WorkFormulaToken,
	normValue: number | null,
	resolveParamName?: (paramCode: string, paramName?: string | null) => string,
): { title: string; subtitle?: string } {
	switch (token.kind) {
		case "norm":
			return { title: "Норма N", subtitle: formatNormValue(normValue) };
		case "param_coeff":
			return {
				title: "коэф. параметра",
				subtitle: formatParamSubtitle(
					resolveParamName?.(token.paramCode, token.paramName) ??
						token.paramName,
					token.paramCode,
				),
			};
		case "param_anyof":
			return {
				title: "any-of",
				subtitle: formatParamSubtitle(
					resolveParamName?.(token.paramCode, token.paramName) ??
						token.paramName,
					token.paramCode,
				),
			};
		case "work_ref":
			return {
				title: "значение работы",
				subtitle: token.workName ?? token.assignmentId,
			};
		case "number":
			return { title: String(token.value) };
		case "operator":
			return { title: operatorSymbol(token.op) };
		case "paren_open":
			return { title: "(" };
		case "paren_close":
			return { title: ")" };
		default:
			return { title: "?" };
	}
}

const FORMULA_MODE_SEGMENTS = [
	{
		id: "visual" as const,
		label: "Визуально",
		"data-test-id": TID.workFormulaVisualMode,
	},
	{
		id: "manual" as const,
		label: "Вручную",
		"data-test-id": TID.workFormulaManualMode,
	},
];

const FORMULA_OPERATOR_OPTIONS = [
	{ op: "*" as const, label: "×" },
	{ op: "/" as const, label: "÷" },
	{ op: "+" as const, label: "+" },
	{ op: "-" as const, label: "−" },
] as const;

function operatorSymbol(op: "+" | "-" | "*" | "/"): string {
	return FORMULA_OPERATOR_OPTIONS.find((option) => option.op === op)?.label ?? op;
}

function FormulaRibbonCursor() {
	return (
		<Box
			data-test-id={TID.workFormulaCursor}
			sx={{
				width: 2,
				height: 36,
				bgcolor: "#000",
				borderRadius: 1,
				flexShrink: 0,
				animation: "formulaCaretBlink 1s step-end infinite",
				"@keyframes formulaCaretBlink": {
					"50%": { opacity: 0 },
				},
			}}
		/>
	);
}

function FormulaRibbonGap({
	active,
	showCursor,
	readOnly,
	onClick,
}: {
	active: boolean;
	showCursor: boolean;
	readOnly: boolean;
	onClick: () => void;
}) {
	return (
		<Box
			component="span"
			role={readOnly ? undefined : "button"}
			aria-label={active ? "Позиция вставки" : undefined}
			onClick={
				readOnly
					? undefined
					: (event: React.MouseEvent<HTMLSpanElement>) => {
							event.stopPropagation();
							onClick();
						}
			}
			sx={{
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				minWidth: 8,
				height: 36,
				flexShrink: 0,
				border: "none",
				p: 0,
				m: 0,
				bgcolor: "transparent",
				cursor: readOnly ? "default" : "text",
				fontFamily: "inherit",
				outline: "none",
			}}
		>
			{showCursor ? <FormulaRibbonCursor /> : null}
		</Box>
	);
}

export function WorkFormulaEditor({
	formula,
	rounding,
	laborParams,
	normValue,
	currentAssignmentId,
	transitiveSources = [],
	transitiveEdges,
	onFormulaChange,
	onRoundingChange,
	readOnly = false,
	resolveParamName,
}: WorkFormulaEditorProps) {
	const [mode, setMode] = useState<"visual" | "manual">("visual");
	const [manualText, setManualText] = useState(formula.text);
	const [parseError, setParseError] = useState<string | null>(null);
	const [cursorIndex, setCursorIndex] = useState(formula.tokens.length);
	const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
	const [editingNumberIndex, setEditingNumberIndex] = useState<number | null>(
		null,
	);
	const [editingOperatorIndex, setEditingOperatorIndex] = useState<number | null>(
		null,
	);
	const [numberDraft, setNumberDraft] = useState("");
	const [paramPickerKey, setParamPickerKey] = useState(0);
	const [anyOfPickerKey, setAnyOfPickerKey] = useState(0);
	const [workPickerKey, setWorkPickerKey] = useState(0);
	const [isRibbonFocused, setIsRibbonFocused] = useState(false);
	const ribbonRef = useRef<HTMLDivElement>(null);

	const showRibbonCursor = !readOnly && isRibbonFocused;

	const handleRibbonBlur = (event: React.FocusEvent<HTMLDivElement>) => {
		const next = event.relatedTarget;
		if (next instanceof Node && event.currentTarget.contains(next)) return;
		setIsRibbonFocused(false);
		setEditingOperatorIndex(null);
	};

	const focusRibbon = useCallback(() => {
		ribbonRef.current?.focus();
	}, []);

	const setCursor = useCallback(
		(index: number) => {
			setEditingNumberIndex(null);
			setEditingOperatorIndex(null);
			setCursorIndex(Math.max(0, Math.min(index, formula.tokens.length)));
			focusRibbon();
		},
		[focusRibbon, formula.tokens.length],
	);

	const isTransitive = isTransitiveOnlyFormula(formula.tokens);
	const arithmeticLocked = isTransitive || hasWorkRefToken(formula.tokens);

	const paramByValueOptions = useMemo(
		(): ParamOption[] =>
			laborParams
				.filter((g) => (g.kind ?? "by_value") === "by_value")
				.map((g) => ({
					code: g.paramCode,
					name: g.paramName ?? g.paramCode,
				})),
		[laborParams],
	);

	const paramAnyOfOptions = useMemo(
		(): ParamOption[] =>
			laborParams
				.filter((g) => g.kind === "any_of")
				.map((g) => ({
					code: g.paramCode,
					name: g.paramName ?? g.paramCode,
					anyOfValueCount: g.anyOf?.valueCodes.length ?? 0,
				})),
		[laborParams],
	);

	const anyOfLaborParamCount = useMemo(
		() => laborParams.filter((g) => g.kind === "any_of").length,
		[laborParams],
	);

	const availableWorkSources = useMemo(() => {
		return transitiveSources.filter((source) => {
			if (currentAssignmentId && source.assignmentId === currentAssignmentId) {
				return false;
			}
			if (currentAssignmentId && transitiveEdges) {
				const cycle = detectTransitiveCycle(
					currentAssignmentId,
					source.assignmentId,
					transitiveEdges,
				);
				if (cycle) return false;
			}
			return true;
		});
	}, [currentAssignmentId, transitiveEdges, transitiveSources]);

	const selectedWorkRef = useMemo((): TransitiveSourceOption | null => {
		if (!isTransitiveOnlyFormula(formula.tokens)) return null;
		const ref = formula.tokens[0];
		if (ref?.kind !== "work_ref") return null;
		return (
			availableWorkSources.find((s) => s.assignmentId === ref.assignmentId) ?? {
				assignmentId: ref.assignmentId,
				workId: ref.assignmentId,
				workName: ref.workName ?? ref.assignmentId,
				streamExecutor: "",
				archComponentType: "",
			}
		);
	}, [availableWorkSources, formula.tokens]);

	const laborParamRefs = useMemo(
		() =>
			laborParams.map((group) => ({
				paramCode: group.paramCode,
				paramName: group.paramName,
			})),
		[laborParams],
	);

	const isLaborFormulaParam = useCallback(
		(token: V2WorkFormulaToken) => {
			if (token.kind !== "param_coeff" && token.kind !== "param_anyof") {
				return false;
			}
			return isWorkFormulaLaborParamKnown(token, laborParamRefs);
		},
		[laborParamRefs],
	);

	const paramOrder = useMemo(
		() => laborParams.map((g) => g.paramCode),
		[laborParams],
	);

	const formulaError = useMemo(
		() =>
			validateWorkFormulaTokens(formula.tokens, {
				laborParams: laborParamRefs,
				allowInvalidParamRefs: true,
			}),
		[formula.tokens, laborParamRefs],
	);

	const generalSummary = useMemo(
		() => formatWorkFormulaGeneralSummary(formula.tokens, paramOrder),
		[formula.tokens, paramOrder],
	);

	useEffect(() => {
		setCursorIndex((prev) => Math.min(prev, formula.tokens.length));
	}, [formula.tokens.length]);

	const commitTokens = useCallback(
		(tokens: V2WorkFormulaToken[], cursor?: number) => {
			onFormulaChange({ tokens, text: tokensToText(tokens) });
			if (cursor != null) {
				setCursorIndex(Math.max(0, Math.min(cursor, tokens.length)));
			}
		},
		[onFormulaChange],
	);

	const insertToken = (token: V2WorkFormulaToken) => {
		if (readOnly) return;
		let index = cursorIndex;
		let tokens = formula.tokens;
		if (isFormulaValueOperand(token)) {
			const prev = tokens[index - 1];
			if (prev && isImplicitMultiplyLeftOperand(prev)) {
				tokens = insertTokenAt(tokens, index, { kind: "operator", op: "*" });
				index += 1;
			}
		}
		const next = insertTokenAt(tokens, index, token);
		commitTokens(next, index + 1);
	};

	const removeTokenAt = (deletedIndex: number) => {
		const nextCursor = cursorAfterTokenDelete(deletedIndex, cursorIndex);
		commitTokens(
			formula.tokens.filter((_, idx) => idx !== deletedIndex),
			nextCursor,
		);
		if (editingNumberIndex === deletedIndex) {
			setEditingNumberIndex(null);
		} else if (
			editingNumberIndex != null &&
			editingNumberIndex > deletedIndex
		) {
			setEditingNumberIndex(editingNumberIndex - 1);
		}
		if (editingOperatorIndex === deletedIndex) {
			setEditingOperatorIndex(null);
		} else if (
			editingOperatorIndex != null &&
			editingOperatorIndex > deletedIndex
		) {
			setEditingOperatorIndex(editingOperatorIndex - 1);
		}
	};

	const updateTokenAt = (index: number, token: V2WorkFormulaToken) => {
		const next = [...formula.tokens];
		next[index] = token;
		commitTokens(next);
	};

	const switchToVisual = () => {
		const parsed = parseWorkFormulaText(manualText);
		if (parsed.error) {
			setParseError(parsed.error);
			return;
		}
		const normalized = normalizeWorkFormulaLaborParamTokens(
			parsed.tokens,
			laborParamRefs,
		);
		const validation = validateWorkFormulaTokens(normalized, {
			laborParams: laborParamRefs,
			allowInvalidParamRefs: true,
		});
		if (validation) {
			setParseError(validation);
			return;
		}
		setParseError(null);
		onFormulaChange({
			tokens: normalized,
			text: tokensToText(normalized),
		});
		setCursorIndex(normalized.length);
		setMode("visual");
	};

	const handleClear = () => {
		onFormulaChange({ tokens: [], text: "" });
		setCursorIndex(0);
		setClearConfirmOpen(false);
	};

	const handleRibbonKeyDown = (event: React.KeyboardEvent) => {
		if (readOnly) return;
		if (event.key === "Escape") {
			setEditingNumberIndex(null);
			setEditingOperatorIndex(null);
			return;
		}
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			setCursorIndex((prev) => Math.max(0, prev - 1));
		}
		if (event.key === "ArrowRight") {
			event.preventDefault();
			setCursorIndex((prev) => Math.min(formula.tokens.length, prev + 1));
		}
		if (event.key === "Backspace" && cursorIndex > 0) {
			event.preventDefault();
			removeTokenAt(cursorIndex - 1);
		}
		if (event.key === "Delete" && cursorIndex < formula.tokens.length) {
			event.preventDefault();
			removeTokenAt(cursorIndex);
		}
	};

	const roundingStepLabel =
		rounding.mode === "NONE"
			? "—"
			: String(rounding.step ?? 0.1).replace(".", ",");

	const handleWorkRefSelect = (source: TransitiveSourceOption | null) => {
		if (!source || readOnly) return;
		const token: V2WorkFormulaToken = {
			kind: "work_ref",
			assignmentId: source.assignmentId,
			workName: source.workName,
		};
		if (isTransitiveOnlyFormula(formula.tokens)) {
			commitTokens([token], 1);
			return;
		}
		insertToken(token);
		setWorkPickerKey((key) => key + 1);
	};

	return (
		<Flex flexDirection="column" gap={14} data-test-id={TID.workFormulaEditor}>
			{/* Zone 1 — header */}
			<Flex
				alignItems="center"
				justifyContent="space-between"
				gap={12}
				wrap="wrap"
			>
				<Flex alignItems="center" gap={10} minWidth="0">
					<CalculateOutlinedIcon sx={{ color: "#64748b", fontSize: 22 }} />
					<Typography sx={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
						Калькулятор формулы
					</Typography>
					<Box
						data-test-id={TID.workFormulaModeBadge}
						sx={{
							px: 1.2,
							py: 0.35,
							borderRadius: "999px",
							bgcolor: isTransitive ? "#ede9fe" : "#e0f2fe",
							color: isTransitive ? "#6d28d9" : "#0369a1",
							fontSize: 12,
							fontWeight: 600,
							lineHeight: 1.4,
							whiteSpace: "nowrap",
						}}
					>
						{isTransitive ? "транзитивная" : "фиксированная"}
					</Box>
				</Flex>
				<SegmentBar
					segments={FORMULA_MODE_SEGMENTS}
					value={mode}
					readOnly={readOnly}
					onChange={(nextMode) => {
						if (nextMode === "manual") {
							setManualText(tokensToText(formula.tokens));
							setParseError(null);
							setMode("manual");
							return;
						}
						switchToVisual();
					}}
				/>
			</Flex>

			{mode === "visual" ? (
				<>
					{/* Zone 2 — expression ribbon */}
					<Box
						ref={ribbonRef}
						tabIndex={readOnly ? -1 : 0}
						onFocus={() => setIsRibbonFocused(true)}
						onBlur={handleRibbonBlur}
						onKeyDown={handleRibbonKeyDown}
						onClick={(event) => {
							if (readOnly || event.target !== event.currentTarget) return;
							setCursor(formula.tokens.length);
						}}
						data-test-id={TID.workFormulaRibbon}
						sx={{
							border: "1px solid #e2e8f0",
							borderRadius: "12px",
							bgcolor: "#fff",
							minHeight: 72,
							px: 1.5,
							py: 1.25,
							display: "flex",
							alignItems: "center",
							flexWrap: "wrap",
							gap: 0.25,
							outline: "none",
							"&:focus-visible": {
								borderColor: "#93c5fd",
							},
							"&:focus-within": {
								outline: "none",
							},
						}}
					>
						{formula.tokens.length === 0 ? (
							<>
								<FormulaRibbonGap
									active={cursorIndex === 0}
									showCursor={showRibbonCursor && cursorIndex === 0}
									readOnly={readOnly}
									onClick={() => setCursor(0)}
								/>
								<Typography
									sx={{
										fontSize: 13,
										color: "#94a3b8",
										pointerEvents: "none",
										userSelect: "none",
									}}
								>
									Добавьте элементы формулы
								</Typography>
							</>
						) : (
							formula.tokens.map((token, index) => {
								const colors = tokenChipColors(token);
								const label = tokenDisplayLabel(
									token,
									normValue,
									resolveParamName,
								);
								const anyOfValueCount =
									token.kind === "param_anyof"
										? resolveLaborAnyOfValueCount(laborParams, token.paramCode)
										: 0;
								const isIncompleteAnyOf =
									token.kind === "param_anyof" && anyOfValueCount === 0;
								const isInvalidParam =
									(token.kind === "param_coeff" ||
										token.kind === "param_anyof") &&
									(Boolean(token.invalid) || !isLaborFormulaParam(token));
								const isWarningParam = isIncompleteAnyOf && !isInvalidParam;
								const isEditingNumber =
									editingNumberIndex === index && token.kind === "number";
								const isEditingOperator =
									editingOperatorIndex === index && token.kind === "operator";
								const isOperator = token.kind === "operator";

								return (
									<Fragment key={`${token.kind}-${index}`}>
										<FormulaRibbonGap
											active={cursorIndex === index}
											showCursor={showRibbonCursor && cursorIndex === index}
											readOnly={readOnly}
											onClick={() => setCursor(index)}
										/>
										<Box
											data-test-id={
												isOperator ? TID.workFormulaOperatorChip : undefined
											}
											onClick={(event) => {
												event.stopPropagation();
												setCursor(index + 1);
												if (readOnly) return;
												if (token.kind === "number") {
													setEditingOperatorIndex(null);
													setEditingNumberIndex(index);
													setNumberDraft(String(token.value));
													return;
												}
												if (token.kind === "operator") {
													setEditingNumberIndex(null);
													setEditingOperatorIndex(index);
												}
											}}
											title={
												isInvalidParam
													? "Параметр удалён из блока трудоёмкости — исправьте формулу"
													: isWarningParam
														? "Any-of без выбранных значений — отметьте множество в карточке параметра"
														: isOperator && !readOnly
															? "Сменить оператор"
															: (token.kind === "param_coeff" ||
																		token.kind === "param_anyof") &&
																  label.subtitle
																? label.subtitle
																: undefined
											}
											sx={{
												display: "inline-flex",
												flexDirection: "column",
												alignItems: "center",
												justifyContent: "center",
												minWidth: isOperator ? 32 : token.kind === "norm" ? 72 : 48,
												px: isOperator ? 0.5 : 1,
												py: 0.5,
												borderRadius: "8px",
												border: `1px solid ${
													isInvalidParam
														? "#fca5a5"
														: isWarningParam
															? "#fdba74"
															: colors.border
												}`,
												bgcolor: isInvalidParam
													? "#fef2f2"
													: isWarningParam
														? "#fff7ed"
														: colors.bg,
												color: isInvalidParam
													? "#b91c1c"
													: isWarningParam
														? "#c2410c"
														: colors.color,
												cursor: readOnly ? "default" : "pointer",
												userSelect: "none",
												flexShrink: 0,
												outline: "none",
												"&:focus-within": {
													outline: "none",
													boxShadow: "none",
												},
											}}
										>
											{isEditingNumber ? (
												<TextField
													autoFocus
													size="small"
													value={numberDraft}
													onChange={(e) => setNumberDraft(e.target.value)}
													onClick={(event) => event.stopPropagation()}
													onBlur={() => {
														const value = Number(numberDraft.replace(",", "."));
														if (Number.isFinite(value) && value >= 0) {
															updateTokenAt(index, {
																kind: "number",
																value,
															});
															setCursor(index + 1);
														} else {
															setNumberDraft(String(token.value));
														}
														setEditingNumberIndex(null);
													}}
													onKeyDown={(e) => {
														e.stopPropagation();
														if (e.key === "Enter")
															(e.target as HTMLInputElement).blur();
														if (e.key === "Escape") {
															setEditingNumberIndex(null);
														}
													}}
													inputProps={{
														style: {
															width: 56,
															padding: "2px 4px",
															fontSize: 13,
															textAlign: "center",
														},
													}}
													sx={FORMULA_INLINE_NUMBER_FIELD_SX}
												/>
											) : isEditingOperator && token.kind === "operator" ? (
												<Flex
													gap={0.25}
													data-test-id={TID.workFormulaOperatorSelect}
													onClick={(event) => event.stopPropagation()}
												>
													{FORMULA_OPERATOR_OPTIONS.map(({ op, label }) => (
														<Button
															key={op}
															size="small"
															variant={token.op === op ? "contained" : "text"}
															onClick={() => {
																updateTokenAt(index, { kind: "operator", op });
																setEditingOperatorIndex(null);
																setCursor(index + 1);
																focusRibbon();
															}}
															sx={{
																minWidth: 28,
																px: 0.5,
																fontSize: 14,
																fontWeight: 700,
																lineHeight: 1.2,
															}}
														>
															{label}
														</Button>
													))}
												</Flex>
											) : (
												<>
													<Typography
														sx={{
															fontSize: token.kind === "norm" ? 12 : 13,
															fontWeight: 700,
															lineHeight: 1.2,
															textAlign: "center",
														}}
													>
														{label.title}
													</Typography>
													{label.subtitle ? (
														<Typography
															sx={{
																fontSize: 11,
																opacity: 0.85,
																lineHeight: 1.2,
																textAlign: "center",
																maxWidth: 140,
																overflow: "hidden",
																textOverflow: "ellipsis",
																whiteSpace: "nowrap",
															}}
														>
															{isWarningParam
																? `${label.subtitle} · нет значений`
																: label.subtitle}
														</Typography>
													) : null}
												</>
											)}
										</Box>
									</Fragment>
								);
							})
						)}
						{formula.tokens.length > 0 ? (
							<FormulaRibbonGap
								active={cursorIndex === formula.tokens.length}
								showCursor={
									showRibbonCursor && cursorIndex === formula.tokens.length
								}
								readOnly={readOnly}
								onClick={() => setCursor(formula.tokens.length)}
							/>
						) : null}
					</Box>

					{formulaError ? (
						<Typography sx={{ fontSize: 12, color: "#c62828" }}>
							{formulaError}
						</Typography>
					) : null}

					{/* Zone 3 — rounding */}
					<Flex alignItems="center" gap={10} wrap="wrap">
						<Typography
							sx={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}
						>
							Округление результата:
						</Typography>
						<SegmentBar
							data-test-id={TID.workFormulaRounding}
							segments={ROUNDING_OPTIONS.map((option) => ({
								id: option.mode,
								label: option.label,
							}))}
							value={rounding.mode}
							readOnly={readOnly}
							onChange={(mode) => onRoundingChange({ ...rounding, mode })}
						/>
						{rounding.mode !== "NONE" ? (
							<Flex alignItems="center" gap={0.75}>
								<Typography sx={{ fontSize: 13, color: "#64748b" }}>
									шаг
								</Typography>
								<Spacer width={6} />
								<TextField
									size="small"
									disabled={readOnly}
									value={String(rounding.step ?? 0.1).replace(".", ",")}
									onChange={(e) => {
										const step = Number(e.target.value.replace(",", "."));
										if (!Number.isFinite(step)) return;
										onRoundingChange({ ...rounding, step });
									}}
									inputProps={{
										style: { width: 48, padding: "4px 6px", fontSize: 13 },
									}}
									sx={{ "& .MuiInputBase-root": { height: 30 } }}
								/>
							</Flex>
						) : null}
					</Flex>

					{/* Zone 4 — add panel */}
					{!readOnly ? (
						<Box>
							<Typography
								sx={{ fontSize: 13, color: "#64748b", fontWeight: 600, mb: 1 }}
							>
								Добавить:
							</Typography>
							<TypicalWorkValueMatchingInfo variant="formula" />
							<Box
								sx={{
									display: "grid",
									gridTemplateColumns: {
										xs: "1fr",
										md: "repeat(3, minmax(0, 1fr))",
									},
									gap: 1.5,
									mb: 1.5,
								}}
							>
								<Box>
									<Typography
										sx={{
											fontSize: 11,
											color: "#64748b",
											fontWeight: 600,
											mb: 0.5,
										}}
									>
										По значениям
									</Typography>
									<FuzzyAutocomplete<ParamOption>
										key={`param-${paramPickerKey}`}
										data-test-id={TID.workFormulaParamSelect}
										options={paramByValueOptions}
										value={null}
										onChange={(param) => {
											if (!param) return;
											insertToken({
												kind: "param_coeff",
												paramCode: param.code,
												paramName: param.name,
											});
											setParamPickerKey((key) => key + 1);
										}}
										getOptionLabel={(param) => param.name}
										getOptionValue={(param) => param.code}
										getOptionSecondaryText={() =>
											"отдельный коэффициент на каждое значение"
										}
										placeholder="Коэф. по значениям…"
										emptyLabel="Коэф. по значениям…"
										searchPlaceholder="Поиск (режим «По значениям»)…"
										noMatchesText="Параметры не найдены"
										allowEmpty
										size="small"
										disabled={arithmeticLocked}
										textFieldSx={FORMULA_PICKER_FIELD_SX.paramCoeff}
										statusAlert={
											paramByValueOptions.length === 0
												? {
														severity: "info",
														message:
															"Добавьте параметр с режимом «По значениям» в блок «Параметры трудоёмкости»",
													}
												: null
										}
									/>
								</Box>
								<Box>
									<Typography
										sx={{
											fontSize: 11,
											color: "#64748b",
											fontWeight: 600,
											mb: 0.5,
										}}
									>
										Транзитив
									</Typography>
									<FuzzyAutocomplete<TransitiveSourceOption>
										key={
											isTransitiveOnlyFormula(formula.tokens)
												? `work-selected-${selectedWorkRef?.assignmentId ?? "none"}`
												: `work-${workPickerKey}`
										}
										data-test-id={TID.workFormulaWorkRefSelect}
										options={availableWorkSources}
										value={
											isTransitiveOnlyFormula(formula.tokens)
												? selectedWorkRef
												: null
										}
										onChange={handleWorkRefSelect}
										getOptionLabel={(source) => source.workName}
										getOptionValue={(source) => source.assignmentId}
										getOptionSecondaryText={(source) =>
											source.archComponentType
										}
										placeholder="Выберите значение работы…"
										emptyLabel="Выберите значение работы…"
										searchPlaceholder="Поиск значения работы…"
										noMatchesText="Работы не найдены"
										allowEmpty={!isTransitiveOnlyFormula(formula.tokens)}
										size="small"
										textFieldSx={FORMULA_PICKER_FIELD_SX.workRef}
									/>
								</Box>
								<Box>
									<Typography
										sx={{
											fontSize: 11,
											color: "#64748b",
											fontWeight: 600,
											mb: 0.5,
										}}
									>
										Any-of
									</Typography>
									<FuzzyAutocomplete<ParamOption>
										key={`anyof-${anyOfPickerKey}`}
										data-test-id={TID.workFormulaAnyOfSelect}
										options={paramAnyOfOptions}
										value={null}
										onChange={(param) => {
											if (!param) return;
											insertToken({
												kind: "param_anyof",
												paramCode: param.code,
												paramName: param.name,
											});
											setAnyOfPickerKey((key) => key + 1);
										}}
										getOptionLabel={(param) => param.name}
										getOptionValue={(param) => param.code}
										getOptionSecondaryText={(param) => {
											const count = param.anyOfValueCount ?? 0;
											if (count === 0) {
												return "значения не выбраны — отметьте в карточке параметра";
											}
											return `${count} ${count === 1 ? "значение" : count < 5 ? "значения" : "значений"} в множестве`;
										}}
										placeholder="Any-of параметр…"
										emptyLabel="Any-of параметр…"
										searchPlaceholder="Поиск (режим Any-of)…"
										noMatchesText="Any-of параметры не найдены"
										allowEmpty
										size="small"
										disabled={arithmeticLocked}
										textFieldSx={FORMULA_PICKER_FIELD_SX.paramAnyOf}
										statusAlert={
											anyOfLaborParamCount === 0
												? {
														severity: "info",
														message:
															"Добавьте параметр с режимом Any-of в блок «Параметры трудоёмкости»",
													}
												: paramAnyOfOptions.every(
															(param) => (param.anyOfValueCount ?? 0) === 0,
														)
													? {
															severity: "warning",
															message:
																"Any-of параметры есть, но множества значений пусты — отметьте значения в карточке; в формулу можно добавить заранее",
														}
													: null
										}
									/>
								</Box>
							</Box>
							<Flex alignItems="center" gap={6} wrap="wrap">
								<Button
									size="small"
									data-test-id={TID.workFormulaAddNorm}
									disabled={arithmeticLocked}
									variant="contained"
									onClick={() => insertToken({ kind: "norm" })}
								>
									Норма N
								</Button>
								<Button
									size="small"
									variant="outlined"
									color="secondary"
									disabled={arithmeticLocked}
									onClick={() => insertToken({ kind: "number", value: 1 })}
								>
									число
								</Button>
								{(["*", "/", "+", "-"] as const).map((op) => (
									<Button
										key={op}
										size="small"
										variant="outlined"
										disabled={arithmeticLocked}
										onClick={() => insertToken({ kind: "operator", op })}
										sx={{
											minWidth: 32,
											px: 0.5,
											fontSize: 14,
											fontWeight: 700,
											borderColor: "#e2e8f0",
											color: "#334155",
										}}
									>
										{operatorSymbol(op)}
									</Button>
								))}
								<Button
									size="small"
									variant="outlined"
									disabled={arithmeticLocked}
									onClick={() => insertToken({ kind: "paren_open" })}
									sx={{ minWidth: 32, borderColor: "#e2e8f0" }}
								>
									(
								</Button>
								<Button
									size="small"
									variant="outlined"
									disabled={arithmeticLocked}
									onClick={() => insertToken({ kind: "paren_close" })}
									sx={{ minWidth: 32, borderColor: "#e2e8f0" }}
								>
									)
								</Button>
								<Box sx={{ flex: 1 }} />
								<Button
									size="small"
									variant="text"
									data-test-id={TID.workFormulaClear}
									onClick={() => {
										if (formula.tokens.length === 0) return;
										setClearConfirmOpen(true);
									}}
									sx={{ color: "#dc2626", fontWeight: 600 }}
								>
									очистить
								</Button>
							</Flex>
						</Box>
					) : null}
				</>
			) : (
				<>
					<TextField
						size="small"
						fullWidth
						multiline
						minRows={3}
						value={manualText}
						disabled={readOnly}
						data-test-id={TID.workFormulaManualInput}
						onChange={(e) => {
							setManualText(e.target.value);
							setParseError(null);
						}}
						placeholder="N × коэф(param_1) + 0.5 × anyof(param_2)"
						error={Boolean(parseError)}
						helperText={parseError ?? " "}
					/>
				</>
			)}

			{/* Zone 6 — footer */}
			<Box
				data-test-id={TID.workFormulaFooter}
				sx={{
					bgcolor: "#1e293b",
					color: "#f8fafc",
					borderRadius: "12px",
					px: 2,
					py: 1.5,
				}}
			>
				<Flex
					justifyContent="space-between"
					alignItems="center"
					gap={12}
					wrap="wrap"
				>
					<Flex flexDirection="column" gap={0.5} minWidth="0">
						<Typography
							sx={{
								fontSize: 10,
								fontWeight: 700,
								color: "#94a3b8",
								letterSpacing: "0.06em",
								textTransform: "uppercase",
							}}
						>
							Общая формула норматива
						</Typography>
						<Typography
							data-test-id={TID.workFormulaGeneralSummary}
							sx={{
								fontSize: 18,
								fontWeight: 700,
								fontFamily: "ui-monospace, monospace",
								lineHeight: 1.3,
							}}
						>
							{generalSummary || (formula.tokens.length === 0 ? "—" : "N")}
						</Typography>
					</Flex>
					<Flex alignItems="center" gap={2} wrap="wrap">
						<Typography sx={{ fontSize: 12, color: "#94a3b8" }}>
							округление:{" "}
							<Box component="span" sx={{ color: "#e2e8f0" }}>
								[{roundingStepLabel}] {roundingModeLabel(rounding.mode)}
							</Box>
						</Typography>
						<Typography
							sx={{ fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap" }}
						>
							единица: чел.-дн.
						</Typography>
					</Flex>
				</Flex>
			</Box>

			<Dialog
				open={clearConfirmOpen}
				onClose={() => setClearConfirmOpen(false)}
			>
				<DialogTitle>Очистить формулу?</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Действие нельзя отменить. Все элементы формулы будут удалены.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setClearConfirmOpen(false)}>Отмена</Button>
					<Button
						color="error"
						onClick={handleClear}
						data-test-id={TID.workFormulaClearConfirm}
					>
						Очистить
					</Button>
				</DialogActions>
			</Dialog>
		</Flex>
	);
}
