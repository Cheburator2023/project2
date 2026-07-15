import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type {
	V2WorkArchCountCoeffStep,
	V2WorkFormulaArchCountKind,
} from "@smart-anketa/api-contract";
import {
	V2_WORK_ARCH_COUNT_LIMITS,
	formatWorkArchCountKindLabel,
	validateArchCountCoeffSteps,
} from "@smart-anketa/api-contract";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
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

function normalizeDraftSteps(
	steps: V2WorkArchCountCoeffStep[],
): V2WorkArchCountCoeffStep[] {
	return [...steps].sort((a, b) => a.count - b.count);
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
		normalizeDraftSteps(steps),
	);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setDraft(normalizeDraftSteps(steps));
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

	const addStep = () => {
		setDraft((prev) => {
			const used = new Set(prev.map((step) => step.count));
			let nextCount = limits.min;
			while (used.has(nextCount) && nextCount <= limits.max) nextCount += 1;
			if (nextCount > limits.max) return prev;
			return normalizeDraftSteps([
				...prev,
				{ count: nextCount, coefficient: 1 },
			]);
		});
		setError(null);
	};

	const removeStep = (index: number) => {
		setDraft((prev) => prev.filter((_, idx) => idx !== index));
		setError(null);
	};

	const handleSave = () => {
		const validation = validateArchCountCoeffSteps(kind, draft);
		if (validation) {
			setError(validation);
			return;
		}
		onSave(normalizeDraftSteps(draft));
		onClose();
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="sm"
			fullWidth
			data-test-id={TID.workFormulaArchCountDialog}
		>
			<DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>
				Коэффициент по количеству: {title}
			</DialogTitle>
			<DialogContent>
				<Typography sx={{ fontSize: 13, color: "#64748b", mb: 1.5 }}>
					Укажите коэффициент для каждого количества компонентов в анкете.
					Диапазон количества: {limits.min}–{limits.max}.
				</Typography>
				<Flex flexDirection="column" gap={8}>
					{draft.map((step, index) => (
						<Flex key={`${step.count}-${index}`} alignItems="center" gap={8}>
							<TextField
								size="small"
								label="Количество"
								type="number"
								disabled={readOnly}
								value={step.count}
								onChange={(event) => {
									const count = Number(event.target.value);
									if (!Number.isFinite(count)) return;
									updateStep(index, { count: Math.floor(count) });
								}}
								inputProps={{ min: limits.min, max: limits.max }}
								sx={{ width: 120 }}
							/>
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
								sx={{ width: 120 }}
							/>
							{!readOnly ? (
								<IconButton
									size="small"
									onClick={() => removeStep(index)}
									disabled={draft.length <= 1}
									title="Удалить строку"
									aria-label="Удалить строку"
								>
									<DeleteOutlineIcon fontSize="small" />
								</IconButton>
							) : null}
						</Flex>
					))}
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
							Добавить пару
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
	if (steps.length === 0) return "настройте пары";
	const sorted = [...steps].sort((a, b) => a.count - b.count);
	const preview = sorted
		.slice(0, 3)
		.map((step) => `${step.count}→${step.coefficient}`)
		.join(", ");
	return sorted.length > 3 ? `${preview}, …` : preview;
}
