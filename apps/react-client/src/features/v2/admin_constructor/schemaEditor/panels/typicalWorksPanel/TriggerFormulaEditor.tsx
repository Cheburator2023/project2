import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type {
	V2TriggerFormulaToken,
	V2TypicalWorkParameterDto,
	V2TypicalWorkTriggerFormulaDto,
	V2WorkFormulaArchCountKind,
} from "@smart-anketa/api-contract";
import {
	V2_WORK_FORMULA_ARCH_COUNT_KINDS,
	createDefaultTriggerParamToken,
	describeTriggerFormulaToken,
	formatWorkArchCountKindLabel,
	triggerFormulaTokensToText,
	validateTriggerFormulaTokens,
} from "@smart-anketa/api-contract";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { FuzzyAutocomplete } from "@react-client/common/muiCustom/FuzzyAutocomplete";
import { V2_TEMPLATE_EDIT_TEST_IDS as TID } from "@react-client/features/v2/admin_constructor/testIds";
import { useMemo, useState } from "react";
import {
	ArchCountCoeffStepsEditor,
	formatArchCountCoeffChipSubtitle,
} from "./ArchCountCoeffStepsEditor";
import { TriggerParamTokenDialog } from "./TriggerParamTokenDialog";
import { schemaParamRuleName } from "./schemaWorkParameters";
import { cursorAfterTokenDelete } from "./workFormulaCursor";

type TriggerFormulaEditorProps = {
	formula: V2TypicalWorkTriggerFormulaDto;
	paramOptions: V2TypicalWorkParameterDto[];
	onChange: (formula: V2TypicalWorkTriggerFormulaDto) => void;
};

function insertTokenAt(
	tokens: V2TriggerFormulaToken[],
	index: number,
	token: V2TriggerFormulaToken,
): V2TriggerFormulaToken[] {
	const next = [...tokens];
	next.splice(index, 0, token);
	return next;
}

function tokenChipColors(token: V2TriggerFormulaToken): {
	bg: string;
	color: string;
	border: string;
} {
	switch (token.kind) {
		case "param":
			return { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" };
		case "arch_count":
			return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
		case "logic":
			return { bg: "#f8fafc", color: "#334155", border: "#e2e8f0" };
		default:
			return { bg: "#fff", color: "#334155", border: "#e2e8f0" };
	}
}

export function TriggerFormulaEditor({
	formula,
	paramOptions,
	onChange,
}: TriggerFormulaEditorProps) {
	const [cursorIndex, setCursorIndex] = useState(formula.tokens.length);
	const [pickerKey, setPickerKey] = useState(0);
	const [archCountPickerKey, setArchCountPickerKey] = useState(0);
	const [editParamIndex, setEditParamIndex] = useState<number | null>(null);
	const [archCountEditIndex, setArchCountEditIndex] = useState<number | null>(
		null,
	);

	const validationError = useMemo(
		() => validateTriggerFormulaTokens(formula.tokens),
		[formula.tokens],
	);

	const commitTokens = (tokens: V2TriggerFormulaToken[], cursor?: number) => {
		onChange({
			tokens,
			text: triggerFormulaTokensToText(tokens),
		});
		if (cursor != null) {
			setCursorIndex(Math.max(0, Math.min(cursor, tokens.length)));
		}
	};

	const insertToken = (token: V2TriggerFormulaToken) => {
		const next = insertTokenAt(formula.tokens, cursorIndex, token);
		commitTokens(next, cursorIndex + 1);
	};

	const removeTokenAt = (deletedIndex: number) => {
		commitTokens(
			formula.tokens.filter((_, idx) => idx !== deletedIndex),
			cursorAfterTokenDelete(deletedIndex, cursorIndex),
		);
	};

	const updateTokenAt = (index: number, token: V2TriggerFormulaToken) => {
		const next = [...formula.tokens];
		next[index] = token;
		commitTokens(next);
	};

	const editParamToken =
		editParamIndex != null && formula.tokens[editParamIndex]?.kind === "param"
			? formula.tokens[editParamIndex]
			: null;
	const editParamOption = editParamToken
		? paramOptions.find((p) => p.code === editParamToken.paramCode)
		: null;
	const archCountEditToken =
		archCountEditIndex != null &&
		formula.tokens[archCountEditIndex]?.kind === "arch_count"
			? formula.tokens[archCountEditIndex]
			: null;

	return (
		<Box>
			<Typography sx={{ fontSize: 11.5, color: "#6b7484", mb: 1 }}>
				Соберите условие появления: параметры, операторы <b>И</b> / <b>ИЛИ</b>,
				скобки и условие по количеству компонентов.
			</Typography>
			<Box
				data-test-id={TID.workTriggerFormulaRibbon}
				tabIndex={0}
				onClick={(event) => {
					if (event.target === event.currentTarget) {
						setCursorIndex(formula.tokens.length);
					}
				}}
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
					gap: 0.5,
					mb: 1.25,
				}}
			>
				{formula.tokens.length === 0 ? (
					<Typography sx={{ fontSize: 12, color: "#94a3b8" }}>
						Добавьте параметр условия или оператор…
					</Typography>
				) : null}
				{formula.tokens.map((token, index) => {
					const colors = tokenChipColors(token);
					const selected = cursorIndex === index;
					return (
						<Box key={`${token.kind}-${index}`} sx={{ display: "inline-flex" }}>
							{selected ? (
								<Box
									sx={{
										width: 2,
										height: 28,
										bgcolor: "#2563eb",
										borderRadius: 1,
										alignSelf: "center",
										mx: 0.25,
									}}
								/>
							) : null}
							<Box
								component="button"
								type="button"
								onClick={() => {
									setCursorIndex(index + 1);
									if (token.kind === "param") setEditParamIndex(index);
									if (token.kind === "arch_count") setArchCountEditIndex(index);
								}}
								title={describeTriggerFormulaToken(token)}
								sx={{
									display: "inline-flex",
									alignItems: "center",
									gap: 0.5,
									height: 30,
									px: 1.1,
									borderRadius: "8px",
									cursor: "pointer",
									fontFamily: "inherit",
									fontSize: 12,
									fontWeight: 600,
									bgcolor: colors.bg,
									color: colors.color,
									border: `1px solid ${colors.border}`,
								}}
							>
								{token.kind === "arch_count"
									? `${formatWorkArchCountKindLabel(token.archComponentKind)} ${formatArchCountCoeffChipSubtitle(token.steps)}`
									: describeTriggerFormulaToken(token)}
							</Box>
							<IconButton
								size="small"
								aria-label="Удалить элемент"
								onClick={() => removeTokenAt(index)}
								sx={{ color: "#c2554c", ml: -0.25 }}
							>
								<DeleteOutlineIcon sx={{ fontSize: 16 }} />
							</IconButton>
						</Box>
					);
				})}
				{cursorIndex === formula.tokens.length && formula.tokens.length > 0 ? (
					<Box
						sx={{
							width: 2,
							height: 28,
							bgcolor: "#2563eb",
							borderRadius: 1,
						}}
					/>
				) : null}
			</Box>
			{validationError ? (
				<Typography sx={{ fontSize: 11.5, color: "#c62828", mb: 1 }}>
					{validationError}
				</Typography>
			) : null}
			<Flex gap={8} wrap="wrap" alignItems="flex-end">
				<Box sx={{ minWidth: 220, flex: "1 1 220px" }}>
					<Typography
						sx={{ fontSize: 11, color: "#64748b", fontWeight: 600, mb: 0.5 }}
					>
						Параметр условия появления
					</Typography>
					<FuzzyAutocomplete<V2TypicalWorkParameterDto>
						key={pickerKey}
						data-test-id={TID.workTriggerFormulaParamSelect}
						options={paramOptions}
						value={null}
						onChange={(param) => {
							if (!param) return;
							const first = param.values[0];
							insertToken(
								createDefaultTriggerParamToken({
									paramCode: param.code,
									paramName: schemaParamRuleName(param),
									schemaFieldUid: param.schemaFieldUid ?? null,
									valueCode: first?.code ?? null,
									valueLabel: first?.label ?? null,
								}),
							);
							setPickerKey((key) => key + 1);
						}}
						getOptionLabel={(param) => param.name}
						getOptionValue={(param) => param.code}
						placeholder="Выберите параметр…"
						emptyLabel="Выберите параметр…"
						searchPlaceholder="Поиск параметра…"
						noMatchesText="Параметры не найдены"
						allowEmpty
						size="small"
					/>
				</Box>
				<Box sx={{ minWidth: 200, flex: "1 1 200px" }}>
					<Typography
						sx={{ fontSize: 11, color: "#64748b", fontWeight: 600, mb: 0.5 }}
					>
						По количеству компонентов
					</Typography>
					<FuzzyAutocomplete<{ kind: V2WorkFormulaArchCountKind; label: string }>
						key={archCountPickerKey}
						data-test-id={TID.workTriggerFormulaArchCountSelect}
						options={V2_WORK_FORMULA_ARCH_COUNT_KINDS.map((kind) => ({
							kind,
							label: formatWorkArchCountKindLabel(kind),
						}))}
						value={null}
						onChange={(option) => {
							if (!option) return;
							insertToken({
								kind: "arch_count",
								archComponentKind: option.kind,
								steps: [{ count: 1, coefficient: 1 }],
							});
							setArchCountEditIndex(cursorIndex);
							setArchCountPickerKey((key) => key + 1);
						}}
						getOptionLabel={(option) => option.label}
						getOptionValue={(option) => option.kind}
						placeholder="Компонент…"
						emptyLabel="Компонент…"
						searchPlaceholder="Поиск…"
						noMatchesText="Не найдено"
						allowEmpty
						size="small"
					/>
				</Box>
			</Flex>
			<Spacer space={12} />
			<Flex gap={8} wrap="wrap">
				<Button
					size="small"
					variant="outlined"
					onClick={() => insertToken({ kind: "logic", op: "and" })}
					sx={{ textTransform: "none", fontWeight: 700 }}
				>
					И
				</Button>
				<Button
					size="small"
					variant="outlined"
					onClick={() => insertToken({ kind: "logic", op: "or" })}
					sx={{ textTransform: "none", fontWeight: 700 }}
				>
					ИЛИ
				</Button>
				<Button
					size="small"
					variant="outlined"
					onClick={() => insertToken({ kind: "paren_open" })}
					sx={{ textTransform: "none", fontWeight: 700 }}
				>
					(
				</Button>
				<Button
					size="small"
					variant="outlined"
					onClick={() => insertToken({ kind: "paren_close" })}
					sx={{ textTransform: "none", fontWeight: 700 }}
				>
					)
				</Button>
				<Button
					size="small"
					color="inherit"
					onClick={() => commitTokens([], 0)}
					sx={{ textTransform: "none", ml: "auto" }}
				>
					Очистить
				</Button>
			</Flex>

			<TriggerParamTokenDialog
				open={editParamIndex != null}
				token={editParamToken}
				param={editParamOption ?? null}
				onClose={() => setEditParamIndex(null)}
				onSave={(token) => {
					if (editParamIndex == null) return;
					updateTokenAt(editParamIndex, token);
					setEditParamIndex(null);
				}}
			/>
			{archCountEditToken ? (
				<ArchCountCoeffStepsEditor
					open={archCountEditIndex != null}
					kind={archCountEditToken.archComponentKind}
					steps={archCountEditToken.steps}
					onClose={() => setArchCountEditIndex(null)}
					onSave={(steps) => {
						if (archCountEditIndex == null) return;
						updateTokenAt(archCountEditIndex, {
							...archCountEditToken,
							steps,
						});
						setArchCountEditIndex(null);
					}}
				/>
			) : null}
		</Box>
	);
}
