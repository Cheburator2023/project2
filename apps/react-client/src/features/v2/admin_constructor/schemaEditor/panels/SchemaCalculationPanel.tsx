import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import type {
	CalculationItem,
	ComputedRuleRole,
} from "../../utils/calculationEngine";
import { formatComputedNumber } from "../../utils/calculationEngine";
import { TaskTriggerRow } from "../../organisms/TaskTriggerRow";
import {
	isOverwrittenByLegacyStageEngine,
	LEGACY_STAGE_ENGINE_DESCRIPTION,
	LEGACY_STAGE_ENGINE_TITLE,
} from "../../utils/v2LegacyStageEngine";
import { useSchemaEditor } from "../SchemaEditorContext";
import { PanelChrome } from "../components/PanelChrome";

const ROLE_SECTIONS: Array<{
	id: ComputedRuleRole;
	title: string;
	description: string;
}> = [
	{
		id: "coefficient",
		title: "Коэффициенты",
		description: "Поправочные коэффициенты, влияющие на расчёт (ФТ-014, ФТ-024).",
	},
	{
		id: "stage_value",
		title: "Этапы",
		description: "Значения по этапам / разделам анкеты.",
	},
	{
		id: "typical_total",
		title: "Типовые работы",
		description: "Итог по типовым работам (см. ФТ-016).",
	},
	{
		id: "atypical_total",
		title: "Нетиповые работы",
		description: "Итог по нетиповым работам (см. ФТ-021).",
	},
	{
		id: "grand_total",
		title: "Итог",
		description: "Финальная калькуляция анкеты (ФТ-026).",
	},
	{
		id: "other",
		title: "Прочее",
		description: "Прочие вычисляемые поля.",
	},
];

function CalculationRow({
	item,
	onSelect,
	legacyOverwritten,
}: {
	item: CalculationItem;
	onSelect: (ruleId: string) => void;
	legacyOverwritten: boolean;
}) {
	const hintText = [
		item.formulaHint,
		item.weightSourceLabel
			? `Источник веса: ${item.weightSourceLabel}`
			: null,
		item.operands.length
			? `Операнды: ${item.operands
					.map((o) => `${o.varPath || "?"}=${formatComputedNumber(o.value)}`)
					.join("; ")}`
			: null,
		item.error ? `Ошибка: ${item.error}` : null,
		`JSON Pointer: ${item.targetPointer}`,
		`Режим: ${item.mode === "preset" ? "пресет" : "эксперт"}`,
	]
		.filter(Boolean)
		.join("\n");

	return (
		<Box
			role="button"
			tabIndex={0}
			onClick={() => onSelect(item.ruleId)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onSelect(item.ruleId);
				}
			}}
			sx={{
				display: "flex",
				alignItems: "center",
				gap: 1,
				px: 1,
				py: 0.75,
				borderRadius: 1,
				border: 1,
				borderColor: item.error ? "error.light" : "divider",
				bgcolor: "background.paper",
				cursor: "pointer",
				"&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
			}}
		>
			<Box sx={{ flex: 1, minWidth: 0 }}>
				<Typography
					variant="body2"
					fontWeight={500}
					noWrap
					title={item.label}
				>
					{item.label}
				</Typography>
				<Typography
					variant="caption"
					color="text.secondary"
					fontFamily="monospace"
					noWrap
				>
					{item.targetVarPath || item.targetPointer}
				</Typography>
				{legacyOverwritten ? (
					<Chip
						size="small"
						variant="outlined"
						color="warning"
						label="→ этапы v1"
						sx={{ height: 18, mt: 0.25 }}
						title="Значение в formData перезаписывается движком этапов v1 после JsonLogic"
					/>
				) : null}
			</Box>

			<Typography
				variant="body2"
				fontWeight={item.role === "grand_total" ? 700 : 500}
				sx={{
					minWidth: 60,
					textAlign: "right",
					color: item.error
						? "error.main"
						: item.value === null
							? "text.disabled"
							: "text.primary",
					fontSize: item.role === "grand_total" ? 16 : 13,
				}}
			>
				{formatComputedNumber(item.value)}
			</Typography>

			<IconButton size="small" title={hintText} aria-label="Подсказка">
				<InfoOutlinedIcon sx={{ fontSize: 16 }} />
			</IconButton>
		</Box>
	);
}

export function SchemaCalculationPanel({ embedded = false }: { embedded?: boolean }) {
	const {
		calculationItems,
		taskTriggerItems,
		calculationLoading,
		calculationError,
		legacyStageEvaluation,
		openLogicTabWithRule,
	} = useSchemaEditor();

	const sectionsWithItems = useMemo(() => {
		const byRole = new Map<ComputedRuleRole, CalculationItem[]>();
		for (const item of calculationItems) {
			const arr = byRole.get(item.role) ?? [];
			arr.push(item);
			byRole.set(item.role, arr);
		}
		return ROLE_SECTIONS.map((section) => ({
			...section,
			items: byRole.get(section.id) ?? [],
		})).filter((s) => s.items.length > 0);
	}, [calculationItems]);

	const hasAnything =
		sectionsWithItems.length > 0 || taskTriggerItems.length > 0;

	const legacyApplied = legacyStageEvaluation?.applied ?? false;

	return (
		<PanelChrome
			embedded={embedded}
			title="Детали калькуляции"
			description="Правила JsonLogic (computed / row_computed / триггеры). Итоговая оценка — в блоке превью выше."
		>
			<Alert severity="info" sx={{ mb: 1.5 }}>
				<strong>JsonLogic</strong> — visibility, validation, computed, row_computed,
				task_trigger (редактор «Логика»).{" "}
				<strong>{LEGACY_STAGE_ENGINE_TITLE}</strong> — {LEGACY_STAGE_ENGINE_DESCRIPTION}
				{legacyApplied
					? ` После /calculate: ${legacyStageEvaluation?.stageRowCount ?? 0} этапов · ${legacyStageEvaluation?.platformStreamCount ?? 0} стримов.`
					: null}
			</Alert>

			{calculationError ? (
				<Alert severity="error" sx={{ mb: 1 }}>
					{calculationError}
				</Alert>
			) : null}
			{calculationLoading ? (
				<Alert severity="info" sx={{ mb: 1 }}>
					Обновление расчёта…
				</Alert>
			) : null}
			{!hasAnything ? (
				<Alert severity="info" sx={{ mb: 1 }}>
					Добавьте правила типа «Вычисление» или «Триггер типовых задач» — здесь
					появятся коэффициенты, этапы и сработавшие триггеры.
				</Alert>
			) : null}

			<Stack spacing={2}>
				{sectionsWithItems.map((section) => (
					<Box key={section.id}>
						<Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
							<Typography variant="caption" fontWeight={700}>
								{section.title}
							</Typography>
							<IconButton size="small" title={section.description} aria-label="Описание">
								<InfoOutlinedIcon sx={{ fontSize: 14 }} />
							</IconButton>
						</Box>
						<Stack spacing={0.5}>
							{section.items.map((item) => (
								<CalculationRow
									key={item.ruleId}
									item={item}
									onSelect={openLogicTabWithRule}
									legacyOverwritten={
										legacyApplied &&
										isOverwrittenByLegacyStageEngine(item.targetPointer)
									}
								/>
							))}
						</Stack>
					</Box>
				))}

				{taskTriggerItems.length > 0 ? (
					<Box>
						<Divider sx={{ mb: 1 }} />
						<Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
							<Typography variant="caption" fontWeight={700}>
								Типовые работы (условия появления)
							</Typography>
							<IconButton
								size="small"
								title="ФТ-016: формирование типовых работ при срабатывании условий."
								aria-label="Описание"
							>
								<InfoOutlinedIcon sx={{ fontSize: 14 }} />
							</IconButton>
						</Box>
						<Stack spacing={0.5}>
							{taskTriggerItems.map((item) => (
								<TaskTriggerRow key={item.ruleId} item={item} />
							))}
						</Stack>
					</Box>
				) : null}
			</Stack>
		</PanelChrome>
	);
}
