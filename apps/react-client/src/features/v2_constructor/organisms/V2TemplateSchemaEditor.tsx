import {
	useCreateV2TemplateVersion,
	usePublishV2TemplateVersion,
	useUpdateV2TemplateVersion,
	useV2Template,
	useV2TemplateVersions,
} from "@react-client/common/api/queries/v2-templates";
import { apiClient } from "@react-client/common/api/helpers/apiClient";
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import Editor from "@monaco-editor/react";
import Form from "@rjsf/mui";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type {
	CreateV2TemplateVersionRequestDto,
	V2LogicRuleDto,
} from "@smart-anketa/api-contract";
import JsonLogicBuilder, {
	type JsonLogicValue,
	applyLogic,
	rule as jsonRule,
} from "react-json-logic";
import { nanoid } from "nanoid";
import {
	Alert,
	Box,
	Button,
	Checkbox,
	Divider,
	FormControlLabel,
	FormHelperText,
	MenuItem,
	Select,
	Tab,
	Tabs,
	TextField,
	Typography,
} from "@mui/material";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { StyledJsonLogicShell } from "../styles/styledJsonLogicShell";
import { dependencyCycleWarnings } from "../utils/logicGraphAnalysis";
import { derivePreviewSchemas } from "../utils/logicPreview";
import {
	EMPTY_JSON_SCHEMA,
	coerceJsonSchema,
	coerceLogicGraph,
	coerceUiSchema,
} from "../utils/coerceV2TemplateSnapshot";
import { pointerSegments, parentOfPointer } from "../utils/schemaPaths";
import {
	addRootProperty,
	listSchemaFields,
	removePropertyAtPointer,
	resolveSchemaNode,
	setUiWidgetAtPointer,
	toggleRequiredAtPointer,
	updatePropertyAtPointer,
} from "../utils/schemaMutators";

const TAB_HEADINGS = [
	["designer", "Конструктор"],
	["json", "Редактор JSON"],
	["logic", "Логика"],
] as const;

const SCHEMA_TYPE_RU: Record<string, string> = {
	string: "строка",
	number: "число",
	integer: "целое",
	boolean: "да/нет",
	object: "объект",
	array: "массив",
	null: "null",
};

function ruSchemaTypeLabel(typeLabel: string): string {
	return typeLabel
		.split(" | ")
		.map((t) => SCHEMA_TYPE_RU[t.trim()] ?? t.trim())
		.join(" | ");
}

function EditorSectionTitle({
	title,
	description,
}: {
	title: string;
	description?: string;
}) {
	return (
		<Box sx={{ mb: 1 }}>
			<Typography variant="subtitle2" component="h3" sx={{ fontWeight: 600 }}>
				{title}
			</Typography>
			{description ? (
				<Typography
					variant="caption"
					color="text.secondary"
					component="p"
					sx={{ mt: 0.5, mb: 0 }}
				>
					{description}
				</Typography>
			) : null}
		</Box>
	);
}

const RULE_KIND_OPTIONS: Array<{ key: string; label: string }> = [
	{ key: "visibility", label: "Видимость" },
	{ key: "required", label: "Обязательность" },
	{ key: "computed", label: "Вычисление" },
	{ key: "validation", label: "Валидация" },
	{ key: "hint", label: "Подсказка" },
	{ key: "task_trigger", label: "Триггер типовых задач" },
];

const RULE_KIND_LABEL_MAP: Record<string, string> = Object.fromEntries(
	RULE_KIND_OPTIONS.map((o) => [o.key, o.label]),
);

function ruleKindLabel(kind: string): string {
	return RULE_KIND_LABEL_MAP[kind] ?? kind;
}

type FieldTypePreset = RJSFSchema["type"];

const FIELD_PRESETS: Array<{
	id: FieldTypePreset;
	title: string;
	make: () => RJSFSchema;
}> = [
	{
		id: "string",
		title: "Строка",
		make: () => ({ type: "string", title: "Строковое поле" }),
	},
	{
		id: "integer",
		title: "Целое",
		make: () => ({ type: "integer", title: "Число (целое)" }),
	},
	{
		id: "number",
		title: "Число",
		make: () => ({ type: "number", title: "Число" }),
	},
	{
		id: "boolean",
		title: "Да / нет",
		make: () => ({ type: "boolean", title: "Логический" }),
	},
	{
		id: "object",
		title: "Объект (группа)",
		make: () => ({
			type: "object",
			title: "Группа полей",
			properties: {},
		}),
	},
];

const WIDGET_PRESETS: Array<{ label: string; value: string }> = [
	{ label: "По умолчанию (стандарт RJSF)", value: "" },
	{ label: "Текстовое поле — TextFieldCustomWidget", value: "TextFieldCustomWidget" },
	{ label: "Число — NumberInputWidget", value: "NumberInputWidget" },
	{ label: "Список — ListWidget", value: "ListWidget" },
	{
		label: "Универсальная зависимость — UniversalDependencyWidget",
		value: "UniversalDependencyWidget",
	},
	{
		label: "Массив карточек — ArrayCustomCardListsWidget",
		value: "ArrayCustomCardListsWidget",
	},
	{ label: "Неопределённость — GeneralUncertaintyWidget", value: "GeneralUncertaintyWidget" },
	{
		label: "Сложность алгоритма — AlgorithmComplexityWidget",
		value: "AlgorithmComplexityWidget",
	},
];

function readUiBranch(
	uiSchema: UiSchema | Record<string, unknown>,
	segments: string[],
): Record<string, unknown> | undefined {
	let cur: unknown = uiSchema;

	for (const s of segments) {
		if (!cur || typeof cur !== "object" || Array.isArray(cur)) {
			return undefined;
		}

		cur = (cur as Record<string, unknown>)[s];
	}

	if (!cur || typeof cur !== "object" || Array.isArray(cur)) {
		return undefined;
	}

	return cur as Record<string, unknown>;
}

export type V2SchemaEditorWording = "adminSchema" | "playgroundTemplate";

export type V2EditorHeaderMeta = {
	title: string;
	versionNumber: number;
	status: string;
};

interface V2TemplateSchemaEditorProps {
	templateId: string;
	/** В админке редактируем «схему»; в песочнице — язык пользователя «шаблон анкеты». */
	wording?: V2SchemaEditorWording;
	onHeaderMetaChange?: (meta: V2EditorHeaderMeta | null) => void;
}

export const V2TemplateSchemaEditor = ({
	templateId,
	wording = "playgroundTemplate",
	onHeaderMetaChange,
}: V2TemplateSchemaEditorProps) => {
	const { data: template } = useV2Template(templateId);
	const { data: versions, refetch: refetchVersions } = useV2TemplateVersions(
		templateId,
	);
	const createVersion = useCreateV2TemplateVersion();
	const updateVersion = useUpdateV2TemplateVersion();
	const publishVersion = usePublishV2TemplateVersion();

	const draftVersion = useMemo(() => {
		const drafts =
			versions
				?.filter((v) => v.status === "draft")
				.sort((a, b) => b.versionNumber - a.versionNumber) ?? [];
		return drafts[0] ?? undefined;
	}, [versions]);

	const [jsonSchema, setJsonSchema] = useState<RJSFSchema>(EMPTY_JSON_SCHEMA);
	const [uiSchema, setUiSchema] = useState<UiSchema>({});
	const [logic, setLogic] = useState(coerceLogicGraph(undefined));
	const [formData, setFormData] = useState<Record<string, unknown>>({});

	const [selectedPointer, setSelectedPointer] = useState<string | null>(null);
	const [schemaMonacoText, setSchemaMonacoText] = useState(
		JSON.stringify(EMPTY_JSON_SCHEMA, null, 2),
	);
	const [uiMonacoText, setUiMonacoText] = useState("{}");

	const [mainTab, setMainTab] = useState<
		"designer" | "json" | "logic"
	>("designer");

	const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
	const [depsDraft, setDepsDraft] = useState("");
	const [monacoError, setMonacoError] = useState<string | null>(null);

	const selectedRule =
		logic.rules.find((r) => r.id === selectedRuleId) ?? logic.rules[0];

	useEffect(() => {
		if (selectedRule?.id !== selectedRuleId) {
			setSelectedRuleId(selectedRule?.id ?? null);
		}

		setDepsDraft(selectedRule?.dependencies.join(", ") ?? "");
	}, [logic.rules, selectedRule, selectedRuleId]);

	useEffect(() => {
		if (!template || !draftVersion) {
			onHeaderMetaChange?.(null);
			return;
		}

		onHeaderMetaChange?.({
			title: template.name,
			versionNumber: draftVersion.versionNumber,
			status: draftVersion.status,
		});
	}, [template, draftVersion, onHeaderMetaChange]);

	useEffect(() => {
		if (!draftVersion?.id) {
			return;
		}

		const nextSchema = coerceJsonSchema(draftVersion.jsonSchema);
		setJsonSchema(nextSchema);
		setUiSchema(coerceUiSchema(draftVersion.uiSchema));
		setLogic(coerceLogicGraph(draftVersion.logic));

		setSchemaMonacoText(JSON.stringify(nextSchema, null, 2));
		setUiMonacoText(JSON.stringify(coerceUiSchema(draftVersion.uiSchema), null, 2));

		setFormData({});
	}, [draftVersion?.id]);

	const cycles = useMemo(
		() => dependencyCycleWarnings(logic.rules),
		[logic.rules],
	);

	const treeRows = useMemo(() => listSchemaFields(jsonSchema), [jsonSchema]);

	const { previewSchema, previewUiSchema } = useMemo(
		() => derivePreviewSchemas(jsonSchema, uiSchema, logic.rules, formData),
		[jsonSchema, uiSchema, logic.rules, formData],
	);

	const handleCreateDraft = async (mode: "empty" | "current") => {
		const emptyDto: CreateV2TemplateVersionRequestDto = {
			jsonSchema: structuredClone(EMPTY_JSON_SCHEMA),
			uiSchema: {},
			logic: { rules: [] },
			releaseNotes: "Новый черновик",
		};

		let dto = emptyDto;

		if (mode === "current" && template?.currentVersionId) {
			const v = await apiClient<{
				jsonSchema: unknown;
				uiSchema: unknown;
				logic: unknown;
				versionNumber: number;
			}>({
				url: `/v2/templates/${templateId}/versions/${template.currentVersionId}`,
				method: "GET",
			});

			dto = {
				jsonSchema: coerceJsonSchema(v.jsonSchema),
				uiSchema: coerceUiSchema(v.uiSchema),
				logic: coerceLogicGraph(v.logic),
				releaseNotes: `Копия опубликованной v${v.versionNumber}`,
			};
		}

		await createVersion.mutateAsync({ templateId, dto });
		refetchVersions();
	};

	const handleSaveDraft = async () => {
		if (!draftVersion) return;
		await updateVersion.mutateAsync({
			templateId,
			versionId: draftVersion.id,
			dto: {
				jsonSchema,
				uiSchema,
				logic,
			},
		});
		refetchVersions();
	};

	const handlePublishDraft = async () => {
		if (!draftVersion) return;
		await publishVersion.mutateAsync({
			templateId,
			versionId: draftVersion.id,
			dto: {},
		});
		refetchVersions();
	};

	const syncMonacoApply = () => {
		let parsedSchema: unknown;
		let parsedUi: unknown;

		try {
			parsedSchema = JSON.parse(schemaMonacoText);
		} catch {
			setMonacoError("JSON Schema: некорректный JSON");
			return;
		}

		try {
			parsedUi = JSON.parse(uiMonacoText);
		} catch {
			setMonacoError("UI Schema: некорректный JSON");
			return;
		}

		setJsonSchema(coerceJsonSchema(parsedSchema));
		setUiSchema(coerceUiSchema(parsedUi));
		setSchemaMonacoText(JSON.stringify(coerceJsonSchema(parsedSchema), null, 2));
		setUiMonacoText(JSON.stringify(coerceUiSchema(parsedUi), null, 2));
		setMonacoError(null);
	};

	const reloadMonacoFromState = () => {
		setSchemaMonacoText(JSON.stringify(jsonSchema, null, 2));
		setUiMonacoText(JSON.stringify(uiSchema, null, 2));
		setMonacoError(null);
	};

	const pk = selectedPointer ? parentOfPointer(selectedPointer) : null;

	const resolvedField =
		selectedPointer !== null
			? resolveSchemaNode(jsonSchema, pointerSegments(selectedPointer))
			: undefined;

	const parentNode = pk ? resolveSchemaNode(jsonSchema, pk.parentSegments) : undefined;

	const uiSegments = selectedPointer ? pointerSegments(selectedPointer) : [];

	const leafUiBranch =
		uiSegments.length > 0
			? readUiBranch(uiSchema as Record<string, unknown>, uiSegments)
			: undefined;

	const currentWidgetRaw = leafUiBranch?.["ui:widget"];

	const isRequired =
		selectedPointer !== null && pk?.key !== undefined
			? Boolean(parentNode?.required?.includes(pk.key))
			: false;

	const currentWidget =
		typeof currentWidgetRaw === "string" ? currentWidgetRaw : "";

	const handleAddFieldPreset = (preset: RJSFSchema) => {
		const key = `field_${nanoid(8)}`;

		const next = addRootProperty(jsonSchema, key, preset);

		if (next) setJsonSchema(next);
	};

	const updateField = (patch: Partial<RJSFSchema>) => {
		if (!selectedPointer) return;
		const segs = pointerSegments(selectedPointer);
		const next = updatePropertyAtPointer(jsonSchema, segs, patch);
		if (next) setJsonSchema(next);
	};

	const handleDeleteField = () => {
		if (!selectedPointer) return;
		const segs = pointerSegments(selectedPointer);
		const next = removePropertyAtPointer(jsonSchema, segs);
		if (next) {
			setJsonSchema(next);
			setSelectedPointer(null);
		}
	};

	const handleToggleRequired = (checked: boolean) => {
		if (!selectedPointer) return;
		const next = toggleRequiredAtPointer(jsonSchema, selectedPointer, checked);
		if (next) setJsonSchema(next);
	};

	const handleWidgetChange = (widget: string) => {
		if (!selectedPointer) return;
		const nextUi = setUiWidgetAtPointer(
			uiSchema as Record<string, unknown>,
			selectedPointer,
			widget.length ? widget : null,
		);
		setUiSchema(nextUi as UiSchema);
	};

	const addRule = () => {
		const id = nanoid();
		const target = selectedPointer ?? "/";
		const nextRule: V2LogicRuleDto = {
			id,
			kind: "visibility",
			targetPath: target,
			dependencies: [],
			condition: true,
		};

		setLogic((prev) => ({ rules: [...prev.rules, nextRule] }));
		setSelectedRuleId(id);
	};

	const updateRulePatch = (patch: Partial<V2LogicRuleDto>) => {
		if (!selectedRule) return;
		setLogic((prev) => ({
			rules: prev.rules.map((r) => (r.id === selectedRule.id ? { ...r, ...patch } : r)),
		}));
	};

	const handleDepsBlur = () => {
		const list = depsDraft
			.split(/[,;\s]+/)
			.map((s) => s.trim())
			.filter(Boolean);

		updateRulePatch({ dependencies: [...new Set(list)] });
	};

	let previewEvalNote: React.ReactNode = null;

	if (selectedRule) {
		try {
			const value = applyLogic(selectedRule.condition as JsonLogicValue, formData);
			previewEvalNote = (
				<Typography variant="caption" color="text.secondary" component="div">
					Значение условия на данных превью:{" "}
					<code>{JSON.stringify(value)}</code>
				</Typography>
			);
		} catch (err) {
			previewEvalNote = (
				<Typography variant="caption" color="error" component="div">
					Ошибка интерпретации: {err instanceof Error ? err.message : String(err)}
				</Typography>
			);
		}
	}

	if (!template) {
		return (
			<Typography>
				{wording === "adminSchema"
					? "Схема не найдена или идёт загрузка..."
					: "Шаблон не найден или загрузка..."}
			</Typography>
		);
	}

	if (!draftVersion) {
		return (
			<Flex flexDirection="column" gap={2}>
				<Typography variant="h6">Нет активного черновика</Typography>
				<Typography variant="body2" color="text.secondary">
					{wording === "adminSchema"
						? "Черновик версии живёт отдельно от опубликованной. Можно скопировать текущую опубликованную версию схемы или начать с пустого JSON Schema."
						: "Черновая версия создаётся отдельно от шаблона. Можно скопировать текущую опубликованную версию или начать с пустой схемы."}
				</Typography>
				<Flex gap={1} wrap="wrap">
					<Button
						variant="contained"
						disabled={createVersion.isPending}
						onClick={() => void handleCreateDraft("empty")}
					>
						Пустой черновик
					</Button>
					<Button
						variant="outlined"
						disabled={createVersion.isPending || !template?.currentVersionId}
						onClick={() => void handleCreateDraft("current")}
					>
						Копировать текущую опубликованную
					</Button>
				</Flex>
			</Flex>
		);
	}

	return (
		<Flex flexDirection="column" gap={2}>
			<Flex justifyContent="flex-end" alignItems="center" wrap="wrap">
				<Flex gap={1} wrap="wrap">
					<Button variant="contained" onClick={() => void handleSaveDraft()}>
						Сохранить
					</Button>
					<Button variant="outlined" onClick={() => void handlePublishDraft()}>
						Опубликовать
					</Button>
				</Flex>
			</Flex>

			{mainTab !== "logic" && cycles.length > 0 ? (
				<Alert severity="warning">
					Подозреваются циклические зависимости в правилах ({cycles.length}). Откройте
					вкладку «Логика» и проверьте граф перед публикацией.
				</Alert>
			) : null}

			<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
				<Tabs
					value={mainTab}
					onChange={(_event, value) => setMainTab(value)}
					aria-label="Режимы редактирования схемы"
				>
					{TAB_HEADINGS.map(([key, label]) => (
						<Tab key={key} value={key} label={label} />
					))}
				</Tabs>
			</Box>

			{mainTab === "designer" ? (
				<>
					<Card>
						<EditorSectionTitle
							title="Поля корня схемы"
							description="Быстро добавьте типовые свойства в корень JSON Schema; название и структуру можно уточнить в дереве и во вкладке «Редактор JSON»."
						/>
						<Flex gap={1} wrap="wrap">
							{FIELD_PRESETS.map((p) => (
								<Button
									key={p.title}
									size="small"
									variant="outlined"
									onClick={() => handleAddFieldPreset(p.make())}
								>
									+ {p.title}
								</Button>
							))}
						</Flex>
					</Card>
					<Spacer />
					<Flex gap={2} wrap="wrap" alignItems="stretch">
						<Card sx={{ flex: 1, minWidth: 240, padding: "10px" }}>
							<EditorSectionTitle
								title="Дерево полей"
								description="Иерархия свойств текущего черновика. Выберите узел, чтобы редактировать заголовок, тип и виджет."
							/>
							<Divider sx={{ mb: 1 }} />
							<Flex flexDirection="column">
								{treeRows.map((row) => {
									const rowFieldNode = resolveSchemaNode(
										jsonSchema,
										pointerSegments(row.pointer),
									);

									return (
										<Box
											key={row.pointer}
											pl={row.depth * 2}
											py={0.75}
											sx={{
												cursor: "pointer",
												bgcolor:
													selectedPointer === row.pointer
														? "action.selected"
														: undefined,
												"&:hover": { bgcolor: "action.hover" },
											}}
											onClick={(e: React.MouseEvent<HTMLDivElement>) => {
												e.stopPropagation();
												setSelectedPointer(row.pointer);
											}}
										>
											<Flex
												gap={1}
												justifyContent="space-between"
												alignItems="center"
											>
												<Typography variant="body2">{row.key}</Typography>
												<Typography variant="caption" color="text.secondary">
													{ruSchemaTypeLabel(row.typeLabel)}
												</Typography>
											</Flex>

											{typeof rowFieldNode?.title === "string" && (
												<Typography variant="caption" color="text.secondary">
													{rowFieldNode.title}
												</Typography>
											)}
										</Box>
									);
								})}
								{treeRows.length === 0 ? (
									<Typography variant="body2" color="text.secondary">
										Добавьте поля из палитры выше.
									</Typography>
								) : null}
							</Flex>
						</Card>

						<Card sx={{ flex: 1, minWidth: 260, padding: "10px" }}>
							<EditorSectionTitle
								title="Свойства выбранного поля"
								description="Изменения применяются к JSON Schema и UI Schema черновика; сохраните черновик кнопкой «Сохранить»."
							/>
							<Divider sx={{ mb: 1 }} />
							{!selectedPointer || !pk ? (
								<Typography variant="body2" color="text.secondary">
									Выберите поле в дереве слева.
								</Typography>
							) : (
								<>
									<Typography variant="caption" color="text.secondary" display="block">
										Путь (JSON Pointer): <code>{selectedPointer}</code>
									</Typography>
									<Spacer />

									<TextField
										fullWidth
										size="small"
										label="Подпись в форме (title)"
										helperText="Отображаемое имя поля в анкете."
										value={resolvedField?.title ?? ""}
										onChange={(e) => updateField({ title: e.target.value })}
									/>
									<Spacer />

									<TextField
										fullWidth
										size="small"
										multiline
										minRows={2}
										label="Текст под полем (description)"
										helperText="Подсказка или пояснение для заполняющего анкету."
										value={(resolvedField?.description as string) ?? ""}
										onChange={(e) => updateField({ description: e.target.value })}
									/>
									<Spacer />

									<TextField
										select
										fullWidth
										size="small"
										label="Тип данных в JSON Schema"
										helperText="Базовый тип значения поля для валидации и превью."
										value={
											(Array.isArray(resolvedField?.type)
												? resolvedField!.type.join(",")
												: resolvedField?.type) ?? "string"
										}
										onChange={(e) => {
											updateField({
												type: e.target.value as FieldTypePreset,
												...(e.target.value === "object"
													? { properties: {} }
													: {}),
											});
										}}
									>
										{FIELD_PRESETS.filter((fp) =>
											["string", "number", "integer", "boolean", "object"].includes(
												fp.id as string,
											),
										).map((fp) => (
											<MenuItem key={`${fp.id}`} value={`${fp.id}`}>
												{fp.title}
											</MenuItem>
										))}
									</TextField>

									<Spacer />

									<FormControlLabel
										control={
											<Checkbox
												checked={isRequired}
												onChange={(e) => handleToggleRequired(e.target.checked)}
											/>
										}
										label="Обязательное в родительском объекте"
									/>

									<Spacer />

									<TextField
										select
										fullWidth
										size="small"
										label="Виджет в UI Schema"
										helperText="Имя компонента темы приложения; если не выбрано — стандартный виджет RJSF по типу поля."
										value={currentWidget ?? ""}
										onChange={(e) => handleWidgetChange(e.target.value)}
									>
										{WIDGET_PRESETS.map((w) => (
											<MenuItem key={w.label + w.value} value={w.value}>
												{w.label}
											</MenuItem>
										))}
									</TextField>

									<Spacer />

									<Button color="error" variant="text" onClick={handleDeleteField}>
										Удалить поле
									</Button>
								</>
							)}
						</Card>

						<Card sx={{ flex: 1.2, minWidth: 300, padding: "10px" }}>
							<EditorSectionTitle
								title="Живое превью анкеты"
								description="Тестовые значения для проверки логики и подписей. Совпадают с данными на вкладке «Логика» для отладки JSON Logic."
							/>
							<Divider sx={{ mb: 2 }} />

							<Form
								schema={previewSchema}
								uiSchema={previewUiSchema}
								formData={formData}
								validator={validatorRu}
								liveValidate
								noHtml5Validate
								showErrorList={false}
								onChange={(evt) =>
									setFormData((evt.formData as Record<string, unknown>) ?? {})
								}
							/>

							<Typography variant="caption" color="text.secondary" display="block">
								Учитываются правила видимости (<code>ui:hidden</code>), условной обязательности и
								подсказок (<code>ui:help</code> из <code>payload</code>) по текущим значениям формы.
							</Typography>
						</Card>
					</Flex>
				</>
			) : null}

			{mainTab === "json" ? (
				<Card sx={{ mb: 2 }}>
					<EditorSectionTitle
						title="Редактор JSON (Monaco)"
						description="Прямое редактирование черновика. После правок нажмите «Применить к черновику», чтобы синхронизировать конструктор и превью."
					/>
					<Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
						<Button variant="contained" onClick={() => syncMonacoApply()}>
							Применить к черновику
						</Button>
						<Button variant="text" onClick={() => reloadMonacoFromState()}>
							Вернуть текст из конструктора
						</Button>
					</Box>
					{monacoError ? <Alert severity="error">{monacoError}</Alert> : null}
					<Box
						sx={{
							display: "flex",
							flexDirection: { xs: "column", md: "row" },
							gap: 2,
						}}
					>
						<Box sx={{ flex: 1 }}>
							<Typography variant="caption" component="p" sx={{ mb: 0.5, fontWeight: 600 }}>
								JSON Schema
							</Typography>
							<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
								Структура полей и ограничения по спецификации JSON Schema.
							</Typography>
							<Editor
								height="340px"
								defaultLanguage="json"
								options={{ minimap: { enabled: false }, wordWrap: "on" }}
								value={schemaMonacoText}
								onChange={(v) => setSchemaMonacoText(v ?? "")}
							/>
						</Box>
						<Box sx={{ flex: 1 }}>
							<Typography variant="caption" component="p" sx={{ mb: 0.5, fontWeight: 600 }}>
								UI Schema
							</Typography>
							<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
								Оформление и виджеты полей для React JSON Schema Form.
							</Typography>
							<Editor
								height="340px"
								defaultLanguage="json"
								options={{ minimap: { enabled: false }, wordWrap: "on" }}
								value={uiMonacoText}
								onChange={(v) => setUiMonacoText(v ?? "")}
							/>
						</Box>
					</Box>
				</Card>
			) : null}

			{mainTab === "logic" ? (
				<Card>
					<Box
						sx={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "flex-start",
							gap: 2,
							mb: 2,
						}}
					>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<EditorSectionTitle
								title="Логика анкеты (JSON Logic)"
								description="Правила видимости, обязательности, вычислений и др. Поле dependencies задаёт порядок вычисления; список путей совпадает с ключами в превью формы."
							/>
						</Box>
						<Button variant="outlined" onClick={() => void addRule()} sx={{ flexShrink: 0 }}>
							Добавить правило
						</Button>
					</Box>

					{cycles.length > 0 ? (
						<Alert severity="warning" sx={{ mb: 2 }}>
							Обнаружены циклы по зависимостям: {cycles.slice(0, 3).join(" · ")}
							{cycles.length > 3 ? "…" : ""}
						</Alert>
					) : (
						<Alert severity="info" sx={{ mb: 2 }}>
							Циклов по списку <code>dependencies</code> не найдено (эвристика по текущим
							правилам).
						</Alert>
					)}

					{logic.rules.length === 0 ? (
						<Typography variant="body2">
							Правила не созданы. Нажмите «Добавить правило», затем задайте условие в
							конструкторе JSON Logic; значения переменных берутся из превью анкеты.
						</Typography>
					) : (
						<Box
							sx={{
								display: "flex",
								flexDirection: { xs: "column", lg: "row" },
								gap: 2,
							}}
						>
							<Box sx={{ flex: "0 0 240px" }}>
								<Typography variant="caption" fontWeight={600} display="block" gutterBottom>
									Выбор правила
								</Typography>
								<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
									Тип правила и целевой путь отображаются в списке.
								</Typography>

								<Select
									fullWidth
									size="small"
									displayEmpty
									value={selectedRule?.id ?? ""}
									onChange={(e) => setSelectedRuleId(String(e.target.value))}
								>
									{logic.rules.map((r) => (
										<MenuItem key={r.id} value={r.id}>
											{ruleKindLabel(r.kind)} → {r.targetPath}
										</MenuItem>
									))}
								</Select>

								<Spacer />

								{selectedRule ? (
									<Flex flexDirection="column" gap={1}>
										<TextField
											select
											size="small"
											label="Тип правила"
											helperText="Семантика срабатывания правила на стороне приложения."
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
											label="Цель правила (JSON Pointer)"
											helperText="Путь к полю или секции, например /section/field."
											fullWidth
											value={selectedRule.targetPath}
											onChange={(e) =>
												updateRulePatch({ targetPath: e.target.value })
											}
										/>

										<TextField
											size="small"
											label="Зависимости (пути через запятую)"
											helperText="Поля, от которых строится условие; совпадают с ключами в данных превью."
											fullWidth
											value={depsDraft}
											onChange={(e) => setDepsDraft(e.target.value)}
											onBlur={handleDepsBlur}
										/>

										<TextField
											size="small"
											label="Комментарий для редакторов"
											helperText="Не уходит в анкету, только для админки."
											fullWidth
											value={selectedRule.description ?? ""}
											onChange={(e) =>
												updateRulePatch({ description: e.target.value })
											}
										/>
										<Flex gap={1}>
											<Button
												size="small"
												variant="outlined"
												onClick={() =>
													updateRulePatch({
														condition: jsonRule.looseEq(jsonRule.var("example"), ""),
													})
												}
											>
												Пример условия
											</Button>
											<Button
												size="small"
												variant="text"
												color="warning"
												onClick={() =>
													setLogic((prev) => ({
														rules: prev.rules.filter((r) => r.id !== selectedRule.id),
													}))
												}
											>
												Удалить правило
											</Button>
										</Flex>
									</Flex>
								) : null}
							</Box>

							<Box sx={{ flex: 2, overflow: "auto", minWidth: 0 }}>
								{selectedRule ? (
									<>
										<EditorSectionTitle
											title="Условие JSON Logic"
											description="Визуальный конструктор выражения; результат ниже считается по текущим данным превью."
										/>
										<StyledJsonLogicShell sx={{ maxHeight: 440, mb: 1 }}>
											<JsonLogicBuilder
												value={(selectedRule.condition ?? true) as JsonLogicValue}
												data={formData}
												onChange={(value) =>
													updateRulePatch({
														condition: value as V2LogicRuleDto["condition"],
													})
												}
											/>
										</StyledJsonLogicShell>

										{previewEvalNote}
									</>
								) : null}
							</Box>
						</Box>
					)}
				</Card>
			) : null}
		</Flex>
	);
};