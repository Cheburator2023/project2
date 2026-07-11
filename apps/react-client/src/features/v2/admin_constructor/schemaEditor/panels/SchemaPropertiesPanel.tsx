import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { FuzzyAutocomplete } from "@react-client/common/muiCustom/FuzzyAutocomplete";
import { Flex } from "@react-client/common/primitives/Flex";
import type { V2DictionaryDto } from "@smart-anketa/api-contract";
import type { FieldTypePreset, PrimitiveFieldTypeVariant } from "../constants";
import {
	LAYOUT_GRID_COLUMN_OPTIONS,
	PRIMITIVE_FIELD_TYPE_OPTIONS,
	ruSchemaTypeLabel,
	ruleKindLabel,
} from "../constants";
import { useSchemaEditor } from "../SchemaEditorContext";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import { PanelChrome } from "../components/PanelChrome";
import { normalizeJsonPointer, pointerSegments } from "../../utils/schemaPaths";
import {
	buildDictionaryMultiSchemaPatch,
	clearDictionaryFieldBindingAtPointer,
	patchUiOptionsAtPointer,
	setUiHiddenAtPointer,
	setUiPlaceholderAtPointer,
	setUiTooltipAtPointer,
	setUiWidgetAtPointer,
	syncDictionaryFieldUiAtPointer,
} from "../../utils/schemaMutators";
import {
	isExecutorStreamPresentInSchema,
	isV2AnketaHiddenUiNode,
	readV2AnketaSectionUiOptions,
	resolveStreamExecutorForTypicalWorkOutputPath,
	resolveV2AnketaStreamBlockOptions,
	V2_ANKETA_MAIN_SECTION_IDS,
	V2_ANKETA_MAIN_SECTION_TITLES,
	V2_ANKETA_SECTION_ROLE_VALUES,
	V2_ARCH_COMPONENT_LABELS,
	V2_EXECUTOR_STREAM_LABELS,
	V2_EXECUTOR_STREAMS_DICTIONARY_CODE,
	type V2AnketaMainSectionId,
	type V2AnketaSectionRole,
	type V2ExecutorStreamLabel,
} from "@smart-anketa/api-contract";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "react-router";
import { useV2TypicalWorksList } from "@react-client/common/api/queries/v2-works";
import {
	BIND_POINTER_QUERY,
	LOGIC_TAB_QUERY,
	NEW_WORK_QUERY,
	WORK_ID_QUERY,
} from "./typicalWorksPanel/typicalWorksUi";
import {
	appendBoundWorkIdAtPointer,
	pointerToOutputPath,
	readBoundWorkIdsAtPointer,
	removeBoundWorkIdAtPointer,
	resolveTypicalWorkDisplayBoundIds,
	filterTypicalWorksForStreamExecutor,
} from "../typicalWorkBlockBinding";
import { listCanvasEditableChildKeys } from "../schemaCanvasTree";
import {
	makeStreamBlockJsonSchema,
	makeStreamBlockUiOptions,
} from "../streamBlockHelpers";
import {
	ExecutorStreamPresenceHint,
	ExecutorStreamPresenceLabel,
} from "./typicalWorksPanel/ExecutorStreamPresenceLabel";
import { toast } from "@react-client/common/toasts";
import { useBufferedDraftText } from "../hooks/useBufferedDraftText";
import { usePropertiesPanelWidth } from "../hooks/usePropertiesPanelWidth";
import {
	describeArrayItems,
	isWorkArchComponent,
	readArrayToolbarOptions,
	readLeafUiOptions,
	resolveArchComponentAtPointer,
	resolvePrimitiveFieldTypeVariant,
	resolvePropertiesFieldKind,
} from "../propertiesFieldKind";
import { readUiSchemaBranchAtPointer } from "../../utils/schemaMutators";
import {
	buildSchemaWorkParameters,
	schemaParamIdFromPointer,
} from "./typicalWorksPanel/schemaWorkParameters";

async function copyTextToClipboard(text: string, label: string) {
	try {
		await navigator.clipboard.writeText(text);
		toast.success(`${label} скопирован`);
	} catch {
		toast.error(`Не удалось скопировать ${label.toLowerCase()}`);
	}
}

function PropertiesSection({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<Box sx={{ mb: 2 }}>
			<Typography
				variant="overline"
				color="text.secondary"
				sx={{
					display: "block",
					letterSpacing: 0.6,
					lineHeight: 1.6,
					mb: 1,
				}}
			>
				{title}
			</Typography>
			<Stack gap={1.25}>{children}</Stack>
		</Box>
	);
}

function GroupChildFieldsList({
	fields,
	emptyHint,
	onSelectField,
}: {
	fields: Array<{ key: string; title: string; typeLabel: string }>;
	emptyHint: string;
	onSelectField?: (key: string) => void;
}) {
	if (fields.length === 0) {
		return (
			<Typography variant="caption" color="text.secondary">
				{emptyHint}
			</Typography>
		);
	}
	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
			{fields.map((child) => (
				<Box
					key={child.key}
					onClick={
						onSelectField
							? () => {
									onSelectField(child.key);
								}
							: undefined
					}
					sx={
						onSelectField
							? {
									cursor: "pointer",
									borderRadius: 0.5,
									px: 0.5,
									mx: -0.5,
									"&:hover": { bgcolor: "action.hover" },
								}
							: undefined
					}
				>
					<Typography variant="body2" component="span">
						{child.title}
					</Typography>
					<Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
						({child.key} · {ruSchemaTypeLabel(child.typeLabel)})
					</Typography>
				</Box>
			))}
		</Box>
	);
}

function FieldTypeControl({
	fieldKind,
	primitiveTypeVariant,
	onPrimitiveTypeChange,
	arrayItemsLabel,
}: {
	fieldKind: ReturnType<typeof resolvePropertiesFieldKind>;
	primitiveTypeVariant: PrimitiveFieldTypeVariant;
	onPrimitiveTypeChange: (variant: PrimitiveFieldTypeVariant) => void;
	arrayItemsLabel: string | null;
}) {
	if (fieldKind === "primitive") {
		return (
			<TextField
				select
				fullWidth
				size="small"
				label="Тип поля"
				value={primitiveTypeVariant}
				onChange={(e) =>
					onPrimitiveTypeChange(e.target.value as PrimitiveFieldTypeVariant)
				}
				helperText="Мультисправочник — мультиселект; textarea — многострочное поле; при смене типа привязка справочника сбрасывается."
			>
				{PRIMITIVE_FIELD_TYPE_OPTIONS.map((option) => (
					<MenuItem key={option.id} value={option.id}>
						{option.title}
					</MenuItem>
				))}
			</TextField>
		);
	}
	if (fieldKind === "array" || fieldKind === "arch-array") {
		return (
			<TextField
				fullWidth
				size="small"
				label="Тип поля"
				value="Массив (список)"
				disabled
				helperText={
					arrayItemsLabel ? `Элемент списка: ${arrayItemsLabel}` : undefined
				}
			/>
		);
	}
	if (fieldKind === "layout") {
		return (
			<TextField
				fullWidth
				size="small"
				label="Тип поля"
				value="Разметка (сетка полей)"
				disabled
			/>
		);
	}
	if (fieldKind === "general-uncertainty") {
		return (
			<TextField
				fullWidth
				size="small"
				label="Тип поля"
				value="Расчёт общей неопределённости"
				disabled
				helperText="Кнопка открывает модалку расчёта; данные сохраняются в uncertaintyCalculation"
			/>
		);
	}
	if (fieldKind === "object" || fieldKind === "arch-object") {
		return (
			<TextField
				fullWidth
				size="small"
				label="Тип поля"
				value="Группа (object)"
				disabled
			/>
		);
	}
	return null;
}

/** Правая колонка конструктора: заголовок + ресайз за левый край. */
export function SchemaPropertiesPanelColumn({ header }: { header: ReactNode }) {
	const { width, isResizing, onResizeStart } = usePropertiesPanelWidth();

	return (
		<Box
			data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.panelProperties}
			sx={{
				position: "relative",
				flexShrink: 0,
				width,
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
				borderLeft: 1,
				borderColor: "divider",
				bgcolor: "background.default",
			}}
		>
			<Box
				role="separator"
				aria-orientation="vertical"
				aria-label="Изменить ширину панели свойств"
				title="Потяните, чтобы изменить ширину"
				onMouseDown={onResizeStart}
				sx={{
					position: "absolute",
					left: 0,
					top: 0,
					bottom: 0,
					width: 10,
					transform: "translateX(-50%)",
					cursor: "col-resize",
					zIndex: 2,
					"&:hover": {
						"&::after": {
							opacity: 0.35,
						},
					},
					"&::after": {
						content: '""',
						position: "absolute",
						left: "50%",
						top: 0,
						bottom: 0,
						width: 2,
						transform: "translateX(-50%)",
						borderRadius: 1,
						bgcolor: "primary.main",
						opacity: isResizing ? 0.45 : 0,
						transition: "opacity 0.15s",
					},
				}}
			/>
			{header}
			<Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
				<SchemaPropertiesPanel />
			</Box>
		</Box>
	);
}

export function SchemaPropertiesPanel() {
	const {
		selectedPointer,
		setSelectedPointer,
		selectedPointerParent: pk,
		resolvedField,
		isRequired,
		groupChildFields,
		hasArrayObjectItems,
		arrayItemChildFields,
		isCustomUiGroup,
		customUiGroupSummary,
		canBindDictionary,
		currentDictionaryCode,
		dictionaryBindingMissing,
		v2Dictionaries,
		rulesForSelectedExact,
		rulesForSelectedSubtree,
		rulesWhereSelectedIsDependency,
		recordDraftHistory,
		updateField,
		patchUiSchema,
		handleToggleRequired,
		handleDictionaryCodeChange,
		openLogicTabWithRule,
		addRuleForTargetPath,
		setMainTab,
		openLogicTabWithTriggerParam,
		fieldPathHints,
		enumMapByCode,
		uiSchema,
		jsonSchema,
		handleAddFieldPresetAtParent,
		monacoError,
	} = useSchemaEditor();

	const leafUiBranch = useMemo(
		() =>
			selectedPointer && uiSchema
				? readUiSchemaBranchAtPointer(
						uiSchema as Record<string, unknown>,
						selectedPointer,
					)
				: undefined,
		[selectedPointer, uiSchema],
	);

	const leafUiOptions = useMemo(
		() => readLeafUiOptions(leafUiBranch),
		[leafUiBranch],
	);
	const sectionUiOptions = useMemo(
		() => readV2AnketaSectionUiOptions(leafUiBranch),
		[leafUiBranch],
	);
	const archComponent = useMemo(
		() => resolveArchComponentAtPointer(uiSchema, selectedPointer ?? ""),
		[uiSchema, selectedPointer],
	);
	const isTypicalWorkBlock = archComponent === "typicalWork";
	const { templateId = "" } = useParams<{ templateId: string }>();
	const [, setSearchParams] = useSearchParams();
	const { data: typicalWorksData } = useV2TypicalWorksList({
		templateId: isTypicalWorkBlock ? templateId : null,
	});
	const typicalWorks = typicalWorksData?.items ?? [];
	const typicalWorkCatalog = useMemo(
		() =>
			typicalWorks.map((work) => ({
				id: work.id,
				streams: work.streams ?? [],
			})),
		[typicalWorks],
	);
	const typicalWorkOutputPath = useMemo(
		() => (selectedPointer ? pointerToOutputPath(selectedPointer) : ""),
		[selectedPointer],
	);
	const typicalWorkStreamExecutor = useMemo(() => {
		if (!isTypicalWorkBlock || !typicalWorkOutputPath) return "";
		return (
			sectionUiOptions.streamExecutor ??
			resolveStreamExecutorForTypicalWorkOutputPath(
				uiSchema,
				typicalWorkOutputPath,
			) ??
			""
		);
	}, [
		isTypicalWorkBlock,
		typicalWorkOutputPath,
		sectionUiOptions.streamExecutor,
		uiSchema,
	]);
	const boundWorkIds = useMemo(
		() =>
			selectedPointer && isTypicalWorkBlock
				? resolveTypicalWorkDisplayBoundIds(
						uiSchema,
						selectedPointer,
						typicalWorkCatalog,
						typicalWorkStreamExecutor,
					)
				: [],
		[
			selectedPointer,
			isTypicalWorkBlock,
			uiSchema,
			typicalWorkCatalog,
			typicalWorkStreamExecutor,
		],
	);
	const explicitBoundWorkIds = useMemo(
		() =>
			selectedPointer && isTypicalWorkBlock
				? readBoundWorkIdsAtPointer(uiSchema, selectedPointer)
				: undefined,
		[selectedPointer, isTypicalWorkBlock, uiSchema],
	);
	const boundTypicalWorks = useMemo(
		() => typicalWorks.filter((work) => boundWorkIds.includes(work.id)),
		[typicalWorks, boundWorkIds],
	);
	const streamScopedTypicalWorks = useMemo(
		() =>
			filterTypicalWorksForStreamExecutor(
				typicalWorkCatalog,
				typicalWorkStreamExecutor,
			)
				.map((item) => typicalWorks.find((work) => work.id === item.id))
				.filter((work): work is (typeof typicalWorks)[number] => Boolean(work)),
		[typicalWorkCatalog, typicalWorkStreamExecutor, typicalWorks],
	);
	const unboundTypicalWorks = useMemo(() => {
		if (explicitBoundWorkIds !== undefined) {
			return streamScopedTypicalWorks.filter(
				(work) => !explicitBoundWorkIds.includes(work.id),
			);
		}
		return [];
	}, [explicitBoundWorkIds, streamScopedTypicalWorks]);
	const typicalWorkStreamPresent = useMemo(
		() =>
			typicalWorkStreamExecutor
				? isExecutorStreamPresentInSchema(uiSchema, typicalWorkStreamExecutor)
				: false,
		[typicalWorkStreamExecutor, uiSchema],
	);
	const handleCreateTypicalWorkStreamBlock = useCallback(() => {
		if (!typicalWorkStreamExecutor) return;
		if (
			!V2_EXECUTOR_STREAM_LABELS.includes(
				typicalWorkStreamExecutor as V2ExecutorStreamLabel,
			)
		) {
			return;
		}
		const stream = typicalWorkStreamExecutor as V2ExecutorStreamLabel;
		const rootCount = listCanvasEditableChildKeys(
			jsonSchema,
			"/",
			uiSchema,
		).length;
		handleAddFieldPresetAtParent(
			"/",
			makeStreamBlockJsonSchema(stream),
			rootCount,
			makeStreamBlockUiOptions(stream),
		);
		toast.success(`Добавлен стримовый блок «${stream}»`);
	}, [
		typicalWorkStreamExecutor,
		jsonSchema,
		uiSchema,
		handleAddFieldPresetAtParent,
	]);
	const openTypicalWorksTab = useCallback(
		(workId?: string, opts?: { create?: boolean }) => {
			setSearchParams((prev) => {
				const next = new URLSearchParams(prev);
				next.set(LOGIC_TAB_QUERY, "works");
				if (workId) next.set(WORK_ID_QUERY, workId);
				else next.delete(WORK_ID_QUERY);
				if (opts?.create) next.set(NEW_WORK_QUERY, "1");
				else next.delete(NEW_WORK_QUERY);
				if (opts?.create && selectedPointer) {
					next.set(BIND_POINTER_QUERY, selectedPointer);
				} else {
					next.delete(BIND_POINTER_QUERY);
				}
				return next;
			});
			setMainTab("logic");
		},
		[setSearchParams, setMainTab, selectedPointer],
	);
	const uiWidget = useMemo(
		() =>
			typeof leafUiBranch?.["ui:widget"] === "string"
				? leafUiBranch["ui:widget"]
				: undefined,
		[leafUiBranch],
	);
	const fieldKind = useMemo(
		() =>
			resolvePropertiesFieldKind(
				resolvedField,
				archComponent,
				leafUiOptions,
				uiWidget,
			),
		[resolvedField, archComponent, leafUiOptions, uiWidget],
	);
	const dictionaryMultiple = leafUiOptions?.multiple === true;
	const primitiveTypeVariant = useMemo(
		() =>
			resolvePrimitiveFieldTypeVariant(resolvedField, leafUiOptions, uiWidget),
		[resolvedField, leafUiOptions, uiWidget],
	);

	const commitFieldPatch = useCallback(
		(patch: Partial<RJSFSchema>) =>
			updateField(patch, { recordHistory: false }),
		[updateField],
	);

	const handlePrimitiveTypeChange = useCallback(
		(nextVariant: PrimitiveFieldTypeVariant) => {
			if (!selectedPointer) return;
			recordDraftHistory();

			if (nextVariant === "dictionary-list") {
				patchUiSchema(
					(prev) =>
						syncDictionaryFieldUiAtPointer(
							prev as Record<string, unknown>,
							selectedPointer,
							{ multiple: true },
						) as UiSchema,
					{ recordHistory: false },
				);
				updateField(buildDictionaryMultiSchemaPatch(true), {
					recordHistory: false,
				});
				return;
			}

			if (nextVariant === "string-dictionary") {
				if (primitiveTypeVariant === "dictionary-list") {
					patchUiSchema(
						(prev) =>
							syncDictionaryFieldUiAtPointer(
								prev as Record<string, unknown>,
								selectedPointer,
								{ multiple: false },
							) as UiSchema,
						{ recordHistory: false },
					);
					updateField(buildDictionaryMultiSchemaPatch(false), {
						recordHistory: false,
					});
				} else if (
					primitiveTypeVariant === "integer" ||
					primitiveTypeVariant === "number" ||
					primitiveTypeVariant === "boolean"
				) {
					patchUiSchema(
						(prev) =>
							clearDictionaryFieldBindingAtPointer(
								prev as Record<string, unknown>,
								selectedPointer,
							) as UiSchema,
						{ recordHistory: false },
					);
					updateField({ type: "string" }, { recordHistory: false });
				} else if (primitiveTypeVariant === "string-textarea") {
					patchUiSchema(
						(prev) =>
							setUiWidgetAtPointer(
								clearDictionaryFieldBindingAtPointer(
									prev as Record<string, unknown>,
									selectedPointer,
								),
								selectedPointer,
								null,
							) as UiSchema,
						{ recordHistory: false },
					);
				}
				return;
			}

			if (nextVariant === "string-textarea") {
				patchUiSchema(
					(prev) =>
						setUiWidgetAtPointer(
							clearDictionaryFieldBindingAtPointer(
								prev as Record<string, unknown>,
								selectedPointer,
							),
							selectedPointer,
							"textarea",
						) as UiSchema,
					{ recordHistory: false },
				);
				updateField(buildDictionaryMultiSchemaPatch(false), {
					recordHistory: false,
				});
				updateField({ type: "string" }, { recordHistory: false });
				return;
			}

			patchUiSchema(
				(prev) =>
					clearDictionaryFieldBindingAtPointer(
						prev as Record<string, unknown>,
						selectedPointer,
					) as UiSchema,
				{ recordHistory: false },
			);
			updateField(buildDictionaryMultiSchemaPatch(false), {
				recordHistory: false,
			});
			updateField(
				{ type: nextVariant as FieldTypePreset },
				{
					recordHistory: false,
				},
			);
		},
		[
			selectedPointer,
			recordDraftHistory,
			patchUiSchema,
			updateField,
			primitiveTypeVariant,
		],
	);

	const layoutGridColumns =
		typeof leafUiOptions?.gridColumns === "number"
			? leafUiOptions.gridColumns
			: 2;
	const layoutHideTitle = leafUiOptions?.hideTitle !== false;
	const isHiddenInForm = isV2AnketaHiddenUiNode(leafUiBranch);
	const arrayToolbar = readArrayToolbarOptions(leafUiBranch);
	const arrayItemsLabel = describeArrayItems(resolvedField);
	const isReadonlyArray = resolvedField?.readOnly === true;
	const uiPlaceholder =
		typeof leafUiBranch?.["ui:placeholder"] === "string"
			? leafUiBranch["ui:placeholder"]
			: "";
	const uiTooltip =
		typeof leafUiOptions?.tooltip === "string" ? leafUiOptions.tooltip : "";

	const patchSectionUi = useCallback(
		(patch: Record<string, unknown>) => {
			if (!selectedPointer) return;
			patchUiSchema(
				(prev) =>
					patchUiOptionsAtPointer(
						prev as Record<string, unknown>,
						selectedPointer,
						patch,
					) as UiSchema,
			);
		},
		[patchUiSchema, selectedPointer],
	);

	const titleDraft = useBufferedDraftText({
		externalValue:
			typeof resolvedField?.title === "string" ? resolvedField.title : "",
		onRecordHistory: recordDraftHistory,
		onCommit: (title) => commitFieldPatch({ title }),
	});

	const descriptionDraft = useBufferedDraftText({
		externalValue: (resolvedField?.description as string) ?? "",
		onRecordHistory: recordDraftHistory,
		onCommit: (description) => commitFieldPatch({ description }),
	});

	const placeholderDraft = useBufferedDraftText({
		externalValue: uiPlaceholder,
		onRecordHistory: recordDraftHistory,
		onCommit: (value) => {
			if (!selectedPointer) return;
			patchUiSchema(
				(prev) =>
					setUiPlaceholderAtPointer(
						prev as Record<string, unknown>,
						selectedPointer,
						value,
					) as UiSchema,
				{ recordHistory: false },
			);
		},
	});

	const tooltipDraft = useBufferedDraftText({
		externalValue: uiTooltip,
		onRecordHistory: recordDraftHistory,
		onCommit: (value) => {
			if (!selectedPointer) return;
			patchUiSchema(
				(prev) =>
					setUiTooltipAtPointer(
						prev as Record<string, unknown>,
						selectedPointer,
						value,
					) as UiSchema,
				{ recordHistory: false },
			);
		},
	});

	const showObjectLayout =
		fieldKind === "object" || fieldKind === "arch-object";
	const isRootLevelBlock = useMemo(() => {
		if (!selectedPointer) return false;
		return pointerSegments(selectedPointer).length === 1;
	}, [selectedPointer]);
	const rootBlockKey = useMemo(() => {
		if (!selectedPointer) return "";
		return pointerSegments(selectedPointer)[0] ?? "";
	}, [selectedPointer]);
	const streamBlockOptions = useMemo(
		() => resolveV2AnketaStreamBlockOptions(leafUiBranch, rootBlockKey),
		[leafUiBranch, rootBlockKey],
	);
	const showStreamBlockOptions =
		showObjectLayout &&
		isRootLevelBlock &&
		!sectionUiOptions.system &&
		![
			"generalInfo",
			"detailInfo",
			"summary",
			"meta",
			"groupActivation",
			"workflow",
		].includes(rootBlockKey);
	const showLayoutOptions = fieldKind === "layout";
	const showArrayOptions = fieldKind === "array" || fieldKind === "arch-array";
	const showPlaceholderField =
		fieldKind === "primitive" ||
		showArrayOptions ||
		fieldKind === "general-uncertainty";
	const workArch = isWorkArchComponent(archComponent);

	const selectedSchemaParamId = useMemo(
		() => (selectedPointer ? schemaParamIdFromPointer(selectedPointer) : ""),
		[selectedPointer],
	);

	const isSchemaTriggerParam = useMemo(() => {
		if (!selectedPointer) return false;
		const params = buildSchemaWorkParameters({
			fieldPathHints,
			uiSchema,
			jsonSchema,
			enumMapByCode,
		});
		return params.some((param) => param.id === selectedSchemaParamId);
	}, [
		selectedPointer,
		selectedSchemaParamId,
		fieldPathHints,
		uiSchema,
		jsonSchema,
		enumMapByCode,
	]);

	return (
		<PanelChrome embedded dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.properties}>
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
					<Box
						sx={{
							mb: 2,
							pb: 1.5,
							borderBottom: 1,
							borderColor: "divider",
						}}
					>
						<Typography variant="caption" color="text.secondary">
							Путь: <code>{selectedPointer}</code>
						</Typography>
						{archComponent ? (
							<Chip
								size="small"
								label={V2_ARCH_COMPONENT_LABELS[archComponent]}
								sx={{ mt: 0.75 }}
							/>
						) : null}
						{isSchemaTriggerParam ? (
							<Box sx={{ mt: 1.25 }}>
								<Typography
									variant="caption"
									color="text.secondary"
									display="block"
									sx={{ mb: 0.5 }}
								>
									ID параметра (триггеры типовых работ)
								</Typography>
								<Flex gap={0.5} alignItems="center" wrap="wrap">
									<Typography
										component="code"
										variant="caption"
										sx={{
											flex: 1,
											minWidth: 0,
											wordBreak: "break-all",
											fontFamily: "monospace",
										}}
									>
										{selectedSchemaParamId}
									</Typography>
									<IconButton
										size="small"
										title="Скопировать ID параметра"
										aria-label="Скопировать ID параметра"
										onClick={() =>
											void copyTextToClipboard(
												selectedSchemaParamId,
												"ID параметра",
											)
										}
									>
										<ContentCopyIcon sx={{ fontSize: 16 }} />
									</IconButton>
									<Button
										size="small"
										variant="outlined"
										startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
										onClick={() => {
											if (!selectedPointer) return;
											openLogicTabWithTriggerParam(selectedPointer);
										}}
									>
										В триггеры
									</Button>
								</Flex>
							</Box>
						) : null}
					</Box>

					<PropertiesSection title="Подписи">
						<TextField
							fullWidth
							size="small"
							label="Подпись (title)"
							value={titleDraft.value}
							onChange={(e) => titleDraft.onChange(e.target.value)}
							onBlur={titleDraft.onBlur}
						/>
						<TextField
							fullWidth
							size="small"
							multiline
							minRows={2}
							label="Описание"
							value={descriptionDraft.value}
							onChange={(e) => descriptionDraft.onChange(e.target.value)}
							onBlur={descriptionDraft.onBlur}
						/>
					</PropertiesSection>

					<PropertiesSection title="Тип и схема">
						<FieldTypeControl
							fieldKind={fieldKind}
							primitiveTypeVariant={primitiveTypeVariant}
							onPrimitiveTypeChange={handlePrimitiveTypeChange}
							arrayItemsLabel={arrayItemsLabel}
						/>
						<FormControlLabel
							control={
								<Checkbox
									checked={isRequired}
									onChange={(e) => handleToggleRequired(e.target.checked)}
								/>
							}
							label="Обязательное"
						/>
					</PropertiesSection>

					<PropertiesSection title="В форме анкеты">
						{showPlaceholderField ? (
							<>
								<TextField
									fullWidth
									size="small"
									label="Плейсхолдер"
									value={placeholderDraft.value}
									onChange={(e) => placeholderDraft.onChange(e.target.value)}
									onBlur={placeholderDraft.onBlur}
									helperText="Текст в пустом поле в превью и анкете."
								/>
								<TextField
									fullWidth
									size="small"
									multiline
									minRows={2}
									label="Подсказка"
									value={tooltipDraft.value}
									onChange={(e) => tooltipDraft.onChange(e.target.value)}
									onBlur={tooltipDraft.onBlur}
									helperText="Иконка ℹ рядом с подписью поля; текст — в нативной подсказке при наведении."
								/>
							</>
						) : null}
						<Box>
							<FormControlLabel
								control={
									<Checkbox
										checked={isHiddenInForm}
										onChange={(e) => {
											if (!selectedPointer) return;
											patchUiSchema(
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
								sx={{ mt: -0.5, pl: 4 }}
							>
								Поле не показывается в превью и анкете; на холсте — чип
								«Скрыто».
							</Typography>
						</Box>
					</PropertiesSection>

					{showLayoutOptions ? (
						<PropertiesSection title="Разметка">
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
							<FormControlLabel
								control={
									<Checkbox
										checked={layoutHideTitle}
										onChange={(e) =>
											patchSectionUi({
												hideTitle: e.target.checked ? undefined : false,
											})
										}
									/>
								}
								label="Без заголовка"
							/>
							<Box>
								<Typography variant="caption" fontWeight={600} display="block">
									Поля в разметке ({groupChildFields.length})
								</Typography>
								<GroupChildFieldsList
									fields={groupChildFields}
									emptyHint="Перетащите поля внутрь блока разметки на холсте."
								/>
							</Box>
						</PropertiesSection>
					) : null}

					{showStreamBlockOptions ? (
						<PropertiesSection title="Стримовый блок">
							<FormControlLabel
								control={
									<Checkbox
										checked={streamBlockOptions.streamBlock}
										onChange={(e) => {
											if (e.target.checked) {
												patchSectionUi({
													streamBlock: true,
													streamExecutor:
														streamBlockOptions.streamExecutor ??
														sectionUiOptions.streamExecutor ??
														V2_EXECUTOR_STREAM_LABELS[0],
													sectionRole: sectionUiOptions.sectionRole ?? "main",
												});
												return;
											}
											patchSectionUi({
												streamBlock: false,
												streamExecutor: undefined,
											});
										}}
									/>
								}
								label="Стримовый блок (платформенный / поддерживающий стрим)"
							/>
							{streamBlockOptions.streamBlock ? (
								<TextField
									select
									fullWidth
									size="small"
									label="Стрим-исполнитель"
									value={
										sectionUiOptions.streamExecutor ??
										streamBlockOptions.streamExecutor ??
										""
									}
									onChange={(e) =>
										patchSectionUi({
											streamBlock: true,
											streamExecutor: (e.target.value ||
												undefined) as V2ExecutorStreamLabel,
										})
									}
									helperText={`Справочник ${V2_EXECUTOR_STREAMS_DICTIONARY_CODE}. Используется в логике типовых работ и ролевке секций.`}
								>
									{V2_EXECUTOR_STREAM_LABELS.map((stream) => (
										<MenuItem key={stream} value={stream}>
											<Flex alignItems="center" gap={1} sx={{ width: "100%" }}>
												<Typography sx={{ flex: 1 }}>{stream}</Typography>
												<ExecutorStreamPresenceLabel
													present={isExecutorStreamPresentInSchema(
														uiSchema,
														stream,
													)}
												/>
											</Flex>
										</MenuItem>
									))}
								</TextField>
							) : null}
						</PropertiesSection>
					) : null}

					{showObjectLayout ? (
						<>
							<PropertiesSection title="Секция">
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
								<TextField
									select
									fullWidth
									size="small"
									label="Раздел workflow (workflowSectionId)"
									value={sectionUiOptions.workflowSectionId ?? ""}
									onChange={(e) =>
										patchSectionUi({
											workflowSectionId: (e.target.value ||
												undefined) as V2AnketaMainSectionId,
										})
									}
									helperText="Чип статуса и кнопка завершения — при роли main или при явном выборе раздела. «Авто» — по ключу на корне (generalInfo, detailInfo, …)."
								>
									<MenuItem value="">
										<em>Авто (по ключу на корне)</em>
									</MenuItem>
									{V2_ANKETA_MAIN_SECTION_IDS.map((id) => (
										<MenuItem key={id} value={id}>
											{V2_ANKETA_MAIN_SECTION_TITLES[id]} ({id})
										</MenuItem>
									))}
								</TextField>
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
									helperText="Отображается под заголовком секции в превью анкеты"
								/>
							</PropertiesSection>

							<PropertiesSection title="Панель">
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
								<FormControlLabel
									control={
										<Checkbox
											checked={sectionUiOptions.groupActivatable ?? false}
											onChange={(e) =>
												patchSectionUi({
													groupActivatable: e.target.checked || undefined,
													...(e.target.checked
														? {}
														: {
																groupActive: undefined,
															}),
												})
											}
										/>
									}
									label="Можно активировать и деактивировать"
								/>
								{sectionUiOptions.groupActivatable ? (
									<FormControlLabel
										control={
											<Checkbox
												checked={sectionUiOptions.groupActive !== false}
												onChange={(e) =>
													patchSectionUi({
														groupActive: e.target.checked,
													})
												}
											/>
										}
										label="Активна по умолчанию"
									/>
								) : null}
								{fieldKind === "arch-object" ? (
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
								) : null}
							</PropertiesSection>

							<PropertiesSection
								title={`Вложенные поля (${groupChildFields.length})`}
							>
								<GroupChildFieldsList
									fields={groupChildFields}
									emptyHint="Перетащите поле внутрь группы на холсте."
								/>
								{isCustomUiGroup ? (
									<Typography
										variant="caption"
										color="info.main"
										display="block"
									>
										Кастомная UI-конфигурация: {customUiGroupSummary}
									</Typography>
								) : null}
							</PropertiesSection>
						</>
					) : null}

					{showArrayOptions ? (
						<PropertiesSection title="Список">
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
								<Typography variant="caption" color="text.secondary">
									Типовые работы генерируются автоматически — добавление и
									удаление отключены.
								</Typography>
							) : null}
							{hasArrayObjectItems ? (
								<Box sx={{ mt: 1.5 }}>
									<Typography
										variant="caption"
										fontWeight={600}
										display="block"
										sx={{ mb: 0.5 }}
									>
										Поля элемента списка ({arrayItemChildFields.length})
									</Typography>
									<GroupChildFieldsList
										fields={arrayItemChildFields}
										emptyHint="Перетащите поле из палитры на блок списка на холсте. Стоковые поля пресета удалить нельзя."
										onSelectField={(key) => {
											if (!selectedPointer) return;
											setSelectedPointer(`${selectedPointer}/items/${key}`);
										}}
									/>
								</Box>
							) : null}
						</PropertiesSection>
					) : null}

					<Divider sx={{ mb: 2 }} />

					<PropertiesSection title="Справочник">
						{canBindDictionary ? (
							<>
								<FuzzyAutocomplete<V2DictionaryDto>
									options={v2Dictionaries}
									value={
										v2Dictionaries.find(
											(d) => d.code === currentDictionaryCode,
										) ?? null
									}
									onChange={(d) => handleDictionaryCodeChange(d?.code ?? "")}
									getOptionLabel={(d) => `${d.code} — ${d.name}`}
									getOptionValue={(d) => d.code}
									label="Справочник"
									placeholder="Не привязан"
									error={dictionaryBindingMissing}
									noMatchesText="Совпадений нет"
									helperText="В форме поле отображается как выпадающий список значений справочника"
								/>
								{currentDictionaryCode ? (
									<FormControlLabel
										control={
											<Checkbox
												checked={dictionaryMultiple}
												onChange={(e) => {
													const checked = e.target.checked;
													if (!selectedPointer) return;
													recordDraftHistory();
													patchUiSchema(
														(prev) =>
															syncDictionaryFieldUiAtPointer(
																prev as Record<string, unknown>,
																selectedPointer,
																{ multiple: checked },
															) as UiSchema,
														{ recordHistory: false },
													);
													updateField(
														buildDictionaryMultiSchemaPatch(checked),
														{
															recordHistory: false,
														},
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
					</PropertiesSection>

					{isTypicalWorkBlock ? (
						<>
							<Divider sx={{ mb: 2 }} />

							<PropertiesSection title="Типовые работы">
								<TextField
									select
									fullWidth
									size="small"
									label="Стрим-исполнитель"
									value={typicalWorkStreamExecutor}
									onChange={(e) => {
										if (!selectedPointer) return;
										recordDraftHistory();
										patchUiSchema(
											(prev) =>
												patchUiOptionsAtPointer(
													prev as Record<string, unknown>,
													selectedPointer,
													{
														streamExecutor: (e.target.value ||
															undefined) as V2ExecutorStreamLabel,
													},
												) as UiSchema,
											{ recordHistory: false },
										);
									}}
									helperText={`Справочник ${V2_EXECUTOR_STREAMS_DICTIONARY_CODE}. Связь с назначениями работ в логике.`}
									sx={{ mb: 1 }}
								>
									<MenuItem value="">
										<em>Не выбран</em>
									</MenuItem>
									{V2_EXECUTOR_STREAM_LABELS.map((stream) => (
										<MenuItem key={stream} value={stream}>
											<Flex alignItems="center" gap={1} sx={{ width: "100%" }}>
												<Typography sx={{ flex: 1 }}>{stream}</Typography>
												<ExecutorStreamPresenceLabel
													present={isExecutorStreamPresentInSchema(
														uiSchema,
														stream,
													)}
												/>
											</Flex>
										</MenuItem>
									))}
								</TextField>
								{typicalWorkStreamExecutor ? (
									<Box sx={{ mb: 1 }}>
										<ExecutorStreamPresenceHint
											present={typicalWorkStreamPresent}
										/>
										{!typicalWorkStreamPresent ? (
											<Button
												size="small"
												variant="outlined"
												sx={{ mt: 1 }}
												onClick={handleCreateTypicalWorkStreamBlock}
											>
												Создать стримовый блок
											</Button>
										) : null}
									</Box>
								) : null}
								<Typography variant="caption" color="text.secondary">
									К этому блоку привязаны работы из справочника. Они появляются
									здесь при срабатывании триггеров.
								</Typography>
								{boundTypicalWorks.length === 0 ? (
									<Typography
										variant="caption"
										color="text.secondary"
										sx={{ display: "block", mt: 0.5 }}
									>
										Пока нет привязанных работ.
									</Typography>
								) : (
									<Flex gap={0.5} sx={{ flexWrap: "wrap", mt: 0.5 }}>
										{boundTypicalWorks.map((w) => (
											<Chip
												key={w.id}
												size="small"
												variant="outlined"
												label={
													w.archComponentType
														? `${w.name} · ${w.archComponentType}`
														: w.name
												}
												onClick={() => openTypicalWorksTab(w.id)}
												onDelete={() => {
													if (!selectedPointer) return;
													recordDraftHistory();
													patchUiSchema(
														(prev) =>
															removeBoundWorkIdAtPointer(
																prev as Record<string, unknown>,
																selectedPointer,
																w.id,
																typicalWorkCatalog,
																typicalWorkStreamExecutor,
															) as UiSchema,
														{ recordHistory: false },
													);
												}}
											/>
										))}
									</Flex>
								)}
								{typicalWorks.length > 0 ? (
									<Box sx={{ mt: 1 }}>
										<FuzzyAutocomplete<(typeof typicalWorks)[number]>
											options={unboundTypicalWorks}
											value={null}
											onChange={(
												work: (typeof typicalWorks)[number] | null,
											) => {
												if (!work || !selectedPointer) return;
												recordDraftHistory();
												patchUiSchema(
													(prev) =>
														appendBoundWorkIdAtPointer(
															prev as Record<string, unknown>,
															selectedPointer,
															work.id,
															typicalWorkCatalog,
															typicalWorkStreamExecutor,
														) as UiSchema,
													{ recordHistory: false },
												);
											}}
											getOptionLabel={(work) =>
												work.archComponentType
													? `${work.name} · ${work.archComponentType}`
													: work.name
											}
											label="Привязать существующую"
											placeholder={
												unboundTypicalWorks.length === 0
													? "Все работы шаблона уже привязаны к этому блоку"
													: "Выберите работу из справочника шаблона"
											}
											size="small"
											disabled={unboundTypicalWorks.length === 0}
										/>
									</Box>
								) : null}
								<Button
									size="small"
									variant="outlined"
									sx={{ mt: 1 }}
									onClick={() =>
										openTypicalWorksTab(undefined, { create: true })
									}
								>
									Создать типовую работу
								</Button>
							</PropertiesSection>
						</>
					) : null}

					<Divider sx={{ mb: 2 }} />

					<PropertiesSection title="Логика">
						<Box>
							<Typography variant="caption" fontWeight={600} display="block">
								Влияет на это поле ({rulesForSelectedExact.length})
							</Typography>
							<Flex gap={0.5} sx={{ flexWrap: "wrap", mt: 0.5 }}>
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
						</Box>

						<Box>
							<Typography variant="caption" fontWeight={600} display="block">
								Зависят от этого поля ({rulesWhereSelectedIsDependency.length})
							</Typography>
							<Flex gap={0.5} sx={{ flexWrap: "wrap", mt: 0.5 }}>
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
						</Box>

						{resolvedField?.type === "object" ? (
							<Box>
								<Typography variant="caption" fontWeight={600} display="block">
									Правила на вложенные ({rulesForSelectedSubtree.length})
								</Typography>
								<Flex gap={0.5} sx={{ flexWrap: "wrap", mt: 0.5 }}>
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
							</Box>
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
					</PropertiesSection>
				</>
			)}
		</PanelChrome>
	);
}
