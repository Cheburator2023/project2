import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentPasteGoIcon from "@mui/icons-material/ContentPasteGo";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import FunctionsIcon from "@mui/icons-material/Functions";
import HighlightAltIcon from "@mui/icons-material/HighlightAlt";
import LoopIcon from "@mui/icons-material/Loop";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RuleIcon from "@mui/icons-material/Rule";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import type { V2LogicRuleDto } from "@smart-anketa/api-contract";
import type { ReactNode } from "react";
import { useState } from "react";
import JsonLogicBuilder, {
	type JsonLogicValue,
	rule as jsonRule,
} from "@react-client/features/jsonLoginBuilder";
import { useSchemaEditor } from "../../SchemaEditorContext";
import {
	isOverwrittenByLegacyStageEngine,
	LEGACY_STAGE_ENGINE_DESCRIPTION,
} from "../../../utils/v2LegacyStageEngine";
import { SumArrayTemplateDialog } from "./SumArrayTemplateDialog";
import {
	COMPUTED_FORMULA_OPTIONS,
	COMPUTED_ROLE_OPTIONS,
	type ComputedFormulaKind,
	type ComputedRulePayload,
	type ComputedRuleRole,
	readByDotPath,
} from "../../../utils/calculationEngine";
import { normalizeJsonPointer } from "../../../utils/schemaPaths";
import { RULE_KIND_OPTIONS } from "../../constants";
import type { FieldPathHint } from "../../types";
import {
	evaluateRuleLive,
	fieldLabel,
	findUnclaimedVars,
	isRuleInCycle,
	mergeDependenciesWithVars,
	nextPayload,
	readComputedPayload,
	readPayloadString,
	ruleHelperText,
	rulePrimaryLabel,
	summarizeRule,
	validateRule,
} from "./helpers";
import { Card } from "@react-client/common/muiCustom/Card";

function exampleConditionForKind(kind: V2LogicRuleDto["kind"]): JsonLogicValue {
	switch (kind) {
		case "hint":
			return true;
		case "task_trigger":
			return jsonRule.looseEq(
				jsonRule.var("generalInfo.pilotNeed"),
				"Требуется",
			);
		case "computed":
			return jsonRule.add(jsonRule.var("summary.baseScoreStream"), 0);
		case "row_computed":
			return {
				"*": [{ var: "estimateHoursPerDay" }, { var: "coefficient" }],
			} as JsonLogicValue;
		default:
			return jsonRule.looseEq(jsonRule.var("example"), "");
	}
}

type Props = {
	selectedRule: V2LogicRuleDto;
	fieldPathHints: FieldPathHint[];
	formData: Record<string, unknown>;
	logicPathPick: string;
	setLogicPathPick: (v: string) => void;
	logicPathFieldHint: FieldPathHint | undefined;
	dictionaryEnumsLoading: boolean;
	previewEvalNote: ReactNode;
	updateRulePatch: (patch: Partial<V2LogicRuleDto>) => void;
	removeSelectedRule: () => void;
	cycles: string[];
	onDuplicate?: (rule: V2LogicRuleDto) => void;
	onReplaceSelected?: (next: V2LogicRuleDto) => void;
};

export function LogicRuleDetailEditor({
	selectedRule,
	fieldPathHints,
	formData,
	logicPathPick,
	setLogicPathPick,
	logicPathFieldHint,
	dictionaryEnumsLoading,
	previewEvalNote,
	updateRulePatch,
	removeSelectedRule,
	cycles,
	onDuplicate,
	onReplaceSelected,
}: Props) {
	const { jsonSchema } = useSchemaEditor();
	const computedPayload = readComputedPayload(selectedRule);
	const computedMode: "preset" | "expert" =
		computedPayload.mode === "preset" || computedPayload.kind
			? "preset"
			: "expert";

	const targetHint = fieldPathHints.find(
		(h) =>
			h.pointer === normalizeJsonPointer(selectedRule.targetPath) ||
			h.varPath === selectedRule.targetPath,
	);

	const liveEval = evaluateRuleLive(selectedRule, formData);
	const issues = validateRule(selectedRule, fieldPathHints);
	const inCycle = isRuleInCycle(selectedRule, cycles);
	const unclaimedVars = findUnclaimedVars(selectedRule, fieldPathHints);
	const summary = summarizeRule(selectedRule, fieldPathHints);

	const [importOpen, setImportOpen] = useState(false);
	const [importText, setImportText] = useState("");
	const [importError, setImportError] = useState<string | null>(null);
	const [sumArrayOpen, setSumArrayOpen] = useState(false);

	const showDependenciesStep = selectedRule.kind !== "hint";
	const showConditionStep = selectedRule.kind !== "hint";

	const applyComputedPayloadPatch = (patch: Partial<ComputedRulePayload>) => {
		const next: ComputedRulePayload = { ...computedPayload, ...patch };
		updateRulePatch({ payload: next as Record<string, unknown> });
	};

	const acceptDeclaredVars = () => {
		const merged = mergeDependenciesWithVars(selectedRule, fieldPathHints);
		updateRulePatch({ dependencies: merged });
	};

	const copyRuleJson = () => {
		void navigator.clipboard.writeText(JSON.stringify(selectedRule, null, 2));
	};

	const tryImportRule = () => {
		setImportError(null);
		try {
			const parsed = JSON.parse(importText);
			if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
				throw new Error("Ожидается объект правила.");
			}
			const obj = parsed as Record<string, unknown>;
			const next: V2LogicRuleDto = {
				...selectedRule,
				kind: (typeof obj.kind === "string"
					? obj.kind
					: selectedRule.kind) as V2LogicRuleDto["kind"],
				targetPath:
					typeof obj.targetPath === "string"
						? obj.targetPath
						: selectedRule.targetPath,
				dependencies: Array.isArray(obj.dependencies)
					? (obj.dependencies as string[])
					: selectedRule.dependencies,
				condition: (obj.condition ?? selectedRule.condition) as
					| V2LogicRuleDto["condition"],
				description:
					typeof obj.description === "string"
						? obj.description
						: selectedRule.description,
				payload:
					obj.payload && typeof obj.payload === "object"
						? (obj.payload as Record<string, unknown>)
						: selectedRule.payload,
			};
			onReplaceSelected?.(next);
			setImportOpen(false);
			setImportText("");
		} catch (err) {
			setImportError(err instanceof Error ? err.message : String(err));
		}
	};

	return (
		<Stack spacing={2}>

				<Card variant="outlined">
				
						<Stack spacing={1}>
							<Stack
								direction={{ xs: "column", sm: "row" }}
								spacing={1}
								alignItems={{ xs: "stretch", sm: "flex-start" }}
							>
								<Box sx={{ flex: 1, minWidth: 0 }}>
									<Typography variant="h6" fontSize={17}>
										{rulePrimaryLabel(selectedRule, fieldPathHints)}
									</Typography>
									<Typography
										variant="body2"
										color="text.secondary"
										sx={{ mb: 0.5 }}
									>
										{ruleHelperText(selectedRule)}
									</Typography>
									<Typography
										variant="caption"
										color="text.secondary"
										sx={{ fontStyle: "italic" }}
									>
										{summary}
									</Typography>
								</Box>
								<Stack
									direction="row"
									spacing={0.5}
									alignItems="center"
									flexWrap="wrap"
									useFlexGap
								>
									<LiveEvalChip eval={liveEval} />
									{inCycle ? (
										<Chip
											size="small"
											color="warning"
											icon={<LoopIcon sx={{ fontSize: 16 }} />}
											label="В цикле"
										/>
									) : null}
									<IconButton
										size="small"
										title="Скопировать JSON правила"
										aria-label="Скопировать JSON правила"
										onClick={copyRuleJson}
									>
										<ContentCopyIcon sx={{ fontSize: 18 }} />
									</IconButton>
									<IconButton
										size="small"
										title="Импорт правила из JSON"
										aria-label="Импорт правила из JSON"
										onClick={() => {
											setImportText(JSON.stringify(selectedRule, null, 2));
											setImportOpen(true);
										}}
									>
										<ContentPasteGoIcon sx={{ fontSize: 18 }} />
									</IconButton>
									{onDuplicate ? (
										<Button
											size="small"
											variant="outlined"
											onClick={() => onDuplicate(selectedRule)}
										>
											Дублировать
										</Button>
									) : null}
									<Button
										size="small"
										color="warning"
										variant="outlined"
										startIcon={<DeleteOutlineIcon />}
										onClick={removeSelectedRule}
									>
										Удалить
									</Button>
								</Stack>
							</Stack>

							{issues.length > 0 ? (
								<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
									{issues.map((iss, idx) => (
										<Chip
											key={`${iss.severity}-${idx}`}
											size="small"
											color={iss.severity === "error" ? "error" : "warning"}
											variant={iss.severity === "error" ? "filled" : "outlined"}
											icon={
												iss.severity === "error" ? (
													<ErrorOutlineIcon sx={{ fontSize: 14 }} />
												) : (
													<WarningAmberIcon sx={{ fontSize: 14 }} />
												)
											}
											label={iss.message}
										/>
									))}
								</Stack>
							) : (
								<Stack direction="row" spacing={0.5} alignItems="center">
									<CheckCircleOutlineIcon
										color="success"
										sx={{ fontSize: 16 }}
									/>
									<Typography variant="caption" color="success.main">
										Правило корректно.
									</Typography>
								</Stack>
							)}
						</Stack>
				
				</Card>


			<Card variant="outlined">
				
					<SectionHeader
						icon={<RuleIcon color="primary" fontSize="small" />}
						title="Шаг 1 · Тип правила"
						description="Что должно произойти, когда условие выполняется."
					/>
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
							gap: 1.5,
							mt: 1.5,
						}}
					>
						<TextField
							select
							size="small"
							label="Тип"
							value={selectedRule.kind}
							onChange={(e) =>
								updateRulePatch({
									kind: e.target.value as V2LogicRuleDto["kind"],
								})
							}
							fullWidth
						>
							{RULE_KIND_OPTIONS.map((rk) => (
								<MenuItem key={rk.key} value={rk.key}>
									{rk.label}
								</MenuItem>
							))}
						</TextField>
						<TextField
							size="small"
							label="Комментарий администратора"
							fullWidth
							value={selectedRule.description ?? ""}
							onChange={(e) =>
								updateRulePatch({ description: e.target.value })
							}
							placeholder="ФТ-016, пилот…"
							helperText="Только для заметок, на расчёт не влияет."
						/>
					</Box>

			</Card>

			{selectedRule.kind !== "task_trigger" ? (
				<Card variant="outlined">
		
						<SectionHeader
							icon={<PlayArrowIcon color="primary" fontSize="small" />}
							title="Шаг 2 · Целевое поле"
							description="JSON Pointer поля схемы, к которому применяется правило."
						/>
						<TextField
							select
							size="small"
							label="Целевое поле"
							fullWidth
							sx={{ mt: 1.5 }}
							value={normalizeJsonPointer(selectedRule.targetPath)}
							onChange={(e) =>
								updateRulePatch({
									targetPath: normalizeJsonPointer(e.target.value),
								})
							}
							helperText={
								targetHint?.varPath
									? `В JsonLogic: var «${targetHint.varPath}»`
									: "Выберите поле из схемы."
							}
						>
							{fieldPathHints.map((h) => (
								<MenuItem key={h.pointer} value={h.pointer}>
									{h.pointer}
									{h.title ? ` — ${h.title}` : ""}
								</MenuItem>
							))}
						</TextField>

						<PathHelperBox
							formData={formData}
							fieldPathHints={fieldPathHints}
							logicPathPick={logicPathPick}
							setLogicPathPick={setLogicPathPick}
							logicPathFieldHint={logicPathFieldHint}
							dictionaryEnumsLoading={dictionaryEnumsLoading}
							onInsertVar={(varPath) =>
								updateRulePatch({ condition: { var: varPath } })
							}
							onSetTarget={(pointer) =>
								updateRulePatch({ targetPath: normalizeJsonPointer(pointer) })
							}
						/>
					
				</Card>
			) : null}

			{selectedRule.kind === "hint" ? (
				<Card variant="outlined">
					
						<SectionHeader
							title="Текст подсказки"
							description="Отображается как ui:help у целевого поля в превью."
						/>
						<TextField
							size="small"
							label="Текст"
							fullWidth
							multiline
							minRows={3}
							sx={{ mt: 1.5 }}
							value={
								readPayloadString(selectedRule, "text") ||
								readPayloadString(selectedRule, "hint")
							}
							onChange={(e) =>
								updateRulePatch({
									payload: nextPayload(selectedRule, { text: e.target.value }),
									condition: true,
								})
							}
						/>
					
				</Card>
			) : null}

			{selectedRule.kind === "row_computed" ? (
				<Card variant="outlined">
					
						<SectionHeader
							title="Параметры расчёта строки"
							description="Backend обходит каждую строку массива и пишет результат в fieldVar."
						/>
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
								gap: 1.5,
								mt: 1.5,
							}}
						>
							<TextField
								size="small"
								label="Путь к массиву (var)"
								fullWidth
								value={readPayloadString(selectedRule, "arrayPath")}
								onChange={(e) =>
									updateRulePatch({
										payload: nextPayload(selectedRule, {
											arrayPath: e.target.value,
										}),
									})
								}
								placeholder="mlPlatform.typicalTasks"
								helperText="Например: mlPlatform.typicalTasks"
							/>
							<TextField
								size="small"
								label="Имя поля в строке"
								fullWidth
								value={readPayloadString(selectedRule, "fieldVar")}
								onChange={(e) =>
									updateRulePatch({
										payload: nextPayload(selectedRule, {
											fieldVar: e.target.value,
										}),
									})
								}
								placeholder="total"
							/>
						</Box>
					
				</Card>
			) : null}

			{selectedRule.kind === "task_trigger" ? (
				<Card variant="outlined">
					
						<SectionHeader
							title="Параметры типовой работы"
							description="Если условие истинно — backend помечает работу как «требуется»."
						/>
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
								gap: 1.5,
								mt: 1.5,
							}}
						>
							<TextField
								size="small"
								label="Код типовой работы"
								fullWidth
								value={readPayloadString(selectedRule, "taskCode")}
								onChange={(e) =>
									updateRulePatch({
										payload: nextPayload(selectedRule, {
											taskCode: e.target.value,
										}),
									})
								}
								placeholder="TASK_PILOT_SUPPORT"
							/>
							<TextField
								size="small"
								label="Название (для UI)"
								fullWidth
								value={readPayloadString(selectedRule, "label")}
								onChange={(e) =>
									updateRulePatch({
										payload: nextPayload(selectedRule, {
											label: e.target.value,
										}),
									})
								}
							/>
						</Box>
					
				</Card>
			) : null}

			{selectedRule.kind === "validation" ? (
				<Card variant="outlined">
					
						<SectionHeader
							title="Сообщение об ошибке"
							description="Показывается пользователю, если условие валидации ложно."
						/>
						<TextField
							size="small"
							label="Текст ошибки"
							fullWidth
							multiline
							minRows={2}
							sx={{ mt: 1.5 }}
							value={readPayloadString(selectedRule, "message")}
							onChange={(e) =>
								updateRulePatch({
									payload: nextPayload(selectedRule, {
										message: e.target.value,
									}),
								})
							}
						/>
					
				</Card>
			) : null}

			{showDependenciesStep ? (
				<Card variant="outlined">
					
						<SectionHeader
							icon={<HighlightAltIcon color="primary" fontSize="small" />}
							title="Шаг 3 · Зависимости"
							description="Поля-источники, которые читает условие. Нужны графу связей и порядку расчёта."
						/>
						<Box sx={{ mt: 1.5 }}>
							<TextField
								select
								fullWidth
								size="small"
								label="Зависимости (JSON Pointer)"
								SelectProps={{
									multiple: true,
									renderValue: (selected) =>
										(selected as string[]).map((p) => (
											<Chip
												key={p}
												size="small"
												label={p}
												sx={{ mr: 0.5, mb: 0.25 }}
											/>
										)),
								}}
								value={selectedRule.dependencies ?? []}
								onChange={(e) => {
									const value = e.target.value as unknown as string[];
									updateRulePatch({
										dependencies: value.map((p) => normalizeJsonPointer(p)),
									});
								}}
								helperText="Укажите все var из условия, которые читают другие поля формы."
							>
								{fieldPathHints.map((h) => (
									<MenuItem key={h.pointer} value={h.pointer}>
										{h.pointer}
										{h.title ? ` — ${h.title}` : ""}
									</MenuItem>
								))}
							</TextField>
						</Box>

						{unclaimedVars.length > 0 ? (
							<Alert
								severity="warning"
								sx={{ mt: 1.25 }}
								action={
									<Button
										size="small"
										color="inherit"
										startIcon={<AutoFixHighIcon />}
										onClick={acceptDeclaredVars}
									>
										Добавить
									</Button>
								}
							>
								В условии используются var без объявленной зависимости:{" "}
								<strong>{unclaimedVars.join(", ")}</strong>.
							</Alert>
						) : null}
					
				</Card>
			) : null}

			{selectedRule.kind === "computed" &&
			isOverwrittenByLegacyStageEngine(selectedRule.targetPath) ? (
				<Alert severity="warning" sx={{ mb: 1.5 }}>
					{LEGACY_STAGE_ENGINE_DESCRIPTION} Значение этого правила в данных
					формы будет заменено результатом этапов v1.
				</Alert>
			) : null}

			{selectedRule.kind === "computed" ? (
				<ComputedSettingsCard
					computedPayload={computedPayload}
					computedMode={computedMode}
					fieldPathHints={fieldPathHints}
					applyComputedPayloadPatch={applyComputedPayloadPatch}
				/>
			) : null}

			{showConditionStep ? (
				<Card variant="outlined">
					
						<SectionHeader
							icon={<FunctionsIcon color="primary" fontSize="small" />}
							title={
								selectedRule.kind === "computed" ||
								selectedRule.kind === "row_computed"
									? "Шаг 4 · Формула"
									: "Шаг 4 · Условие"
							}
							description={
								selectedRule.kind === "computed" ||
								selectedRule.kind === "row_computed"
									? "Результат вычисления записывается в целевое поле."
									: "Действие применяется, когда выражение истинно."
							}
						/>
						<Stack
							direction="row"
							spacing={1}
							sx={{ mt: 1.5 }}
							flexWrap="wrap"
							useFlexGap
						>
							<Button
								size="small"
								variant="outlined"
								onClick={() =>
									updateRulePatch({
										condition: exampleConditionForKind(selectedRule.kind),
									})
								}
							>
								Вставить пример
							</Button>
							{selectedRule.kind === "computed" && computedMode === "expert" ? (
								<Button
									size="small"
									variant="outlined"
									onClick={() => setSumArrayOpen(true)}
								>
									Σ по массиву
								</Button>
							) : null}
							{readPayloadString(selectedRule, "label") ? null : (
								<Typography variant="caption" color="text.secondary">
									Pro tip: задайте «Название» в шаге 1, чтобы правило было видно
									в калькуляции.
								</Typography>
							)}
						</Stack>
						{selectedRule.kind === "row_computed" ? (
							<Alert severity="info" sx={{ mt: 1.25 }}>
								В формуле указывайте поля одной строки массива, например{" "}
								<code>estimateHoursPerDay</code>, <code>coefficient</code> — без
								префикса раздела.
							</Alert>
						) : (
							<Alert severity="info" sx={{ mt: 1.25 }}>
								Собирайте выражение в конструкторе: поля выбираются из схемы
								анкеты (те же пути, что в превью формы). Результат проверяется на
								вкладке «Превью» ниже.
							</Alert>
						)}
						<JsonLogicBuilder
							shellSx={{ maxHeight: { xs: 360, md: 480 }, minHeight: 200 }}
							value={(selectedRule.condition ?? true) as JsonLogicValue}
							data={formData}
							onChange={(value) =>
								updateRulePatch({
									condition: value as V2LogicRuleDto["condition"],
								})
							}
						/>
						<Divider sx={{ my: 1.5 }} />
						<Typography
							variant="caption"
							color="text.secondary"
							display="block"
							sx={{ mb: 0.5 }}
						>
							Проверка на данных превью (вкладка «Превью»):
						</Typography>
						{previewEvalNote}
					
				</Card>
			) : null}

			<SumArrayTemplateDialog
				open={sumArrayOpen}
				jsonSchema={jsonSchema}
				onClose={() => setSumArrayOpen(false)}
				onApply={(condition) => {
					const draft = { ...selectedRule, condition };
					updateRulePatch({
						condition,
						dependencies: mergeDependenciesWithVars(
							draft,
							fieldPathHints,
						),
					});
				}}
			/>

			<Dialog
				open={importOpen}
				onClose={() => setImportOpen(false)}
				fullWidth
				maxWidth="sm"
			>
				<DialogTitle>
					Импорт правила из JSON
					<IconButton
						size="small"
						onClick={() => setImportOpen(false)}
						sx={{ position: "absolute", top: 8, right: 8 }}
						aria-label="Закрыть"
					>
						<CloseIcon />
					</IconButton>
				</DialogTitle>
				<DialogContent>
					<TextField
						multiline
						minRows={10}
						maxRows={20}
						fullWidth
						value={importText}
						onChange={(e) => setImportText(e.target.value)}
						sx={{ mt: 1 }}
						helperText="Поля id/dependencies/payload/condition/kind/targetPath. id и пр. сохранятся, остальное перезапишется."
					/>
					{importError ? (
						<Alert severity="error" sx={{ mt: 1 }}>
							{importError}
						</Alert>
					) : null}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setImportOpen(false)}>Отмена</Button>
					<Button variant="contained" onClick={tryImportRule}>
						Применить
					</Button>
				</DialogActions>
			</Dialog>
		</Stack>
	);
}

function LiveEvalChip({
	eval: result,
}: {
	eval: ReturnType<typeof evaluateRuleLive>;
}) {
	switch (result.kind) {
		case "boolean":
			return (
				<Chip
					size="small"
					color={result.value ? "success" : "default"}
					label={result.value ? "Сейчас: true" : "Сейчас: false"}
					title="Результат условия на текущих данных формы"
				/>
			);
		case "number":
			return (
				<Chip
					size="small"
					color="info"
					label={`= ${result.value}`}
					title="Результат вычисления на текущих данных"
				/>
			);
		case "string":
			return (
				<Chip
					size="small"
					color="info"
					label={`= "${result.value.slice(0, 20)}"`}
					title={result.value}
				/>
			);
		case "skipped":
			return (
				<Chip
					size="small"
					variant="outlined"
					label="—"
					title={result.reason}
				/>
			);
		case "error":
			return (
				<Chip
					size="small"
					color="error"
					label="ошибка"
					title={result.message}
				/>
			);
		default:
			return (
				<Chip size="small" variant="outlined" label="?" title="Нет результата" />
			);
	}
}

function SectionHeader({
	icon,
	title,
	description,
}: {
	icon?: ReactNode;
	title: string;
	description: string;
}) {
	return (
		<Stack direction="row" spacing={1} alignItems="flex-start">
			{icon}
			<Box>
				<Typography variant="subtitle2">{title}</Typography>
				<Typography variant="caption" color="text.secondary">
					{description}
				</Typography>
			</Box>
		</Stack>
	);
}

function PathHelperBox({
	formData,
	fieldPathHints,
	logicPathPick,
	setLogicPathPick,
	logicPathFieldHint,
	dictionaryEnumsLoading,
	onInsertVar,
	onSetTarget,
}: {
	formData: Record<string, unknown>;
	fieldPathHints: FieldPathHint[];
	logicPathPick: string;
	setLogicPathPick: (v: string) => void;
	logicPathFieldHint: FieldPathHint | undefined;
	dictionaryEnumsLoading: boolean;
	onInsertVar: (varPath: string) => void;
	onSetTarget: (pointer: string) => void;
}) {
	const inlineValue =
		logicPathFieldHint?.varPath !== undefined
			? readByDotPath(formData, logicPathFieldHint.varPath)
			: undefined;

	return (
		<Box
			sx={{
				mt: 1.5,
				border: 1,
				borderColor: "divider",
				borderRadius: 1,
				p: 1.5,
				bgcolor: "action.hover",
			}}
		>
			<Typography
				variant="caption"
				color="text.secondary"
				display="block"
				sx={{ mb: 1 }}
			>
				Справочник путей: скопируйте pointer или var, подставьте в условие или
				сделайте целевым полем.
			</Typography>
			<TextField
				select
				fullWidth
				size="small"
				label="Поле схемы"
				value={logicPathPick}
				onChange={(e) => setLogicPathPick(e.target.value)}
			>
				<MenuItem value="">
					<em>Выберите…</em>
				</MenuItem>
				{fieldPathHints.map((h) => (
					<MenuItem key={h.pointer} value={h.pointer}>
						{h.pointer}
						{h.title ? ` — ${h.title}` : ""}
					</MenuItem>
				))}
			</TextField>
			{logicPathFieldHint ? (
				<Stack spacing={0.75} sx={{ mt: 1 }}>
					<CopyRow
						label="JSON Pointer"
						value={logicPathFieldHint.pointer}
						onCopy={() =>
							void navigator.clipboard.writeText(logicPathFieldHint.pointer)
						}
					/>
					<CopyRow
						label="var"
						value={logicPathFieldHint.varPath || "—"}
						onCopy={() => {
							if (logicPathFieldHint.varPath) {
								void navigator.clipboard.writeText(logicPathFieldHint.varPath);
							}
						}}
						disabled={!logicPathFieldHint.varPath}
					/>
					<Stack
						direction="row"
						spacing={0.5}
						alignItems="center"
						flexWrap="wrap"
						useFlexGap
					>
						<Typography variant="caption" color="text.secondary">
							Значение в превью:
						</Typography>
						<code style={{ fontSize: 12 }}>
							{inlineValue === undefined
								? "не задано"
								: typeof inlineValue === "object"
									? JSON.stringify(inlineValue)
									: String(inlineValue)}
						</code>
					</Stack>
					<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
						<Button
							size="small"
							variant="outlined"
							disabled={!logicPathFieldHint.varPath}
							onClick={() => {
								if (logicPathFieldHint.varPath)
									onInsertVar(logicPathFieldHint.varPath);
							}}
						>
							В условие
						</Button>
						<Button
							size="small"
							variant="text"
							onClick={() => onSetTarget(logicPathFieldHint.pointer)}
						>
							Сделать целевым
						</Button>
					</Stack>
					{logicPathFieldHint.dictionaryCode ? (
						<Typography variant="caption" color="text.secondary">
							Справочник {logicPathFieldHint.dictionaryCode}:{" "}
							{logicPathFieldHint.codesPreview?.join(", ") ??
								(dictionaryEnumsLoading ? "…" : "нет")}
						</Typography>
					) : null}
				</Stack>
			) : null}
		</Box>
	);
}

function CopyRow({
	label,
	value,
	onCopy,
	disabled,
}: {
	label: string;
	value: string;
	onCopy: () => void;
	disabled?: boolean;
}) {
	return (
		<Stack
			direction="row"
			spacing={0.5}
			alignItems="center"
			flexWrap="wrap"
			useFlexGap
		>
			<Typography variant="caption" color="text.secondary">
				{label}:
			</Typography>
			<code style={{ fontSize: 12 }}>{value}</code>
			<IconButton
				size="small"
				title={`Копировать ${label}`}
				aria-label={`Копировать ${label}`}
				onClick={onCopy}
				disabled={disabled}
			>
				<ContentCopyIcon sx={{ fontSize: 16 }} />
			</IconButton>
		</Stack>
	);
}

function ComputedSettingsCard({
	computedPayload,
	computedMode,
	fieldPathHints,
	applyComputedPayloadPatch,
}: {
	computedPayload: ComputedRulePayload;
	computedMode: "preset" | "expert";
	fieldPathHints: FieldPathHint[];
	applyComputedPayloadPatch: (patch: Partial<ComputedRulePayload>) => void;
}) {
	return (
		<Card variant="outlined">
			
				<SectionHeader
					icon={<FunctionsIcon color="primary" fontSize="small" />}
					title="Настройки вычисления"
					description="Метаданные для панели «Калькуляция» и backend POST /calculate."
				/>
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
						gap: 1.5,
						mt: 1.5,
					}}
				>
					<TextField
						select
						size="small"
						label="Роль"
						fullWidth
						value={computedPayload.role ?? "other"}
						onChange={(e) =>
							applyComputedPayloadPatch({
								role: e.target.value as ComputedRuleRole,
							})
						}
					>
						{COMPUTED_ROLE_OPTIONS.map((r) => (
							<MenuItem key={r.key} value={r.key}>
								{r.label}
							</MenuItem>
						))}
					</TextField>
					<TextField
						size="small"
						label="Название в калькуляции"
						fullWidth
						value={computedPayload.label ?? ""}
						onChange={(e) =>
							applyComputedPayloadPatch({ label: e.target.value })
						}
					/>
				</Box>
				<TextField
					size="small"
					label="Источник веса"
					fullWidth
					sx={{ mt: 1.5 }}
					value={computedPayload.weightSourceLabel ?? ""}
					onChange={(e) =>
						applyComputedPayloadPatch({
							weightSourceLabel: e.target.value,
						})
					}
				/>
				<ToggleButtonGroup
					size="small"
					exclusive
					value={computedMode}
					sx={{ mt: 1.5 }}
					onChange={(_e, val) => {
						if (val !== "preset" && val !== "expert") return;
						applyComputedPayloadPatch({
							mode: val,
							...(val === "expert" ? { kind: undefined } : {}),
						});
					}}
				>
					<ToggleButton value="preset">Простой режим</ToggleButton>
					<ToggleButton value="expert">Экспертный JsonLogic</ToggleButton>
				</ToggleButtonGroup>
				{computedMode === "preset" ? (
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
							gap: 1.5,
							mt: 1.5,
						}}
					>
						<TextField
							select
							size="small"
							label="Формула"
							fullWidth
							value={computedPayload.kind ?? "sum"}
							onChange={(e) =>
								applyComputedPayloadPatch({
									kind: e.target.value as ComputedFormulaKind,
								})
							}
							helperText={
								COMPUTED_FORMULA_OPTIONS.find(
									(f) => f.key === (computedPayload.kind ?? "sum"),
								)?.description
							}
						>
							{COMPUTED_FORMULA_OPTIONS.map((f) => (
								<MenuItem key={f.key} value={f.key}>
									{f.label}
								</MenuItem>
							))}
						</TextField>
						<Autocomplete
							multiple
							size="small"
							options={fieldPathHints.map((h) => h.varPath).filter(Boolean)}
							value={computedPayload.operands ?? []}
							onChange={(_e, val) =>
								applyComputedPayloadPatch({
									operands: val.filter(Boolean),
								})
							}
							getOptionLabel={(opt) => fieldLabel(fieldPathHints, opt)}
							renderInput={(params) => (
								<TextField
									{...params}
									label="Операнды (var)"
									placeholder="Поля…"
								/>
							)}
						/>
					</Box>
				) : null}
				<TextField
					size="small"
					label="Подсказка к формуле"
					fullWidth
					sx={{ mt: 1.5 }}
					value={computedPayload.formulaHint ?? ""}
					onChange={(e) =>
						applyComputedPayloadPatch({ formulaHint: e.target.value })
					}
				/>
			
		</Card>
	);
}
