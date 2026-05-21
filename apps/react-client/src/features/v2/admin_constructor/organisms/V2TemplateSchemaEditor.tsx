import {
	useCreateV2TemplateVersion,
	usePublishV2TemplateVersion,
	useUpdateV2TemplateVersion,
	useV2DictionaryEnumsMaps,
	useV2Dictionaries,
	useV2Template,
	useV2TemplateVersion,
	useV2TemplateVersions,
} from "@react-client/common/api/queries/v2-templates";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { apiClient } from "@react-client/common/api/helpers/apiClient";
import { toast } from "@react-client/common/toasts";
import {
	pathForAdminV2Template,
	pathForPlaygroundV2Template,
	routes,
} from "@react-client/routing/version/v1/routing/routes";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import type {
	CreateV2TemplateVersionRequestDto,
	V2LogicRuleDto,
} from "@smart-anketa/api-contract";
import { evaluateRuleLive } from "../schemaEditor/panels/logicPanel/helpers";
import { nanoid } from "nanoid";
import { Box, Button, Typography } from "@mui/material";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { SchemaEditorProvider } from "../schemaEditor/SchemaEditorContext";
import type { SchemaEditorContextValue } from "../schemaEditor/SchemaEditorContext";
import { SchemaEditorDockProvider } from "../schemaEditor/SchemaEditorDockContext";
import { V2SchemaEditorDockLayout } from "../schemaEditor/V2SchemaEditorDockLayout";
import { SchemaLogicPanel } from "../schemaEditor/panels/SchemaLogicPanel";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../testIds";
import { dependencyCycleWarnings } from "../utils/logicGraphAnalysis";
import { useDebouncedV2Calculation } from "../hooks/useDebouncedV2Calculation";
import { derivePreviewSchemas } from "../utils/logicPreview";
import { mapCalculationResult } from "../utils/mapCalculationResult";
import {
	collectDictionaryCodesFromUiSchema,
	mergeDictionaryEnumsIntoPreviewSchema,
} from "../utils/dictionaryPreview";
import {
	EMPTY_JSON_SCHEMA,
	coerceJsonSchema,
	coerceLogicGraph,
	coerceUiSchema,
} from "../utils/coerceV2TemplateSnapshot";
import {
	normalizeJsonPointer,
	parentOfPointer,
	pointerSegments,
	jsonPointerToFormDataVarPath,
} from "../utils/schemaPaths";
import {
	addRootProperty,
	applyGroupFieldOrdersToSchema,
	insertChildPropertyAt,
	isObjectFieldGroup,
	listChildKeys,
	listSchemaFields,
	removePropertyAtPointer,
	reorderRootProperties,
	resolveSchemaNode,
	setUiDictionaryCodeAtPointer,
	setUiObjectFieldTemplateAtPointer,
	setUiWidgetAtPointer,
	toggleRequiredAtPointer,
	updatePropertyAtPointer,
} from "../utils/schemaMutators";
import { FullScreenLoader } from "@react-client/common/muiCustom/FullScreenLoader";
import { V2TemplateSaveDialog } from "./V2TemplateSaveDialog";
import type { V2TemplateStatus } from "@smart-anketa/api-contract";

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
	status: V2TemplateStatus;
	isSystemCurrent: boolean;
};

export type V2EditorHeaderActions = {
	onSave: () => void;
	onPublish: () => void;
	savePending: boolean;
	publishPending: boolean;
	canPublish: boolean;
};

export type V2SchemaEditorLayoutMode = "dock" | "logic-only";

interface V2TemplateSchemaEditorProps {
	templateId: string;
	/** Версия из URL (`versionId`); без неё — черновик или актуальная опубликованная. */
	initialVersionId?: string | null;
	onVersionIdChange?: (versionId: string) => void;
	wording?: V2SchemaEditorWording;
	layoutMode?: V2SchemaEditorLayoutMode;
	initialRuleId?: string | null;
	initialPointer?: string | null;
	onHeaderMetaChange?: (meta: V2EditorHeaderMeta | null) => void;
	onHeaderActionsChange?: (actions: V2EditorHeaderActions | null) => void;
}

export const V2TemplateSchemaEditor = ({
	templateId,
	initialVersionId = null,
	onVersionIdChange,
	wording = "playgroundTemplate",
	layoutMode = "dock",
	initialRuleId = null,
	initialPointer = null,
	onHeaderMetaChange,
	onHeaderActionsChange,
}: V2TemplateSchemaEditorProps) => {
	const navigate = useNavigate();
	const isAdminEditor = wording === "adminSchema";

	const {
		data: template,
		error: templateError,
		isError: templateLoadError,
	} = useV2Template(templateId);
	const { data: v2Dictionaries = [] } = useV2Dictionaries();
	const {
		data: versions,
		refetch: refetchVersions,
		error: versionsError,
		isError: versionsLoadError,
	} = useV2TemplateVersions(templateId);
	const createVersion = useCreateV2TemplateVersion();
	const updateVersion = useUpdateV2TemplateVersion();
	const publishVersion = usePublishV2TemplateVersion();

	const latestDraft = useMemo(() => {
		const drafts =
			versions
				?.filter((v) => v.status === "draft")
				.sort((a, b) => b.versionNumber - a.versionNumber) ?? [];
		return drafts[0] ?? undefined;
	}, [versions]);

	const activeVersionId = useMemo(() => {
		if (initialVersionId) return initialVersionId;
		if (latestDraft?.id) return latestDraft.id;
		return template?.currentVersionId ?? null;
	}, [initialVersionId, latestDraft?.id, template?.currentVersionId]);

	const {
		data: activeVersion,
		isLoading: activeVersionLoading,
		isError: activeVersionLoadError,
		error: activeVersionError,
	} = useV2TemplateVersion(templateId, activeVersionId);

	const isSystemCurrent = Boolean(
		template?.currentVersionId &&
			activeVersion?.id === template.currentVersionId,
	);

	const [saveDialogOpen, setSaveDialogOpen] = useState(false);

	const [jsonSchema, setJsonSchema] = useState<RJSFSchema>(EMPTY_JSON_SCHEMA);
	const [uiSchema, setUiSchema] = useState<UiSchema>({});
	const [logic, setLogic] = useState(coerceLogicGraph(undefined));
	const [formData, setFormData] = useState<Record<string, unknown>>({});

	const [selectedPointer, setSelectedPointer] = useState<string | null>(
		initialPointer ? normalizeJsonPointer(initialPointer) : null,
	);
	const [schemaMonacoText, setSchemaMonacoText] = useState(
		JSON.stringify(EMPTY_JSON_SCHEMA, null, 2),
	);
	const [uiMonacoText, setUiMonacoText] = useState("{}");

	const [mainTab, setMainTab] = useState<
		"designer" | "json" | "logic" | "preview"
	>(layoutMode === "logic-only" ? "logic" : "designer");

	const [selectedRuleId, setSelectedRuleId] = useState<string | null>(
		initialRuleId,
	);
	const [depsDraft, setDepsDraft] = useState("");
	const [monacoError, setMonacoError] = useState<string | null>(null);
	const [logicPathPick, setLogicPathPick] = useState<string>("");

	const selectedRule =
		logic.rules.find((r) => r.id === selectedRuleId) ?? logic.rules[0];

	useEffect(() => {
		if (selectedRule?.id !== selectedRuleId) {
			setSelectedRuleId(selectedRule?.id ?? null);
		}

		setDepsDraft(selectedRule?.dependencies.join(", ") ?? "");
	}, [logic.rules, selectedRule, selectedRuleId]);

	useEffect(() => {
		if (mainTab === "logic" && selectedPointer) {
			setLogicPathPick(selectedPointer);
		}
	}, [mainTab, selectedPointer]);

	useEffect(() => {
		if (initialRuleId) setSelectedRuleId(initialRuleId);
	}, [initialRuleId]);

	useEffect(() => {
		if (initialPointer) {
			setSelectedPointer(normalizeJsonPointer(initialPointer));
		}
	}, [initialPointer]);

	useEffect(() => {
		if (!isAdminEditor || !templateLoadError || !templateError) return;
		toast.error("Не удалось загрузить схему", {
			description: apiErrorMessage(templateError),
		});
	}, [isAdminEditor, templateLoadError, templateError]);

	useEffect(() => {
		if (!isAdminEditor || !versionsLoadError || !versionsError) return;
		toast.error("Не удалось загрузить версии схемы", {
			description: apiErrorMessage(versionsError),
		});
	}, [isAdminEditor, versionsLoadError, versionsError]);

	useEffect(() => {
		if (!isAdminEditor || !activeVersionLoadError || !activeVersionError) return;
		toast.error("Не удалось загрузить версию схемы", {
			description: apiErrorMessage(activeVersionError),
		});
	}, [isAdminEditor, activeVersionLoadError, activeVersionError]);

	useEffect(() => {
		if (!template || !activeVersion) {
			onHeaderMetaChange?.(null);
			return;
		}

		onHeaderMetaChange?.({
			title: template.name,
			versionNumber: activeVersion.versionNumber,
			status: activeVersion.status,
			isSystemCurrent,
		});
	}, [template, activeVersion, isSystemCurrent, onHeaderMetaChange]);

	useEffect(() => {
		if (!activeVersion?.id) {
			return;
		}

		const nextSchema = coerceJsonSchema(activeVersion.jsonSchema);
		setJsonSchema(nextSchema);
		setUiSchema(coerceUiSchema(activeVersion.uiSchema));
		setLogic(coerceLogicGraph(activeVersion.logic));

		setSchemaMonacoText(JSON.stringify(nextSchema, null, 2));
		setUiMonacoText(
			JSON.stringify(coerceUiSchema(activeVersion.uiSchema), null, 2),
		);

		setFormData({});
	}, [activeVersion?.id]);

	const cycles = useMemo(
		() => dependencyCycleWarnings(logic.rules),
		[logic.rules],
	);

	const treeRows = useMemo(() => listSchemaFields(jsonSchema), [jsonSchema]);

	const rootFieldKeys = useMemo(
		() => Object.keys((jsonSchema.properties ?? {}) as Record<string, unknown>),
		[jsonSchema],
	);

	const referencedDictionaryCodes = useMemo(
		() => collectDictionaryCodesFromUiSchema(uiSchema),
		[uiSchema],
	);

	const { enumMapByCode, isLoading: dictionaryEnumsLoading } =
		useV2DictionaryEnumsMaps(referencedDictionaryCodes);

	const {
		result: calculationResult,
		isLoading: calculationLoading,
		error: calculationError,
	} = useDebouncedV2Calculation({
		templateId,
		versionId: activeVersion?.id,
		formData,
		rulesOverride: logic,
		enabled: Boolean(activeVersion?.id),
	});

	const mappedCalculation = useMemo(
		() => (calculationResult ? mapCalculationResult(calculationResult) : null),
		[calculationResult],
	);

	const logicPreviewPack = useMemo(
		() =>
			derivePreviewSchemas(
				jsonSchema,
				uiSchema,
				logic.rules,
				formData,
				mappedCalculation
					? {
							computedLiveData: mappedCalculation.liveFormData,
							calculationItems: mappedCalculation.calculationItems,
							taskTriggerItems: mappedCalculation.taskTriggerItems,
							validationIssues: mappedCalculation.validationIssues,
						}
					: undefined,
			),
		[jsonSchema, uiSchema, logic.rules, formData, mappedCalculation],
	);

	const previewSchema = useMemo(
		() =>
			mergeDictionaryEnumsIntoPreviewSchema(
				logicPreviewPack.previewSchema,
				uiSchema,
				enumMapByCode,
			),
		[logicPreviewPack.previewSchema, uiSchema, enumMapByCode],
	);

	const previewUiSchema = logicPreviewPack.previewUiSchema;
	const calculationItems = logicPreviewPack.calculationItems;
	const taskTriggerItems = logicPreviewPack.taskTriggerItems;
	const liveFormData = logicPreviewPack.liveFormData;
	const logicExtraErrors = logicPreviewPack.extraErrors;
	const logicValidationIssueCount = logicPreviewPack.logicValidationIssues.length;
	const legacyStageEvaluation = mappedCalculation?.legacyStageEvaluation ?? null;

	const fieldPathHints = useMemo(() => {
		const ui = uiSchema as Record<string, unknown>;
		return listSchemaFields(jsonSchema).map((row) => {
			const segs = pointerSegments(row.pointer);
			const node = resolveSchemaNode(jsonSchema, segs);
			const title = typeof node?.title === "string" ? node.title : null;
			const leaf = readUiBranch(ui, segs);
			let dictionaryCode: string | null = null;
			const opts = leaf?.["ui:options"];
			if (opts && typeof opts === "object" && !Array.isArray(opts)) {
				const dc = (opts as Record<string, unknown>).dictionaryCode;
				if (typeof dc === "string" && dc.trim()) dictionaryCode = dc.trim();
			}
			const varPath = jsonPointerToFormDataVarPath(row.pointer);
			const codesPreview =
				dictionaryCode && enumMapByCode[dictionaryCode]
					? enumMapByCode[dictionaryCode]!.enums.slice(0, 8)
					: null;
			return {
				pointer: row.pointer,
				key: row.key,
				title,
				varPath,
				dictionaryCode,
				codesPreview,
			};
		});
	}, [jsonSchema, uiSchema, enumMapByCode]);

	const logicPathFieldHint = useMemo(() => {
		if (!logicPathPick) return undefined;
		return fieldPathHints.find((h) => h.pointer === logicPathPick);
	}, [fieldPathHints, logicPathPick]);

	const dictionaryCodeByPointer = useMemo(() => {
		const m = new Map<string, string>();
		for (const h of fieldPathHints) {
			if (h.dictionaryCode) m.set(h.pointer, h.dictionaryCode);
		}
		return m;
	}, [fieldPathHints]);

	const dictionaryIdByCode = useMemo(() => {
		const m = new Map<string, string>();
		for (const d of v2Dictionaries) m.set(d.code, d.id);
		return m;
	}, [v2Dictionaries]);

	const rulesForSelectedExact = useMemo(() => {
		if (selectedPointer === null) return [];
		const np = normalizeJsonPointer(selectedPointer);
		return logic.rules.filter((r) => normalizeJsonPointer(r.targetPath) === np);
	}, [logic.rules, selectedPointer]);

	const rulesWhereSelectedIsDependency = useMemo(() => {
		if (selectedPointer === null) return [];
		const np = normalizeJsonPointer(selectedPointer);
		return logic.rules.filter((r) =>
			r.dependencies.some((d) => normalizeJsonPointer(d) === np),
		);
	}, [logic.rules, selectedPointer]);

	const rulesForSelectedSubtree = useMemo(() => {
		if (selectedPointer === null) return [];
		const np = normalizeJsonPointer(selectedPointer);
		if (np === "/") return [];
		const pref = `${np}/`;
		return logic.rules.filter((r) => {
			const tp = normalizeJsonPointer(r.targetPath);
			if (tp === np) return false;
			return tp.startsWith(pref);
		});
	}, [logic.rules, selectedPointer]);

	const handleCreateDraft = async (mode: "empty" | "current") => {
		const emptyDto: CreateV2TemplateVersionRequestDto = {
			jsonSchema: structuredClone(EMPTY_JSON_SCHEMA),
			uiSchema: {},
			logic: { rules: [] },
			dictionariesSnapshot: { referencedDictionaryCodes: [] },
			releaseNotes: "Новый черновик",
		};

		let dto = emptyDto;

		try {
			if (mode === "current" && template?.currentVersionId) {
				const v = await apiClient<{
					jsonSchema: unknown;
					uiSchema: unknown;
					logic: unknown;
					versionNumber: number;
					dictionariesSnapshot?: Record<string, unknown> | null;
				}>({
					url: `/v2/templates/${templateId}/versions/${template.currentVersionId}`,
					method: "GET",
				});

				dto = {
					jsonSchema: coerceJsonSchema(v.jsonSchema),
					uiSchema: coerceUiSchema(v.uiSchema),
					logic: coerceLogicGraph(v.logic),
					dictionariesSnapshot: v.dictionariesSnapshot ?? null,
					releaseNotes: `Копия опубликованной v${v.versionNumber}`,
				};
			}

			const created = await createVersion.mutateAsync({ templateId, dto });
			await refetchVersions();
			persistVersionInUrl(created.id);

			if (isAdminEditor) {
				toast.success(
					mode === "current"
						? "Черновик создан из актуальной версии"
						: "Пустой черновик создан",
				);
			}
		} catch (error) {
			if (isAdminEditor) {
				toast.error("Не удалось создать черновик", {
					description: apiErrorMessage(error),
				});
			}
			throw error;
		}
	};

	const versionSnapshotDto = useCallback(
		(): CreateV2TemplateVersionRequestDto => ({
			jsonSchema,
			uiSchema,
			logic,
			dictionariesSnapshot: {
				referencedDictionaryCodes:
					collectDictionaryCodesFromUiSchema(uiSchema),
			},
		}),
		[jsonSchema, logic, uiSchema],
	);

	const persistVersionInUrl = useCallback(
		(versionId: string) => {
			if (onVersionIdChange) {
				onVersionIdChange(versionId);
				return;
			}
			const path = isAdminEditor
				? pathForAdminV2Template(templateId, versionId)
				: pathForPlaygroundV2Template(templateId, versionId);
			navigate(path, { replace: true });
		},
		[isAdminEditor, navigate, onVersionIdChange, templateId],
	);

	const handleSaveInPlace = useCallback(async () => {
		if (!activeVersion || activeVersion.status !== "draft") return;

		try {
			await updateVersion.mutateAsync({
				templateId,
				versionId: activeVersion.id,
				dto: versionSnapshotDto(),
			});
			await refetchVersions();
			setSaveDialogOpen(false);

			if (isAdminEditor) {
				toast.success(`Версия v${activeVersion.versionNumber} сохранена`);
			}
		} catch (error) {
			if (isAdminEditor) {
				toast.error("Не удалось сохранить версию", {
					description: apiErrorMessage(error),
				});
			}
			throw error;
		}
	}, [
		activeVersion,
		isAdminEditor,
		refetchVersions,
		templateId,
		updateVersion,
		versionSnapshotDto,
	]);

	const handleSaveAsNewVersion = useCallback(
		async (releaseNotes: string) => {
			try {
				const created = await createVersion.mutateAsync({
					templateId,
					dto: {
						...versionSnapshotDto(),
						parentVersionId: activeVersion?.id ?? null,
						releaseNotes: releaseNotes || "Новый черновик",
					},
				});
				await refetchVersions();
				setSaveDialogOpen(false);
				persistVersionInUrl(created.id);

				if (isAdminEditor) {
					toast.success(`Создан черновик v${created.versionNumber}`);
				}
			} catch (error) {
				if (isAdminEditor) {
					toast.error("Не удалось создать новую версию", {
						description: apiErrorMessage(error),
					});
				}
				throw error;
			}
		},
		[
			activeVersion?.id,
			createVersion,
			isAdminEditor,
			persistVersionInUrl,
			refetchVersions,
			templateId,
			versionSnapshotDto,
		],
	);

	const handlePublishDraft = useCallback(async () => {
		if (!activeVersion || activeVersion.status !== "draft") return;

		try {
			await publishVersion.mutateAsync({
				templateId,
				versionId: activeVersion.id,
				dto: {},
			});
			await refetchVersions();

			if (isAdminEditor) {
				toast.success("Версия опубликована");
			}
		} catch (error) {
			if (isAdminEditor) {
				toast.error("Не удалось опубликовать версию", {
					description: apiErrorMessage(error),
				});
			}
			throw error;
		}
	}, [
		activeVersion,
		isAdminEditor,
		publishVersion,
		refetchVersions,
		templateId,
	]);

	const publishDraftRef = useRef(handlePublishDraft);
	publishDraftRef.current = handlePublishDraft;

	const savePending =
		updateVersion.isPending || createVersion.isPending;

	useEffect(() => {
		if (!activeVersion) {
			onHeaderActionsChange?.(null);
			return;
		}

		onHeaderActionsChange?.({
			onSave: () => setSaveDialogOpen(true),
			onPublish: () => void publishDraftRef.current(),
			savePending,
			publishPending: publishVersion.isPending,
			canPublish: activeVersion.status === "draft",
		});
	}, [
		activeVersion,
		onHeaderActionsChange,
		savePending,
		publishVersion.isPending,
	]);

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
		setSchemaMonacoText(
			JSON.stringify(coerceJsonSchema(parsedSchema), null, 2),
		);
		setUiMonacoText(JSON.stringify(coerceUiSchema(parsedUi), null, 2));
		setMonacoError(null);
	};

	const reloadMonacoFromState = () => {
		setSchemaMonacoText(JSON.stringify(jsonSchema, null, 2));
		setUiMonacoText(JSON.stringify(uiSchema, null, 2));
		setMonacoError(null);
	};

	const selectedPointerParent = selectedPointer
		? parentOfPointer(selectedPointer)
		: null;

	const resolvedField =
		selectedPointer !== null
			? resolveSchemaNode(jsonSchema, pointerSegments(selectedPointer))
			: undefined;

	const parentNode = selectedPointerParent
		? resolveSchemaNode(jsonSchema, selectedPointerParent.parentSegments)
		: undefined;

	const uiSegments = selectedPointer ? pointerSegments(selectedPointer) : [];

	const leafUiBranch =
		uiSegments.length > 0
			? readUiBranch(uiSchema as Record<string, unknown>, uiSegments)
			: undefined;

	const currentWidgetRaw = leafUiBranch?.["ui:widget"];

	const isRequired =
		selectedPointer !== null && selectedPointerParent?.key !== undefined
			? Boolean(parentNode?.required?.includes(selectedPointerParent.key))
			: false;

	const currentWidget =
		typeof currentWidgetRaw === "string" ? currentWidgetRaw : "";

	const currentObjectFieldTemplateRaw =
		leafUiBranch?.["ui:ObjectFieldTemplate"];
	const currentObjectFieldTemplate =
		typeof currentObjectFieldTemplateRaw === "string"
			? currentObjectFieldTemplateRaw
			: "";

	const isObjectGroup = isObjectFieldGroup(resolvedField);

	const groupChildFields = useMemo(() => {
		if (!isObjectGroup || !selectedPointer) return [];
		return listChildKeys(jsonSchema, selectedPointer).map((key) => {
			const childPointer =
				selectedPointer === "/" ? `/${key}` : `${selectedPointer}/${key}`;
			const child = resolveSchemaNode(
				jsonSchema,
				pointerSegments(childPointer),
			);
			const typeLabel =
				typeof child?.type === "string"
					? child.type
					: Array.isArray(child?.type)
						? child.type.join(" | ")
						: "?";
			return {
				key,
				title: typeof child?.title === "string" ? child.title : key,
				typeLabel,
			};
		});
	}, [isObjectGroup, jsonSchema, selectedPointer]);

	const leafUiOptions =
		leafUiBranch?.["ui:options"] &&
		typeof leafUiBranch["ui:options"] === "object" &&
		!Array.isArray(leafUiBranch["ui:options"])
			? (leafUiBranch["ui:options"] as Record<string, unknown>)
			: undefined;

	const customUiOptionEntries = leafUiOptions
		? Object.entries(leafUiOptions).filter(([k]) => k !== "dictionaryCode")
		: [];

	const isCustomUiGroup =
		isObjectGroup &&
		(Boolean(currentObjectFieldTemplate) ||
			Boolean(currentWidget) ||
			customUiOptionEntries.length > 0 ||
			Boolean(leafUiBranch?.["ui:order"]));

	const customUiGroupSummary = isCustomUiGroup
		? [
				currentObjectFieldTemplate
					? `ui:ObjectFieldTemplate=${currentObjectFieldTemplate}`
					: null,
				currentWidget ? `ui:widget=${currentWidget}` : null,
				leafUiBranch?.["ui:order"]
					? `ui:order (${(leafUiBranch["ui:order"] as unknown[]).length})`
					: null,
				...customUiOptionEntries.map(
					([k, v]) => `ui:options.${k}=${JSON.stringify(v)}`,
				),
			]
				.filter(Boolean)
				.join(" · ")
		: null;

	const canBindDictionary =
		Boolean(resolvedField) &&
		resolvedField?.type !== "object" &&
		!(
			resolvedField?.properties &&
			Object.keys(resolvedField.properties as object).length > 0
		);

	const currentDictionaryCode =
		leafUiBranch &&
		leafUiBranch["ui:options"] &&
		typeof leafUiBranch["ui:options"] === "object" &&
		!Array.isArray(leafUiBranch["ui:options"])
			? String(
					(leafUiBranch["ui:options"] as Record<string, unknown>)
						.dictionaryCode ?? "",
				).trim()
			: "";

	const dictionaryBindingMissing =
		canBindDictionary &&
		Boolean(currentDictionaryCode) &&
		!dictionaryEnumsLoading &&
		!enumMapByCode[currentDictionaryCode];

	const handleAddFieldPreset = useCallback(
		(preset: RJSFSchema) => {
			const key = `field_${nanoid(8)}`;
			const next = addRootProperty(jsonSchema, key, preset);
			if (next) {
				setJsonSchema(next);
				setSelectedPointer(`/${key}`);
			}
		},
		[jsonSchema],
	);

	const handleAddFieldPresetAtParent = useCallback(
		(parentPointer: string, preset: RJSFSchema, index: number) => {
			const key = `field_${nanoid(8)}`;
			const parentSegs = pointerSegments(parentPointer);
			const next = insertChildPropertyAt(
				jsonSchema,
				parentSegs,
				key,
				preset,
				index,
			);
			if (next) {
				setJsonSchema(next);
				const childPointer =
					parentPointer === "/" ? `/${key}` : `${parentPointer}/${key}`;
				setSelectedPointer(childPointer);
			}
		},
		[jsonSchema],
	);

	const handleAddFieldPresetAt = useCallback(
		(preset: RJSFSchema, index: number) => {
			handleAddFieldPresetAtParent("/", preset, index);
		},
		[handleAddFieldPresetAtParent],
	);

	const reorderRootFieldKeys = useCallback(
		(orderedKeys: string[]) => {
			const next = reorderRootProperties(jsonSchema, orderedKeys);
			if (next) setJsonSchema(next);
		},
		[jsonSchema],
	);

	const applyGroupFieldOrders = useCallback(
		(orders: Record<string, string[]>) => {
			const next = applyGroupFieldOrdersToSchema(jsonSchema, orders);
			if (next) setJsonSchema(next);
		},
		[jsonSchema],
	);

	const updateField = useCallback(
		(patch: Partial<RJSFSchema>) => {
			if (!selectedPointer) return;
			const segs = pointerSegments(selectedPointer);
			const next = updatePropertyAtPointer(jsonSchema, segs, patch);
			if (next) setJsonSchema(next);
		},
		[jsonSchema, selectedPointer],
	);

	const handleDeleteField = useCallback(() => {
		if (!selectedPointer) return;
		const segs = pointerSegments(selectedPointer);
		const next = removePropertyAtPointer(jsonSchema, segs);
		if (next) {
			setJsonSchema(next);
			setSelectedPointer(null);
		}
	}, [jsonSchema, selectedPointer]);

	const handleToggleRequired = useCallback(
		(checked: boolean) => {
			if (!selectedPointer) return;
			const next = toggleRequiredAtPointer(
				jsonSchema,
				selectedPointer,
				checked,
			);
			if (next) setJsonSchema(next);
		},
		[jsonSchema, selectedPointer],
	);

	const handleWidgetChange = useCallback(
		(widget: string) => {
			if (!selectedPointer) return;
			const nextUi = setUiWidgetAtPointer(
				uiSchema as Record<string, unknown>,
				selectedPointer,
				widget.length ? widget : null,
			);
			setUiSchema(nextUi as UiSchema);
		},
		[selectedPointer, uiSchema],
	);

	const handleObjectFieldTemplateChange = useCallback(
		(template: string) => {
			if (!selectedPointer) return;
			const nextUi = setUiObjectFieldTemplateAtPointer(
				uiSchema as Record<string, unknown>,
				selectedPointer,
				template.length ? template : null,
			);
			setUiSchema(nextUi as UiSchema);
		},
		[selectedPointer, uiSchema],
	);

	const handleDictionaryCodeChange = useCallback(
		(code: string) => {
			if (!selectedPointer) return;
			const nextUi = setUiDictionaryCodeAtPointer(
				uiSchema as Record<string, unknown>,
				selectedPointer,
				code.trim().length ? code.trim() : null,
			);
			setUiSchema(nextUi as UiSchema);
		},
		[selectedPointer, uiSchema],
	);

	const addRuleForTargetPath = useCallback((rawTarget: string) => {
		const id = nanoid();
		const targetPath = normalizeJsonPointer(
			rawTarget?.trim() ? rawTarget : "/",
		);
		const nextRule: V2LogicRuleDto = {
			id,
			kind: "visibility",
			targetPath,
			dependencies: [],
			condition: true,
		};

		setLogic((prev) => ({ rules: [...prev.rules, nextRule] }));
		setSelectedRuleId(id);
	}, []);

	const addRule = useCallback(() => {
		addRuleForTargetPath(selectedPointer ?? "/");
	}, [addRuleForTargetPath, selectedPointer]);

	const openLogicTabWithRule = useCallback((ruleId: string) => {
		setMainTab("logic");
		setSelectedRuleId(ruleId);
	}, []);

	const updateRulePatch = useCallback(
		(patch: Partial<V2LogicRuleDto>) => {
			if (!selectedRule) return;
			setLogic((prev) => ({
				rules: prev.rules.map((r) =>
					r.id === selectedRule.id ? { ...r, ...patch } : r,
				),
			}));
		},
		[selectedRule],
	);

	const removeSelectedRule = useCallback(() => {
		if (!selectedRule) return;
		setLogic((prev) => ({
			rules: prev.rules.filter((r) => r.id !== selectedRule.id),
		}));
	}, [selectedRule]);

	const handleDepsBlur = useCallback(() => {
		const list = depsDraft
			.split(/[,;\s]+/)
			.map((s) => s.trim())
			.filter(Boolean);

		updateRulePatch({ dependencies: [...new Set(list)] });
	}, [depsDraft, updateRulePatch]);

	const previewEvalNote = useMemo(() => {
		if (!selectedRule) return null;
		const liveEval = evaluateRuleLive(selectedRule, liveFormData);
		if (liveEval.kind === "skipped") {
			return (
				<Typography variant="caption" color="text.secondary">
					{liveEval.reason}
				</Typography>
			);
		}
		if (liveEval.kind === "error") {
			return (
				<Typography variant="caption" color="error" component="div">
					{liveEval.message}
				</Typography>
			);
		}
		if (selectedRule.kind === "validation") {
			const ok = liveEval.kind === "boolean" && liveEval.value;
			return (
				<Typography
					variant="caption"
					color={ok ? "success.main" : "error"}
					component="div"
				>
					{ok
						? "Проверка пройдена (условие истинно)."
						: "Ошибка валидации (условие ложно) — сообщение покажется на поле в превью."}
				</Typography>
			);
		}
		const raw =
			liveEval.kind === "boolean" ||
			liveEval.kind === "number" ||
			liveEval.kind === "string"
				? liveEval.value
				: liveEval.kind === "other"
					? liveEval.raw
					: null;
		return (
			<Typography variant="caption" color="text.secondary">
				Значение условия на данных превью:{" "}
				<code>{JSON.stringify(raw)}</code>
			</Typography>
		);
	}, [formData, liveFormData, selectedRule]);

	const editorContext = useMemo<SchemaEditorContextValue>(
		() => ({
			templateId,
			mainTab,
			setMainTab,
			jsonSchema,
			setJsonSchema,
			uiSchema,
			setUiSchema,
			logic,
			setLogic,
			formData,
			setFormData,
			selectedPointer,
			setSelectedPointer,
			treeRows,
			fieldPathHints,
			rootFieldKeys,
			v2Dictionaries,
			dictionaryCodeByPointer,
			dictionaryIdByCode,
			enumMapByCode,
			dictionaryEnumsLoading,
			previewSchema,
			previewUiSchema,
			calculationItems,
			taskTriggerItems,
			liveFormData,
			calculationLoading,
			calculationError,
			logicExtraErrors,
			logicValidationIssueCount,
			legacyStageEvaluation,
			schemaMonacoText,
			setSchemaMonacoText,
			uiMonacoText,
			setUiMonacoText,
			monacoError,
			setMonacoError,
			syncMonacoApply,
			reloadMonacoFromState,
			selectedRuleId,
			setSelectedRuleId,
			selectedRule,
			depsDraft,
			setDepsDraft,
			handleDepsBlur,
			logicPathPick,
			setLogicPathPick,
			logicPathFieldHint,
			cycles,
			rulesForSelectedExact,
			rulesForSelectedSubtree,
			rulesWhereSelectedIsDependency,
			handleAddFieldPreset,
			handleAddFieldPresetAt,
			handleAddFieldPresetAtParent,
			reorderRootFieldKeys,
			applyGroupFieldOrders,
			updateField,
			handleDeleteField,
			handleToggleRequired,
			handleWidgetChange,
			handleObjectFieldTemplateChange,
			handleDictionaryCodeChange,
			addRule,
			addRuleForTargetPath,
			openLogicTabWithRule,
			updateRulePatch,
			removeSelectedRule,
			previewEvalNote,
			resolvedField,
			selectedPointerParent,
			isRequired,
			currentWidget,
			currentObjectFieldTemplate,
			isObjectGroup,
			groupChildFields,
			isCustomUiGroup,
			customUiGroupSummary,
			canBindDictionary,
			currentDictionaryCode,
			dictionaryBindingMissing,
		}),
		[
			templateId,
			mainTab,
			jsonSchema,
			uiSchema,
			logic,
			formData,
			selectedPointer,
			treeRows,
			fieldPathHints,
			rootFieldKeys,
			v2Dictionaries,
			dictionaryCodeByPointer,
			dictionaryIdByCode,
			enumMapByCode,
			dictionaryEnumsLoading,
			previewSchema,
			previewUiSchema,
			calculationItems,
			taskTriggerItems,
			liveFormData,
			calculationLoading,
			calculationError,
			logicExtraErrors,
			logicValidationIssueCount,
			legacyStageEvaluation,
			schemaMonacoText,
			uiMonacoText,
			monacoError,
			selectedRuleId,
			selectedRule,
			depsDraft,
			logicPathPick,
			logicPathFieldHint,
			cycles,
			rulesForSelectedExact,
			rulesForSelectedSubtree,
			rulesWhereSelectedIsDependency,
			handleAddFieldPreset,
			handleAddFieldPresetAt,
			handleAddFieldPresetAtParent,
			reorderRootFieldKeys,
			applyGroupFieldOrders,
			updateField,
			handleDeleteField,
			handleToggleRequired,
			handleWidgetChange,
			handleObjectFieldTemplateChange,
			handleDictionaryCodeChange,
			addRule,
			addRuleForTargetPath,
			openLogicTabWithRule,
			updateRulePatch,
			removeSelectedRule,
			previewEvalNote,
			resolvedField,
			selectedPointerParent,
			isRequired,
			currentWidget,
			currentObjectFieldTemplate,
			isObjectGroup,
			groupChildFields,
			isCustomUiGroup,
			customUiGroupSummary,
			canBindDictionary,
			currentDictionaryCode,
			dictionaryBindingMissing,
			handleDepsBlur,
			calculationLoading,
			calculationError,
		],
	);

	if (!template || activeVersionLoading) {
		return (
			<Typography>
				{wording === "adminSchema"
					? <FullScreenLoader />
					: "Шаблон не найден или загрузка..."}
			</Typography>
		);
	}

	if (!activeVersion) {
		return (
			<Flex
				flexDirection="column"
				gap={2}
				sx={{ p: 1 }}
				data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.noDraft}
			>
				<Typography variant="subtitle1" fontWeight={600}>
					Нет активного черновика
				</Typography>
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

	if (layoutMode === "logic-only") {
		return (
			<>
				<SchemaEditorProvider value={editorContext}>
					<SchemaLogicPanel embedded />
				</SchemaEditorProvider>
				{activeVersion ? (
					<V2TemplateSaveDialog
						open={saveDialogOpen}
						onClose={() => setSaveDialogOpen(false)}
						versionNumber={activeVersion.versionNumber}
						versionStatus={activeVersion.status}
						isSystemCurrent={isSystemCurrent}
						savePending={savePending}
						onSaveAsNewVersion={handleSaveAsNewVersion}
						onSaveInPlace={handleSaveInPlace}
					/>
				) : null}
			</>
		);
	}

	return (
		<SchemaEditorProvider value={editorContext}>
			<Card
				data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.schemaEditor}
				height="100%"
				padding="0"
				overflow="hidden"
				sx={{
					flex: 1,
					minHeight: 480,
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
					p: 0,
					"& > div": {
						flex: 1,
						minHeight: 0,
						height: "100%",
						display: "flex",
						flexDirection: "column",
					},
				}}
			>
				<Box
					sx={{ flex: 1, minHeight: 0, position: "relative", width: "100%" }}
				>
					<SchemaEditorDockProvider
						mainTab={mainTab}
						onMainTabChange={setMainTab}
					>
						<V2SchemaEditorDockLayout />
					</SchemaEditorDockProvider>
				</Box>
			</Card>
			{activeVersion ? (
				<V2TemplateSaveDialog
					open={saveDialogOpen}
					onClose={() => setSaveDialogOpen(false)}
					versionNumber={activeVersion.versionNumber}
					versionStatus={activeVersion.status}
					isSystemCurrent={isSystemCurrent}
					savePending={savePending}
					onSaveAsNewVersion={handleSaveAsNewVersion}
					onSaveInPlace={handleSaveInPlace}
				/>
			) : null}
		</SchemaEditorProvider>
	);
};
