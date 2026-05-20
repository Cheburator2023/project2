import AddIcon from "@mui/icons-material/Add";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import type { V2LogicRuleDto } from "@smart-anketa/api-contract";
import { rule as jsonRule } from "@react-client/features/jsonLoginBuilder";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useState } from "react";
import { normalizeJsonPointer } from "../../utils/schemaPaths";
import { PanelChrome } from "../components/PanelChrome";
import { useSchemaEditor } from "../SchemaEditorContext";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import { LogicRuleDetailEditor } from "./logicPanel/LogicRuleDetailEditor";
import { LogicRulesSidebar } from "./logicPanel/LogicRulesSidebar";

function buildRuleForKind(
	kind: V2LogicRuleDto["kind"],
	targetPath: string,
): V2LogicRuleDto {
	const id = nanoid();
	const base: V2LogicRuleDto = {
		id,
		kind,
		targetPath,
		dependencies: [],
		condition: true,
	};

	switch (kind) {
		case "visibility":
			return {
				...base,
				condition: jsonRule.looseEq(jsonRule.var("example"), ""),
			};
		case "required":
			return {
				...base,
				condition: jsonRule.looseEq(jsonRule.var("example"), ""),
			};
		case "computed":
			return {
				...base,
				condition: jsonRule.add(jsonRule.var("summary.baseScoreStream"), 0),
				payload: { mode: "preset", kind: "sum", operands: [] },
			};
		case "row_computed":
			return {
				...base,
				condition: {
					"*": [{ var: "estimateHoursPerDay" }, { var: "coefficient" }],
				} as V2LogicRuleDto["condition"],
				payload: {
					arrayPath: "mlPlatform.typicalTasks",
					fieldVar: "total",
				},
			};
		case "validation":
			return {
				...base,
				condition: jsonRule.looseEq(jsonRule.var("example"), ""),
				payload: { message: "Заполните поле" },
			};
		case "hint":
			return {
				...base,
				condition: true,
				payload: { text: "Подсказка для поля" },
			};
		case "task_trigger":
			return {
				...base,
				targetPath: "/",
				condition: jsonRule.looseEq(
					jsonRule.var("generalInfo.pilotNeed"),
					"Требуется",
				),
				payload: { taskCode: "PILOT_SUPPORT", label: "Пилот" },
			};
		default:
			return base;
	}
}

const QUICK_ADD_PRESETS: Array<{
	kind: V2LogicRuleDto["kind"];
	label: string;
	description: string;
}> = [
	{
		kind: "visibility",
		label: "Видимость",
		description: "Показать или скрыть поле по условию",
	},
	{
		kind: "required",
		label: "Обязательность",
		description: "Сделать поле обязательным по условию",
	},
	{
		kind: "computed",
		label: "Расчёт",
		description: "Записать вычисленное значение в поле",
	},
	{
		kind: "task_trigger",
		label: "Триггер работы",
		description: "Отметить типовую задачу в калькуляции",
	},
];

export function SchemaLogicPanel({ embedded = false }: { embedded?: boolean }) {
	const {
		logic,
		setLogic,
		formData,
		addRule,
		fieldPathHints,
		logicPathPick,
		setLogicPathPick,
		logicPathFieldHint,
		dictionaryEnumsLoading,
		cycles,
		selectedRule,
		selectedRuleId,
		setSelectedRuleId,
		selectedPointer,
		updateRulePatch,
		removeSelectedRule,
		previewEvalNote,
	} = useSchemaEditor();

	const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);

	const resolveTargetPath = useCallback(() => {
		return normalizeJsonPointer(
			logicPathPick?.trim() || selectedPointer?.trim() || "/",
		);
	}, [logicPathPick, selectedPointer]);

	const addRuleWithKind = useCallback(
		(kind: V2LogicRuleDto["kind"]) => {
			const nextRule = buildRuleForKind(kind, resolveTargetPath());
			setLogic((prev) => ({ rules: [...prev.rules, nextRule] }));
			setSelectedRuleId(nextRule.id);
			setAddMenuAnchor(null);
		},
		[resolveTargetPath, setLogic, setSelectedRuleId],
	);

	const duplicateRule = useCallback(
		(rule: V2LogicRuleDto) => {
			const id = nanoid();
			const copy: V2LogicRuleDto = {
				...rule,
				id,
				description: rule.description
					? `${rule.description} (копия)`
					: undefined,
			};
			setLogic((prev) => ({ rules: [...prev.rules, copy] }));
			setSelectedRuleId(id);
		},
		[setLogic, setSelectedRuleId],
	);

	const replaceSelectedRule = useCallback(
		(next: V2LogicRuleDto) => {
			setLogic((prev) => ({
				rules: prev.rules.map((r) => (r.id === next.id ? next : r)),
			}));
		},
		[setLogic],
	);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			const el = e.target as HTMLElement | null;
			if (!el) return;
			const tag = el.tagName;
			if (
				tag === "INPUT" ||
				tag === "TEXTAREA" ||
				tag === "SELECT" ||
				el.isContentEditable
			) {
				return;
			}

			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				const search = document.querySelector<HTMLInputElement>(
					'[data-logic-search="true"]',
				);
				search?.focus();
				return;
			}

			if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "n") {
				e.preventDefault();
				addRuleWithKind("visibility");
				return;
			}

			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
				e.preventDefault();
				if (selectedRule) duplicateRule(selectedRule);
				return;
			}

			if (e.key === "Delete" && selectedRule) {
				e.preventDefault();
				removeSelectedRule();
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [addRuleWithKind, duplicateRule, removeSelectedRule, selectedRule]);

	const addRuleMenu = (
		<>
			<Button
				size="small"
				variant="contained"
				startIcon={<AddIcon />}
				endIcon={<ArrowDropDownIcon />}
				onClick={(e) => setAddMenuAnchor(e.currentTarget)}
			>
				Новое правило
			</Button>
			<Menu
				anchorEl={addMenuAnchor}
				open={Boolean(addMenuAnchor)}
				onClose={() => setAddMenuAnchor(null)}
			>
				{QUICK_ADD_PRESETS.map((preset) => (
					<MenuItem
						key={preset.kind}
						onClick={() => addRuleWithKind(preset.kind)}
					>
						<Box>
							<Typography variant="body2">{preset.label}</Typography>
							<Typography variant="caption" color="text.secondary">
								{preset.description}
							</Typography>
						</Box>
					</MenuItem>
				))}
				<MenuItem
					onClick={() => {
						setAddMenuAnchor(null);
						addRule();
					}}
				>
					<Typography variant="body2">Пустое правило…</Typography>
				</MenuItem>
			</Menu>
		</>
	);

	return (
		<PanelChrome
			embedded={embedded}
			dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.logicEditor}
			title="Логика (JSON Logic)"
			description="Правила видимости, обязательности, расчёта и триггеров. Условия проверяются на данных вкладки «Превью»."
			actions={embedded ? undefined : addRuleMenu}
		>
			{embedded ? (
				<Stack
					direction="row"
					spacing={1}
					alignItems="center"
					flexWrap="wrap"
					useFlexGap
					sx={{ mb: 1.5, flexShrink: 0 }}
				>
					{addRuleMenu}
					<Typography variant="caption" color="text.secondary">
						или клавиша <strong>N</strong>
					</Typography>
				</Stack>
			) : null}

			<Alert severity="info" sx={{ mb: 2 }}>
				В <code>var</code> используйте точечные пути (<code>block.field</code>),
				не JSON Pointer. Горячие клавиши: <strong>N</strong> — новое правило,{" "}
				<strong>⌘D</strong> — дублировать, <strong>Del</strong> — удалить,{" "}
				<strong>⌘K</strong> — поиск в списке.
			</Alert>

			{cycles.length > 0 ? (
				<Alert severity="warning" sx={{ mb: 2 }}>
					Циклы зависимостей: {cycles.slice(0, 4).join(" · ")}
					{cycles.length > 4 ? ` (+${cycles.length - 4})` : ""}
				</Alert>
			) : null}

			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", lg: "minmax(240px, 300px) 1fr" },
					gap: 2,
					minHeight: 0,
					height: embedded ? "100%" : undefined,
					flex: embedded ? 1 : undefined,
				}}
			>
				<LogicRulesSidebar
					rules={logic.rules}
					fieldPathHints={fieldPathHints}
					selectedRuleId={selectedRuleId ?? undefined}
					onSelect={setSelectedRuleId}
					onAddRule={() => addRuleWithKind("visibility")}
					onAddRuleWithKind={addRuleWithKind}
					onDuplicate={duplicateRule}
					cycles={cycles}
				/>

				<Box sx={{ minWidth: 0, minHeight: 0, overflow: "auto" }}>
					{selectedRule ? (
						<LogicRuleDetailEditor
							selectedRule={selectedRule}
							fieldPathHints={fieldPathHints}
							formData={formData}
							logicPathPick={logicPathPick}
							setLogicPathPick={setLogicPathPick}
							logicPathFieldHint={logicPathFieldHint}
							dictionaryEnumsLoading={dictionaryEnumsLoading}
							previewEvalNote={previewEvalNote}
							updateRulePatch={updateRulePatch}
							removeSelectedRule={removeSelectedRule}
							cycles={cycles}
							onDuplicate={duplicateRule}
							onReplaceSelected={replaceSelectedRule}
						/>
					) : (
						<Alert severity="info">
							{logic.rules.length === 0
								? "Правил пока нет — нажмите «Новое правило» слева или выберите тип в меню выше."
								: "Выберите правило в списке слева или создайте новое."}
						</Alert>
					)}
				</Box>
			</Box>
		</PanelChrome>
	);
}
