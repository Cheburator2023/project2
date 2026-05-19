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
	WIDGET_PRESETS,
	ruSchemaTypeLabel,
	ruleKindLabel,
} from "../constants";
import { useSchemaEditor } from "../SchemaEditorContext";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import { PanelChrome } from "../components/PanelChrome";
import { normalizeJsonPointer } from "../../utils/schemaPaths";

export function SchemaPropertiesPanel() {
	const {
		selectedPointer,
		selectedPointerParent: pk,
		resolvedField,
		isRequired,
		currentWidget,
		currentObjectFieldTemplate,
		isObjectGroup,
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
		handleWidgetChange,
		handleDictionaryCodeChange,
		openLogicTabWithRule,
		addRuleForTargetPath,
		setMainTab,
		handleDeleteField,
	} = useSchemaEditor();

	return (
		<PanelChrome
			dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.properties}
			description="JSON Schema и UI Schema выбранного узла."
		>
			{!selectedPointer || !pk ? (
				<Typography variant="body2" color="text.secondary">
					Выберите поле в дереве или на холсте.
				</Typography>
			) : (
				<>
					<Typography variant="caption" color="text.secondary" display="block">
						Путь: <code>{selectedPointer}</code>
					</Typography>
					<Spacer />

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

					<TextField
						select
						fullWidth
						size="small"
						label="Тип JSON Schema"
						value={
							(Array.isArray(resolvedField?.type)
								? resolvedField!.type.join(",")
								: resolvedField?.type) ?? "string"
						}
						onChange={(e) => {
							updateField({
								type: e.target.value as FieldTypePreset,
								...(e.target.value === "object" ? { properties: {} } : {}),
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
						label="Обязательное"
					/>

					<Spacer />

					{isObjectGroup ? (
						<>
							<TextField
								select
								fullWidth
								size="small"
								label="Шаблон группы (ui:ObjectFieldTemplate)"
								value={currentObjectFieldTemplate}
								onChange={(e) => handleObjectFieldTemplateChange(e.target.value)}
								helperText="Определяет внешний вид секции/группы в форме"
							>
								{GROUP_OBJECT_FIELD_TEMPLATE_PRESETS.map((w) => (
									<MenuItem key={`oft-${w.value || "default"}`} value={w.value}>
										{w.label}
									</MenuItem>
								))}
							</TextField>
							<Spacer />
						</>
					) : null}

					<TextField
						select
						fullWidth
						size="small"
						label="Виджет UI Schema"
						value={currentWidget}
						onChange={(e) => handleWidgetChange(e.target.value)}
						helperText={
							isObjectGroup
								? "Дополнительный ui:widget на узле группы (если используется кастомным шаблоном)"
								: undefined
						}
					>
						{WIDGET_PRESETS.map((w) => (
							<MenuItem key={w.label + w.value} value={w.value}>
								{w.label}
							</MenuItem>
						))}
					</TextField>

					{isObjectGroup ? (
						<>
							<Spacer />
							<Typography variant="caption" fontWeight={600}>
								Поля в группе ({groupChildFields.length})
							</Typography>
							{groupChildFields.length === 0 ? (
								<Typography variant="caption" color="text.secondary">
									Пока нет вложенных полей. Перетащите тип поля на холст внутрь
									группы.
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
							) : (
								<Typography variant="caption" color="text.secondary" display="block">
									Стандартная группа без дополнительных ui:options.
								</Typography>
							)}
						</>
					) : null}

					<Divider sx={{ my: 1.5 }} />

					{canBindDictionary ? (
						<TextField
							select
							fullWidth
							size="small"
							label="Справочник"
							value={currentDictionaryCode}
							onChange={(e) => handleDictionaryCodeChange(e.target.value)}
							error={dictionaryBindingMissing}
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
					) : (
						<Typography variant="caption" color="text.secondary">
							Для групп (object) привязка задаётся на вложенных полях.
						</Typography>
					)}

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
