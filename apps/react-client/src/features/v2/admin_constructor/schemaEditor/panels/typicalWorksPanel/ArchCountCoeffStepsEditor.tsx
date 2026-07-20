import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type {
	V2TypicalWorkTriggerArchCountOperator,
	V2WorkArchCountCoeffStep,
	V2WorkFormulaArchCountKind,
} from "@smart-anketa/api-contract";
import {
	V2_TYPICAL_WORK_TRIGGER_ARCH_COUNT_OPERATOR_VALUES,
	V2_WORK_ARCH_COUNT_LIMITS,
	formatLaborArchCountStepLabel,
	formatWorkArchCountKindLabel,
	resolveLaborArchCountOperator,
	validateArchCountCoeffSteps,
} from "@smart-anketa/api-contract";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { SegmentBar } from "@react-client/common/muiCustom/SegmentBar";
import { V2_TEMPLATE_EDIT_TEST_IDS as TID } from "@react-client/features/v2/admin_constructor/testIds";
import { useEffect, useMemo, useState } from "react";

type ArchCountCoeffStepsEditorProps = {
	open: boolean;
	kind: V2WorkFormulaArchCountKind;
	steps: V2WorkArchCountCoeffStep[];
	readOnly?: boolean;
	onClose: () => void;
	onSave: (steps: V2WorkArchCountCoeffStep[]) => void;
};

type CoeffMode = "const" | "formula";

const OPERATOR_LABELS: Record<V2TypicalWorkTriggerArchCountOperator, string> = {
	">=": "≥",
	"<=": "≤",
	"=": "=",
	">": ">",
	"<": "<",
};

function cloneSteps(steps: V2WorkArchCountCoeffStep[]): V2WorkArchCountCoeffStep[] {
	return steps.map((step) => ({
		count: step.count,
		coefficient: step.coefficient,
		operator: resolveLaborArchCountOperator(step),
		coefficientFormula: step.coefficientFormula?.trim()
			? step.coefficientFormula.trim()
			: null,
	}));
}

function stepCoeffMode(step: V2WorkArchCountCoeffStep): CoeffMode {
	return step.coefficientFormula?.trim() ? "formula" : "const";
}

export function ArchCountCoeffStepsEditor({
	open,
	kind,
	steps,
	readOnly = false,
	onClose,
	onSave,
}: ArchCountCoeffStepsEditorProps) {
	const [draft, setDraft] = useState<V2WorkArchCountCoeffStep[]>(() =>
		cloneSteps(steps),
	);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setDraft(cloneSteps(steps));
		setError(null);
	}, [open, steps]);

	const limits = V2_WORK_ARCH_COUNT_LIMITS[kind];
	const title = useMemo(() => formatWorkArchCountKindLabel(kind), [kind]);

	const updateStep = (
		index: number,
		patch: Partial<V2WorkArchCountCoeffStep>,
	) => {
		setDraft((prev) =>
			prev.map((step, idx) => (idx === index ? { ...step, ...patch } : step)),
		);
		setError(null);
	};

	const setCoeffMode = (index: number, mode: CoeffMode) => {
		setDraft((prev) =>
			prev.map((step, idx) => {
				if (idx !== index) return step;
				if (mode === "formula") {
					return {
						...step,
						coefficientFormula: step.coefficientFormula?.trim() || "N/5",
						coefficient:
							Number.isFinite(step.coefficient) && step.coefficient > 0
								? step.coefficient
								: 1,
					};
				}
				return {
					...step,
					coefficientFormula: null,
					coefficient:
						Number.isFinite(step.coefficient) && step.coefficient > 0
							? step.coefficient
							: 1,
				};
			}),
		);
		setError(null);
	};

	const addStep = () => {
		setDraft((prev) => [
			...prev,
			{
				count: limits.min,
				coefficient: 1,
				operator: "<=",
				coefficientFormula: null,
			},
		]);
		setError(null);
	};

	const removeStep = (index: number) => {
		setDraft((prev) => prev.filter((_, idx) => idx !== index));
		setError(null);
	};

	const moveStep = (index: number, direction: -1 | 1) => {
		setDraft((prev) => {
			const nextIndex = index + direction;
			if (nextIndex < 0 || nextIndex >= prev.length) return prev;
			const copy = [...prev];
			const [row] = copy.splice(index, 1);
			if (!row) return prev;
			copy.splice(nextIndex, 0, row);
			return copy;
		});
		setError(null);
	};

	const handleSave = () => {
		const normalized = cloneSteps(draft);
		const validation = validateArchCountCoeffSteps(kind, normalized);
		if (validation) {
			setError(validation);
			return;
		}
		onSave(normalized);
		onClose();
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="md"
			fullWidth
			data-test-id={TID.workFormulaArchCountDialog}
		>
			<DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>
				Коэффициент по количеству: {title}
			</DialogTitle>
			<DialogContent>
				<Typography sx={{ fontSize: 13, color: "#64748b", mb: 1.5 }}>
					Условия проверяются сверху вниз — срабатывает первое подходящее. N —
					фактическое количество компонентов в анкете. Порог: {limits.min}–
					{limits.max}.
				</Typography>
				<Flex flexDirection="column" gap={10}>
					{draft.map((step, index) => {
						const mode = stepCoeffMode(step);
						const operator = resolveLaborArchCountOperator(step);
						const operatorLabelId = `arch-count-op-${index}`;
						return (
							<Flex
								key={`step-${index}`}
								alignItems="flex-end"
								gap={8}
								wrap="wrap"
							>
								<FormControl
									size="small"
									disabled={readOnly}
									sx={{ minWidth: 88, bgcolor: "#fff" }}
								>
									<InputLabel id={operatorLabelId}>Оператор</InputLabel>
									<Select
										labelId={operatorLabelId}
										label="Оператор"
										value={operator}
										onChange={(event) =>
											updateStep(index, {
												operator: event.target
													.value as V2TypicalWorkTriggerArchCountOperator,
											})
										}
										title="Оператор сравнения"
									>
										{V2_TYPICAL_WORK_TRIGGER_ARCH_COUNT_OPERATOR_VALUES.map(
											(op) => (
												<MenuItem key={op} value={op}>
													{OPERATOR_LABELS[op]}
												</MenuItem>
											),
										)}
									</Select>
								</FormControl>
								<TextField
									size="small"
									label="Порог"
									type="number"
									disabled={readOnly}
									value={step.count}
									onChange={(event) => {
										const count = Number(event.target.value);
										if (!Number.isFinite(count)) return;
										updateStep(index, { count: Math.floor(count) });
									}}
									inputProps={{ min: limits.min, max: limits.max }}
									InputLabelProps={{ shrink: true }}
									sx={{ width: 100 }}
								/>
								<Flex
									alignItems="center"
									sx={{ height: 40, pb: "1px" }}
									title="Тип коэффициента"
								>
									<SegmentBar
										segments={[
											{ id: "const", label: "Число" },
											{ id: "formula", label: "Формула" },
										]}
										value={mode}
										onChange={(next) => {
											if (readOnly) return;
											setCoeffMode(index, next as CoeffMode);
										}}
									/>
								</Flex>
								{mode === "formula" ? (
									<TextField
										size="small"
										label="Формула (N)"
										disabled={readOnly}
										value={step.coefficientFormula ?? ""}
										onChange={(event) =>
											updateStep(index, {
												coefficientFormula: event.target.value,
											})
										}
										placeholder="N/5"
										InputLabelProps={{ shrink: true }}
										sx={{ width: 140 }}
										title="Например N/5 или 1+(N-1)*0.75"
									/>
								) : (
									<TextField
										size="small"
										label="Коэффициент"
										disabled={readOnly}
										value={String(step.coefficient).replace(".", ",")}
										onChange={(event) => {
											const coefficient = Number(
												event.target.value.replace(",", "."),
											);
											if (!Number.isFinite(coefficient)) return;
											updateStep(index, { coefficient });
										}}
										InputLabelProps={{ shrink: true }}
										sx={{ width: 120 }}
									/>
								)}
								{!readOnly ? (
									<Flex alignItems="center" gap={0} sx={{ height: 40 }}>
										<IconButton
											size="small"
											onClick={() => moveStep(index, -1)}
											disabled={index === 0}
											title="Выше"
											aria-label="Переместить выше"
										>
											<ArrowUpwardIcon fontSize="small" />
										</IconButton>
										<IconButton
											size="small"
											onClick={() => moveStep(index, 1)}
											disabled={index === draft.length - 1}
											title="Ниже"
											aria-label="Переместить ниже"
										>
											<ArrowDownwardIcon fontSize="small" />
										</IconButton>
										<IconButton
											size="small"
											onClick={() => removeStep(index)}
											disabled={draft.length <= 1}
											title="Удалить строку"
											aria-label="Удалить строку"
										>
											<DeleteOutlineIcon fontSize="small" />
										</IconButton>
									</Flex>
								) : null}
							</Flex>
						);
					})}
				</Flex>
				{!readOnly ? (
					<>
						<Spacer space={12} />
						<Button
							size="small"
							startIcon={<AddIcon />}
							onClick={addStep}
							data-test-id={TID.workFormulaArchCountAddStep}
						>
							Добавить условие
						</Button>
					</>
				) : null}
				{error ? (
					<>
						<Spacer space={12} />
						<Typography sx={{ fontSize: 12, color: "#c62828" }}>
							{error}
						</Typography>
					</>
				) : null}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>{readOnly ? "Закрыть" : "Отмена"}</Button>
				{!readOnly ? (
					<Button variant="contained" onClick={handleSave}>
						Сохранить
					</Button>
				) : null}
			</DialogActions>
		</Dialog>
	);
}

export function formatArchCountCoeffChipSubtitle(
	steps: readonly V2WorkArchCountCoeffStep[],
): string {
	if (steps.length === 0) return "настройте условия";
	const preview = steps
		.slice(0, 3)
		.map((step) => formatLaborArchCountStepLabel(step))
		.join("; ");
	return steps.length > 3 ? `${preview}; …` : preview;
}
