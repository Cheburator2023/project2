import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import type { FieldTypePreset } from "../constants";
import {
	FIELD_PRESETS,
	GROUP_OBJECT_FIELD_TEMPLATE_PRESETS,
	LAYOUT_GRID_COLUMN_OPTIONS,
	ruSchemaTypeLabel,
	ruleKindLabel,
} from "../constants";
import { useSchemaEditor } from "../SchemaEditorContext";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import { PanelChrome } from "../components/PanelChrome";
import { normalizeJsonPointer } from "../../utils/schemaPaths";
import {
	buildDictionaryMultiSchemaPatch,
	patchUiOptionsAtPointer,
	setUiHiddenAtPointer,
} from "../../utils/schemaMutators";
import {
	isV2AnketaHiddenUiNode,
	readV2AnketaSectionUiOptions,
	V2_ANKETA_SECTION_ROLE_VALUES,
	V2_ARCH_COMPONENT_LABELS,
	type V2AnketaSectionRole,
} from "@smart-anketa/api-contract";
import type { UiSchema } from "@rjsf/utils";
import {
	describeArrayItems,
	isDictionaryMultiField,
	isWorkArchComponent,
	readArrayToolbarOptions,
	readLeafUiOptions,
	resolvePropertiesFieldKind,
} from "../propertiesFieldKind";

export function SchemaPropertiesPanel() {
	const {
		selectedPointer,
		selectedPointerParent: pk,
		resolvedField,
		isRequired,
		currentObjectFieldTemplate,
		groupChildFields,
		isCustomUiGroup,
		customUiGroupSummary,
		handleObjectFieldTemplateChange,
		canBindDictionary,
		currentDictionaryCode,
		dictionaryBindingMissing,
		v2Dictionaries,
		rulesForSelectedExact,
		rulesForSelectedSubtree,
		rulesWhereSelectedIsDependency,
		updateField,
		handleToggleRequired,
		handleDictionaryCodeChange,
		openLogicTabWithRule,
		addRuleForTargetPath,
		setMainTab,
		handleDeleteField,
		uiSchema,
		setUiSchema,
		monacoError,
	} = useSchemaEditor();

	const leafUiBranch =
		selectedPointer && uiSchema
			? (() => {
					const segs = normalizeJsonPointer(selectedPointer)
						.replace(/^\//, "")
						.split("/")
						.filter(Boolean);
					let cur: Record<string, unknown> = uiSchema as Record<
						string,
						unknown
					>;
					for (const seg of segs) {
						const next = cur[seg];
						if (!next || typeof next !== "object" || Array.isArray(next)) {
							return undefined;
						}
						cur = next as Record<string, unknown>;
					}
					return cur;
				})()
			: undefined;

	const leafUiOptions = readLeafUiOptions(leafUiBranch);
	const sectionUiOptions = readV2AnketaSectionUiOptions(leafUiBranch);
	const archComponent = sectionUiOptions.archComponent ?? null;
	const uiWidget =
		typeof leafUiBranch?.["ui:widget"] === "string"
			? leafUiBranch["ui:widget"]
			: undefined;
	const fieldKind = resolvePropertiesFieldKind(
		resolvedField,
		archComponent,
		leafUiOptions,
		uiWidget,
	);
	const dictionaryMultiple = leafUiOptions?.multiple === true;
	const layoutGridColumns =
		typeof leafUiOptions?.gridColumns === "number"
			? leafUiOptions.gridColumns
			: 2;
	const isHiddenInForm = isV2AnketaHiddenUiNode(leafUiBranch);
	const arrayToolbar = readArrayToolbarOptions(leafUiBranch);
	const arrayItemsLabel = describeArrayItems(resolvedField);
	const isReadonlyArray = resolvedField?.readOnly === true;

	const patchSectionUi = (patch: Record<string, unknown>) => {
		if (!selectedPointer) return;
		setUiSchema(
			(prev) =>
				patchUiOptionsAtPointer(
					prev as Record<string, unknown>,
					selectedPointer,
					patch,
				) as UiSchema,
		);
	};

	const showObjectLayout =
		fieldKind === "object" || fieldKind === "arch-object";
	const showLayoutOptions = fieldKind === "layout";
	const showArrayOptions =
		fieldKind === "array" || fieldKind === "arch-array";
	const workArch = isWorkArchComponent(archComponent);

	return (
		<PanelChrome
			dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.properties}
			description="JSON Schema и UI Schema выбранного узла."
		>
			{monacoError ? (
				<Alert severity="error" sx={{ mb: 1 }}>
					{monacoError}
				</Alert>
			) : null}
			{!selectedPointer || !pk ? (
				<Typography variant="body2" color="text.secondary">
					Выберите поле в дереве или на холсте.
				</Typography>
			) : (
				<>
					<Flex alignItems="center" justifyContent="space-between" gap={1}>
						<Typography variant="caption" color="text.secondary">
							Путь: <code>{selectedPointer}</code>
						</Typography>
						<Button
							size="small"
							color="error"
							variant="outlined"
							startIcon={<DeleteOutlineIcon fontSize="small" />}
							onClick={() => handleDeleteField()}
							sx={{ flexShrink: 0 }}
						>
							Удалить
						</Button>
					</Flex>
					<Spacer />

					{archComponent ? (
						<>
							<Typography variant="caption" color="text.secondary" display="block">
								Тип блока
							</Typography>
							<Chip
								size="small"
								label={V2_ARCH_COMPONENT_LABELS[archComponent]}
								sx={{ mb: 1 }}
							/>
						</>
					) : null}

					<TextField
						fullWidth
						size="small"
						label="Подпись (title)"
						value={resolvedField?.title ?? ""}
						onChange={(e) => updateField({ title: e.target.value })}
					/>
					<Spacer />

					<TextField
						fullWidth
						size="small"
						multiline
						minRows={2}
						label="Описание"
						value={(resolvedField?.description as string) ?? ""}
						onChange={(e) => updateField({ description: e.target.value })}
					/>
					<Spacer />

					{fieldKind === "primitive" ? (
						isDictionaryMultiField(resolvedField, leafUiOptions) ? (
							<TextField
								fullWidth
								size="small"
								label="Тип поля"
								value="Справочник (множественный выбор)"
								disabled
							/>
						) : (
							<TextField
								select
								fullWidth
								size="small"
								label="Тип поля"
								value={
									(Array.isArray(resolvedField?.type)
										? resolvedField!.type.join(",")
										: resolvedField?.type) ?? "string"
								}
								onChange={(e) => {
									updateField({ type: e.target.value as FieldTypePreset });
								}}
								helperText="integer — целые; number — дробные. При смене типа несовместимые ключи удаляются."
							>
								{FIELD_PRESETS.filter((fp) =>
									["string", "number", "integer", "boolean"].includes(
										fp.id as string,
									),
								).map((fp) => (
									<MenuItem key={`${fp.id}`} value={`${fp.id}`}>
										{fp.title}
									</MenuItem>
								))}
							</TextField>
						)
					) : showArrayOptions ? (
						<TextField
							fullWidth
							size="small"
							label="Тип поля"
							value="Массив (список)"
							disabled
							helperText={
								arrayItemsLabel
									? `Элемент списка: ${arrayItemsLabel}`
									: undefined
							}
						/>
					) : showLayoutOptions ? (
						<TextField
							fullWidth
							size="small"
							label="Тип поля"
							value="Разметка (сетка полей)"
							disabled
						/>
					) : fieldKind === "general-uncertainty" ? (
						<TextField
							fullWidth
							size="small"
							label="Тип поля"
							value="Расчёт общей неопределённости"
							disabled
							helperText="Виджет GeneralUncertaintyWidget — участвует в калькуляции анкеты"
						/>
					) : showObjectLayout ? (
						<TextField
							fullWidth
							size="small"
							label="Тип поля"
							value="Группа (object)"
							disabled
						/>
					) : null}

					<Spacer />

					<FormControlLabel
						control={
							<Checkbox
								checked={isRequired}
								onChange={(e) => handleToggleRequired(e.target.checked)}
							/>
						}
						label="Обязательное"
					/>

					<Spacer />

					<FormControlLabel
						control={
							<Checkbox
								checked={isHiddenInForm}
								onChange={(e) => {
									if (!selectedPointer) return;
									setUiSchema(
										(prev) =>
											setUiHiddenAtPointer(
												prev as Record<string, unknown>,
												selectedPointer,
												e.target.checked,
											) as UiSchema,
									);
								}}
							/>
						}
						label="Скрыть в форме анкеты"
					/>
					<Typography
						variant="caption"
						color="text.secondary"
						display="block"
						sx={{ mt: -0.5, mb: 1 }}
					>
						Поле не показывается в превью и анкете; на холсте — чип «Скрыто».
					</Typography>

					{showLayoutOptions ? (
						<>
							<Spacer />
							<TextField
								select
								fullWidth
								size="small"
								label="Колонки сетки"
								value={layoutGridColumns}
								onChange={(e) =>
									patchSectionUi({
										gridColumns: Number(e.target.value),
									})
								}
								helperText="Число колонок для вложенных полей в превью и анкете"
							>
								{LAYOUT_GRID_COLUMN_OPTIONS.map((opt) => (
									<MenuItem key={opt.value} value={opt.value}>
										{opt.label}
									</MenuItem>
								))}
							</TextField>
							<Spacer />
							<Typography variant="caption" fontWeight={600}>
								Поля в разметке ({groupChildFields.length})
							</Typography>
							{groupChildFields.length === 0 ? (
								<Typography variant="caption" color="text.secondary">
									Перетащите поля внутрь блока разметки на холсте.
								</Typography>
							) : (
								<Box component="ul" sx={{ m: 0, pl: 2.5, mb: 1 }}>
									{groupChildFields.map((child) => (
										<Box component="li" key={child.key} sx={{ mb: 0.5 }}>
											<Typography variant="body2" component="span">
												{child.title}
											</Typography>
											<Typography
												variant="caption"
												color="text.secondary"
												sx={{ ml: 0.5 }}
											>
												({child.key} · {ruSchemaTypeLabel(child.typeLabel)})
											</Typography>
										</Box>
									))}
								</Box>
							)}
						</>
					) : null}

					{showObjectLayout ? (
						<>
							<Spacer />
							<TextField
								select
								fullWidth
								size="small"
								label="Шаблон группы (ui:ObjectFieldTemplate)"
								value={currentObjectFieldTemplate}
								onChange={(e) => handleObjectFieldTemplateChange(e.target.value)}
								helperText="Внешний вид секции в форме"
							>
								{GROUP_OBJECT_FIELD_TEMPLATE_PRESETS.map((w) => (
									<MenuItem key={`oft-${w.value || "default"}`} value={w.value}>
										{w.label}
									</MenuItem>
								))}
							</TextField>
							<Spacer />
							<TextField
								select
								fullWidth
								size="small"
								label="Роль секции"
								value={sectionUiOptions.sectionRole ?? ""}
								onChange={(e) =>
									patchSectionUi({
										sectionRole: (e.target.value ||
											undefined) as V2AnketaSectionRole,
									})
								}
								helperText="main — главная панель; subsection — подсекция стрима"
							>
								<MenuItem value="">
									<em>Авто</em>
								</MenuItem>
								{V2_ANKETA_SECTION_ROLE_VALUES.map((role) => (
									<MenuItem key={role} value={role}>
										{role}
									</MenuItem>
								))}
							</TextField>
							<Spacer />
							<FormControlLabel
								control={
									<Checkbox
										checked={sectionUiOptions.defaultExpanded ?? false}
										onChange={(e) =>
											patchSectionUi({
												defaultExpanded: e.target.checked,
											})
										}
									/>
								}
								label="Развёрнута по умолчанию"
							/>
							{fieldKind === "arch-object" ? (
								<>
									<Spacer />
									<FormControlLabel
										control={
											<Checkbox
												checked={sectionUiOptions.showFilledCount ?? false}
												onChange={(e) =>
													patchSectionUi({
														showFilledCount: e.target.checked,
													})
												}
											/>
										}
										label="Счётчик заполненных в заголовке"
									/>
								</>
							) : null}
							<Spacer />
							{(sectionUiOptions.sectionRole ?? "") === "main" ||
							sectionUiOptions.workflowSectionId ? (
								<>
									<TextField
										fullWidth
										size="small"
										label="Подпись под заголовком (sectionCaption)"
										value={sectionUiOptions.sectionCaption ?? ""}
										onChange={(e) =>
											patchSectionUi({
												sectionCaption: e.target.value.trim() || undefined,
											})
										}
									/>
									<Spacer />
								</>
							) : null}
							<Typography variant="caption" fontWeight={600}>
								Поля в группе ({groupChildFields.length})
							</Typography>
							{groupChildFields.length === 0 ? (
								<Typography variant="caption" color="text.secondary">
									Перетащите поле внутрь группы на холсте.
								</Typography>
							) : (
								<Box component="ul" sx={{ m: 0, pl: 2.5, mb: 1 }}>
									{groupChildFields.map((child) => (
										<Box component="li" key={child.key} sx={{ mb: 0.5 }}>
											<Typography variant="body2" component="span">
												{child.title}
											</Typography>
											<Typography
												variant="caption"
												color="text.secondary"
												sx={{ ml: 0.5 }}
											>
												({child.key} · {ruSchemaTypeLabel(child.typeLabel)})
											</Typography>
										</Box>
									))}
								</Box>
							)}
							{isCustomUiGroup ? (
								<Typography variant="caption" color="info.main" display="block">
									Кастомная UI-конфигурация: {customUiGroupSummary}
								</Typography>
							) : null}
						</>
					) : null}

					{showArrayOptions ? (
						<>
							<Spacer />
							<Typography variant="caption" fontWeight={600} display="block">
								Список
							</Typography>
							<FormControlLabel
								control={
									<Checkbox
										checked={isReadonlyArray}
										onChange={(e) =>
											updateField({ readOnly: e.target.checked || undefined })
										}
									/>
								}
								label="Только чтение (schema.readOnly)"
							/>
							<FormControlLabel
								control={
									<Checkbox
										checked={arrayToolbar.addable ?? true}
										disabled={
											isReadonlyArray ||
											(workArch && archComponent === "typicalWork")
										}
										onChange={(e) =>
											patchSectionUi({ addable: e.target.checked })
										}
									/>
								}
								label="Можно добавлять строки"
							/>
							<FormControlLabel
								control={
									<Checkbox
										checked={arrayToolbar.removable ?? true}
										disabled={
											isReadonlyArray ||
											(workArch && archComponent === "typicalWork")
										}
										onChange={(e) =>
											patchSectionUi({ removable: e.target.checked })
										}
									/>
								}
								label="Можно удалять строки"
							/>
							<FormControlLabel
								control={
									<Checkbox
										checked={arrayToolbar.orderable ?? false}
										disabled={isReadonlyArray}
										onChange={(e) =>
											patchSectionUi({ orderable: e.target.checked })
										}
									/>
								}
								label="Можно менять порядок строк"
							/>
							{workArch && archComponent === "typicalWork" ? (
								<Typography variant="caption" color="text.secondary" display="block">
									Типовые работы генерируются автоматически — добавление и
									удаление отключены.
								</Typography>
							) : null}
						</>
					) : null}

					<Divider sx={{ my: 1.5 }} />

					{canBindDictionary ? (
						<>
							<TextField
								select
								fullWidth
								size="small"
								label="Справочник"
								value={currentDictionaryCode}
								onChange={(e) => handleDictionaryCodeChange(e.target.value)}
								error={dictionaryBindingMissing}
								helperText="В форме поле отображается как выпадающий список значений справочника"
							>
								<MenuItem value="">
									<em>Не привязан</em>
								</MenuItem>
								{v2Dictionaries.map((d) => (
									<MenuItem key={d.id} value={d.code}>
										{d.code} — {d.name}
									</MenuItem>
								))}
							</TextField>
							{currentDictionaryCode ? (
								<FormControlLabel
									sx={{ mt: 0.5, display: "block" }}
									control={
										<Checkbox
											checked={dictionaryMultiple}
											onChange={(e) => {
												const checked = e.target.checked;
												patchSectionUi({
													multiple: checked || undefined,
												});
												updateField(
													buildDictionaryMultiSchemaPatch(checked),
												);
											}}
										/>
									}
									label="Множественный выбор"
								/>
							) : null}
						</>
					) : fieldKind === "primitive" ? (
						<Typography variant="caption" color="text.secondary">
							Справочники доступны только для полей типа «строка».
						</Typography>
					) : fieldKind === "object" ||
					  fieldKind === "arch-object" ||
					  fieldKind === "layout" ? (
						<Typography variant="caption" color="text.secondary">
							Справочник задаётся на вложенных строковых полях группы.
						</Typography>
					) : null}

					<Divider sx={{ my: 1.5 }} />

					<Typography variant="caption" fontWeight={600}>
						Влияет на это поле ({rulesForSelectedExact.length})
					</Typography>
					<Flex gap={0.5} sx={{ flexWrap: "wrap", mb: 1 }}>
						{rulesForSelectedExact.length === 0 ? (
							<Typography variant="caption" color="text.secondary">
								Правил, меняющих это поле, нет.
							</Typography>
						) : null}
						{rulesForSelectedExact.map((r) => (
							<Chip
								key={r.id}
								size="small"
								variant="outlined"
								label={`${ruleKindLabel(r.kind)}${
									r.description ? ` · ${r.description}` : ""
								}`}
								onClick={() => openLogicTabWithRule(r.id)}
							/>
						))}
					</Flex>

					<Typography variant="caption" fontWeight={600}>
						Зависят от этого поля ({rulesWhereSelectedIsDependency.length})
					</Typography>
					<Flex gap={0.5} sx={{ flexWrap: "wrap", mb: 1 }}>
						{rulesWhereSelectedIsDependency.length === 0 ? (
							<Typography variant="caption" color="text.secondary">
								Поле не используется как источник в правилах.
							</Typography>
						) : null}
						{rulesWhereSelectedIsDependency.map((r) => (
							<Chip
								key={r.id}
								size="small"
								variant="outlined"
								color="info"
								label={`${ruleKindLabel(r.kind)} → ${normalizeJsonPointer(
									r.targetPath,
								)}`}
								onClick={() => openLogicTabWithRule(r.id)}
							/>
						))}
					</Flex>

					{resolvedField?.type === "object" ? (
						<>
							<Typography variant="caption" fontWeight={600}>
								Правила на вложенные ({rulesForSelectedSubtree.length})
							</Typography>
							<Flex gap={0.5} sx={{ flexWrap: "wrap", mb: 1 }}>
								{rulesForSelectedSubtree.map((r) => (
									<Chip
										key={r.id}
										size="small"
										variant="outlined"
										color="secondary"
										label={`${ruleKindLabel(r.kind)} → ${normalizeJsonPointer(r.targetPath)}`}
										onClick={() => openLogicTabWithRule(r.id)}
									/>
								))}
							</Flex>
						</>
					) : null}

					<Button
						size="small"
						variant="outlined"
						onClick={() => {
							if (!selectedPointer) return;
							addRuleForTargetPath(selectedPointer);
							setMainTab("logic");
						}}
					>
						Добавить правило
					</Button>
				</>
			)}
		</PanelChrome>
	);
}
