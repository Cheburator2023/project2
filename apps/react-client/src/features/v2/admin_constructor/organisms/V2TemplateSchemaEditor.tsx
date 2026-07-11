import {
	useActivateV2TemplateVersionAsCurrent,
	useCreateV2TemplateVersion,
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
	pathForAdminV2TemplateRead,
	pathForPlaygroundV2Template,
	pathForPlaygroundV2TemplateRead,
} from "@react-client/routing/common/pathHelpers";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import type {
	CreateV2TemplateVersionRequestDto,
	V2LogicRuleDto,
} from "@smart-anketa/api-contract";
import {
	buildEmptyV2AnketaTemplateSnapshot,
	resolveV2AnketaCanvasUiKind,
	syncTriggerGatedGroupActivationFromTypicalWorks,
} from "@smart-anketa/api-contract";
import { evaluateRuleLive } from "../schemaEditor/panels/logicPanel/helpers";
import { nanoid } from "nanoid";
import { Box, Button, Typography } from "@mui/material";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useBrowserRouterNavigationBlocker } from "../hooks/useBrowserRouterNavigationBlocker";
import { clampCanvasInsertIndex } from "../schemaEditor/schemaCanvasTree";
import { SchemaEditorProvider } from "../schemaEditor/SchemaEditorContext";
import type { SchemaEditorContextValue } from "../schemaEditor/SchemaEditorContext";
import type { SchemaEditorMainTab } from "../schemaEditor/types";
import { SchemaEditorDockProvider } from "../schemaEditor/SchemaEditorDockContext";
import {
	canBindDictionaryToField,
	isDictionaryMultiField,
	isLayoutGroupUi,
	readLeafUiOptions,
} from "../schemaEditor/propertiesFieldKind";
import { V2SchemaEditorDockLayout } from "../schemaEditor/V2SchemaEditorDockLayout";
import {
	LOGIC_TAB_QUERY,
} from "../schemaEditor/panels/typicalWorksPanel/typicalWorksUi";
import { schemaParamIdFromPointer } from "../schemaEditor/panels/typicalWorksPanel/schemaWorkParameters";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../testIds";
import { dependencyCycleWarnings } from "../utils/logicGraphAnalysis";
import { useDebouncedV2Calculation } from "../hooks/useDebouncedV2Calculation";
import { derivePreviewSchemas } from "../utils/logicPreview";
import { mapCalculationResult } from "../utils/mapCalculationResult";
import {
	collectDictionaryCodesFromUiSchema,
	mergeDictionaryEnumsIntoPreviewSchema,
	mergeDictionaryOptionsIntoPreviewUiSchema,
} from "../utils/dictionaryPreview";
import {
	EMPTY_JSON_SCHEMA,
	coerceJsonSchema,
	coerceDictionariesSnapshot,
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
	applyGroupFieldOrdersToUiSchema,
	buildDictionaryMultiSchemaPatch,
	buildFieldTypeTransitionPatch,
	duplicateFieldAtPointer,
	insertChildPropertyAt,
	insertKeyToUiOrderAtPointer,
	getObjectItemsSchema,
	isObjectFieldGroup,
	listOrderedChildKeys,
	listSchemaFields,
	mergeUiBranchAtPointer,
	movePropertyAtPointer,
	moveUiSchemaBranchAtPointer,
	patchUiOptionsAtPointer,
	removePropertyAtPointer,
	removeUiSchemaAtPointer,
	readUiSchemaBranchAtPointer,
	reorderRootProperties,
	resolveSchemaNode,
	setUiDictionaryCodeAtPointer,
	stripUiObjectFieldTemplatesFromUi,
	setUiWidgetAtPointer,
	toggleRequiredAtPointer,
	updatePropertyAtPointer,
} from "../utils/schemaMutators";
import { FullScreenLoader } from "@react-client/common/muiCustom/FullScreenLoader";
import { V2TemplateSaveDialog } from "./V2TemplateSaveDialog";
import { SchemaEditorLeaveDialog } from "./SchemaEditorLeaveDialog";
import type { V2TemplateStatus } from "@smart-anketa/api-contract";
import { isCanvasStockField } from "../schemaEditor/canvasStockFields";
import { buildSchemaFieldChangeMap } from "../schemaEditor/schemaFieldTreeChanges";
import {
	schemaEditorDraftSnapshotsEqual,
	snapshotFromTemplateVersion,
	type SchemaEditorDraftSnapshot,
} from "../utils/schemaEditorLocalDraft";
import {
	resolveEffectiveLogicRules,
	resolveRulesForSelectedExact,
	resolveRulesForSelectedSubtree,
	resolveRulesWhereSelectedIsDependency,
} from "../utils/schemaEditorEffectiveLogic";
import { placeTypicalWorkInStream } from "../schemaEditor/placeTypicalWorkInStream";
import {
	canAddTypicalWorkUnderParent,
	isTypicalWorkFieldAtPointer,
	isTypicalWorkPaletteUiOptions,
	TYPICAL_WORK_ALREADY_IN_SUBTREE_MESSAGE,
} from "../schemaEditor/typicalWorkCanvasConstraints";
import type { V2ExecutorStreamLabel } from "@smart-anketa/api-contract";

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
	onActivateAsCurrent: () => void;
	savePending: boolean;
	activatePending: boolean;
	canActivateAsCurrent: boolean;
	hasUnsavedChanges: boolean;
	getExternalPreviewPath: () => string | null;
	onOpenLogic: () => void;
};

type DraftHistorySnapshot = {
	jsonSchema: RJSFSchema;
	uiSchema: UiSchema;
	selectedPointer: string | null;
};

const DRAFT_HISTORY_LIMIT = 50;

interface V2TemplateSchemaEditorProps {
	templateId: string;
	/** Версия из URL (`versionId`); без неё — черновик или актуальная опубликованная. */
	initialVersionId?: string | null;
	onVersionIdChange?: (versionId: string) => void;
	wording?: V2SchemaEditorWording;
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
	initialRuleId = null,
	initialPointer = null,
	onHeaderMetaChange,
	onHeaderActionsChange,
}: V2TemplateSchemaEditorProps) => {
	const navigate = useNavigate();
	const [, setSearchParams] = useSearchParams();
	const setLogicWorkspaceTab = useCallback(
		(tab: "works" | "dependencies" | "jsonlogic") => {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					next.set(LOGIC_TAB_QUERY, tab);
					return next;
				},
				{ replace: true },
			);
		},
		[setSearchParams],
	);
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
	const activateVersion = useActivateV2TemplateVersionAsCurrent();

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

	useEffect(() => {
		if (!activeVersionId || !onVersionIdChange || initialVersionId) return;
		onVersionIdChange(activeVersionId);
	}, [activeVersionId, initialVersionId, onVersionIdChange]);

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
	const [logicMonacoText, setLogicMonacoText] = useState(
		JSON.stringify({ rules: [] }, null, 2),
	);
	const [draftPast, setDraftPast] = useState<DraftHistorySnapshot[]>([]);
	const [draftFuture, setDraftFuture] = useState<DraftHistorySnapshot[]>([]);

	const [mainTab, setMainTab] = useState<SchemaEditorMainTab>("designer");

	const [selectedRuleId, setSelectedRuleId] = useState<string | null>(
		initialRuleId,
	);
	const [depsDraft, setDepsDraft] = useState("");
	const [monacoError, setMonacoError] = useState<string | null>(null);
	const [logicPathPick, setLogicPathPick] = useState<string>("");
	const [triggerParamPickId, setTriggerParamPickId] = useState<string | null>(
		null,
	);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

	const baselineSnapshotRef = useRef<SchemaEditorDraftSnapshot | null>(null);
	const [baselineSnapshot, setBaselineSnapshot] =
		useState<SchemaEditorDraftSnapshot | null>(null);
	const draftHydratedVersionIdRef = useRef<string | null>(null);
	const skipLeaveGuardRef = useRef(false);

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
		if (!initialRuleId) return;
		setSelectedRuleId(initialRuleId);
		setMainTab("logic");
		setLogicWorkspaceTab("jsonlogic");
	}, [initialRuleId, setLogicWorkspaceTab]);

	useEffect(() => {
		if (!initialPointer) return;
		setSelectedPointer(normalizeJsonPointer(initialPointer));
		setMainTab("logic");
		setLogicWorkspaceTab("dependencies");
	}, [initialPointer, setLogicWorkspaceTab]);

	const pushDraftHistory = useCallback(() => {
		const snapshot: DraftHistorySnapshot = {
			jsonSchema: structuredClone(jsonSchema),
			uiSchema: structuredClone(uiSchema),
			selectedPointer,
		};
		setDraftPast((prev) => [...prev, snapshot].slice(-DRAFT_HISTORY_LIMIT));
		setDraftFuture([]);
	}, [jsonSchema, uiSchema, selectedPointer]);

	const applyDraftSnapshot = useCallback((snapshot: DraftHistorySnapshot) => {
		setJsonSchema(snapshot.jsonSchema);
		setUiSchema(snapshot.uiSchema);
		setSelectedPointer(snapshot.selectedPointer);
		setSchemaMonacoText(JSON.stringify(snapshot.jsonSchema, null, 2));
		setUiMonacoText(JSON.stringify(snapshot.uiSchema, null, 2));
		setMonacoError(null);
	}, []);

	const undoDraft = useCallback(() => {
		setDraftPast((past) => {
			const previous = past[past.length - 1];
			if (!previous) return past;

			const current: DraftHistorySnapshot = {
				jsonSchema: structuredClone(jsonSchema),
				uiSchema: structuredClone(uiSchema),
				selectedPointer,
			};
			setDraftFuture((future) =>
				[current, ...future].slice(0, DRAFT_HISTORY_LIMIT),
			);
			applyDraftSnapshot(previous);
			return past.slice(0, -1);
		});
	}, [applyDraftSnapshot, jsonSchema, uiSchema, selectedPointer]);

	const redoDraft = useCallback(() => {
		setDraftFuture((future) => {
			const next = future[0];
			if (!next) return future;

			const current: DraftHistorySnapshot = {
				jsonSchema: structuredClone(jsonSchema),
				uiSchema: structuredClone(uiSchema),
				selectedPointer,
			};
			setDraftPast((past) => [...past, current].slice(-DRAFT_HISTORY_LIMIT));
			applyDraftSnapshot(next);
			return future.slice(1);
		});
	}, [applyDraftSnapshot, jsonSchema, uiSchema, selectedPointer]);

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
		if (!isAdminEditor || !activeVersionLoadError || !activeVersionError)
			return;
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

	const currentDraftSnapshot = useCallback(
		(): SchemaEditorDraftSnapshot => ({
			jsonSchema,
			uiSchema,
			logic,
			formData,
		}),
		[jsonSchema, uiSchema, logic, formData],
	);

	const applyDraftSnapshotToEditor = useCallback(
		(snapshot: SchemaEditorDraftSnapshot) => {
			setJsonSchema(snapshot.jsonSchema);
			setUiSchema(snapshot.uiSchema);
			setLogic(snapshot.logic);
			setFormData(snapshot.formData);
			setSchemaMonacoText(JSON.stringify(snapshot.jsonSchema, null, 2));
			setUiMonacoText(JSON.stringify(snapshot.uiSchema, null, 2));
			setLogicMonacoText(JSON.stringify(snapshot.logic, null, 2));
			setMonacoError(null);
		},
		[],
	);

	const syncDirtyFlag = useCallback(() => {
		const baseline = baselineSnapshotRef.current;
		if (!baseline) {
			setHasUnsavedChanges(false);
			return;
		}
		setHasUnsavedChanges(
			!schemaEditorDraftSnapshotsEqual(currentDraftSnapshot(), baseline),
		);
	}, [currentDraftSnapshot]);

	const commitBaselineToCurrent = useCallback(() => {
		const snapshot = currentDraftSnapshot();
		baselineSnapshotRef.current = snapshot;
		setBaselineSnapshot(snapshot);
		setHasUnsavedChanges(false);
	}, [currentDraftSnapshot]);

	useEffect(() => {
		if (!activeVersion?.id) {
			draftHydratedVersionIdRef.current = null;
			baselineSnapshotRef.current = null;
			setBaselineSnapshot(null);
			setHasUnsavedChanges(false);
			return;
		}

		if (draftHydratedVersionIdRef.current === activeVersion.id) return;

		const serverSnapshot = snapshotFromTemplateVersion(activeVersion);
		baselineSnapshotRef.current = serverSnapshot;
		setBaselineSnapshot(serverSnapshot);

		applyDraftSnapshotToEditor(serverSnapshot);
		setDraftPast([]);
		setDraftFuture([]);
		draftHydratedVersionIdRef.current = activeVersion.id;
		setHasUnsavedChanges(false);
	}, [activeVersion, applyDraftSnapshotToEditor]);

	useEffect(() => {
		if (!activeVersion?.id) return;
		if (draftHydratedVersionIdRef.current !== activeVersion.id) return;

		const timer = window.setTimeout(() => {
			syncDirtyFlag();
		}, 400);

		return () => window.clearTimeout(timer);
	}, [jsonSchema, uiSchema, logic, formData, activeVersion?.id, syncDirtyFlag]);

	const blocker = useBrowserRouterNavigationBlocker(
		({ currentLocation, nextLocation }) => {
			if (skipLeaveGuardRef.current) return false;
			// Панели/вкладки/версии редактора переключаются через query-параметры на
			// том же маршруте — это не уход со страницы, предупреждаем только при
			// смене pathname.
			return (
				hasUnsavedChanges &&
				currentLocation.pathname !== nextLocation.pathname
			);
		},
	);

	useEffect(() => {
		if (!hasUnsavedChanges) {
			setLeaveDialogOpen(false);
			if (blocker.state === "blocked") blocker.reset();
			return;
		}
		if (blocker.state === "blocked") {
			setLeaveDialogOpen(true);
		}
	}, [blocker.state, blocker.reset, hasUnsavedChanges]);

	// useEffect(() => {
	// 	if (!hasUnsavedChanges) return;
	// 	const onBeforeUnload = (event: BeforeUnloadEvent) => {
	// 		event.preventDefault();
	// 	};
	// 	window.addEventListener("beforeunload", onBeforeUnload);
	// 	return () => window.removeEventListener("beforeunload", onBeforeUnload);
	// }, [hasUnsavedChanges]);

	const getExternalPreviewPath = useCallback(() => {
		if (!activeVersion?.id) return null;
		return isAdminEditor
			? pathForAdminV2TemplateRead(templateId, activeVersion.id)
			: pathForPlaygroundV2TemplateRead(templateId, activeVersion.id);
	}, [activeVersion?.id, isAdminEditor, templateId]);

	const cycles = useMemo(
		() => dependencyCycleWarnings(logic.rules),
		[logic.rules],
	);

	const treeRows = useMemo(
		() => listSchemaFields(jsonSchema, "/", 0, uiSchema),
		[jsonSchema, uiSchema],
	);

	const fieldChangeByPointer = useMemo(() => {
		if (!baselineSnapshot) return new Map();
		return buildSchemaFieldChangeMap(baselineSnapshot, {
			jsonSchema,
			uiSchema,
		});
	}, [baselineSnapshot, jsonSchema, uiSchema]);

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
		jsonSchema: jsonSchema as Record<string, unknown>,
		uiSchema: uiSchema as Record<string, unknown>,
		enabled: Boolean(activeVersion?.id),
	});

	const mappedCalculation = useMemo(
		() => (calculationResult ? mapCalculationResult(calculationResult) : null),
		[calculationResult],
	);

	useEffect(() => {
		if (!mappedCalculation?.liveFormData) return;
		setFormData((prev) =>
			syncTriggerGatedGroupActivationFromTypicalWorks(
				prev,
				uiSchema,
				mappedCalculation.liveFormData,
			),
		);
	}, [mappedCalculation?.liveFormData, uiSchema]);

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
				jsonSchema,
			),
		[logicPreviewPack.previewSchema, uiSchema, enumMapByCode, jsonSchema],
	);

	const previewUiSchema = useMemo(
		() =>
			mergeDictionaryOptionsIntoPreviewUiSchema(
				logicPreviewPack.previewUiSchema,
				uiSchema,
				jsonSchema,
				enumMapByCode,
			),
		[logicPreviewPack.previewUiSchema, uiSchema, jsonSchema, enumMapByCode],
	);
	const calculationItems = logicPreviewPack.calculationItems;
	const taskTriggerItems = logicPreviewPack.taskTriggerItems;
	const liveFormData = logicPreviewPack.liveFormData;
	const logicExtraErrors = logicPreviewPack.extraErrors;
	const logicValidationIssueCount =
		logicPreviewPack.logicValidationIssues.length;
	const legacyStageEvaluation =
		mappedCalculation?.legacyStageEvaluation ?? null;

	const fieldPathHints = useMemo(() => {
		const ui = uiSchema as Record<string, unknown>;
		return listSchemaFields(jsonSchema, "/", 0, uiSchema)
			.filter((row) => {
				const leaf = readUiBranch(ui, pointerSegments(row.pointer));
				return !isLayoutGroupUi(readLeafUiOptions(leaf));
			})
			.map((row) => {
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

	const effectiveLogicRules = useMemo(
		() => resolveEffectiveLogicRules(logic, jsonSchema, uiSchema),
		[logic, jsonSchema, uiSchema],
	);

	const rulesForSelectedExact = useMemo(
		() =>
			resolveRulesForSelectedExact(
				effectiveLogicRules,
				selectedPointer,
				uiSchema,
				jsonSchema,
			),
		[effectiveLogicRules, selectedPointer, uiSchema, jsonSchema],
	);

	const rulesWhereSelectedIsDependency = useMemo(
		() =>
			resolveRulesWhereSelectedIsDependency(
				effectiveLogicRules,
				selectedPointer,
			),
		[effectiveLogicRules, selectedPointer],
	);

	const rulesForSelectedSubtree = useMemo(
		() =>
			resolveRulesForSelectedSubtree(effectiveLogicRules, selectedPointer),
		[effectiveLogicRules, selectedPointer],
	);

	const handleCreateDraft = async (mode: "empty" | "current") => {
		const emptySnapshot = buildEmptyV2AnketaTemplateSnapshot();
		const emptyDto: CreateV2TemplateVersionRequestDto = {
			jsonSchema: coerceJsonSchema(emptySnapshot.jsonSchema),
			uiSchema: coerceUiSchema(emptySnapshot.uiSchema),
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
					dictionariesSnapshot?: unknown;
				}>({
					url: `/v2/templates/${templateId}/versions/${template.currentVersionId}`,
					method: "GET",
				});

				dto = {
					jsonSchema: coerceJsonSchema(v.jsonSchema),
					uiSchema: coerceUiSchema(v.uiSchema),
					logic: coerceLogicGraph(v.logic),
					dictionariesSnapshot: coerceDictionariesSnapshot(
						v.dictionariesSnapshot,
					),
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
			uiSchema: stripUiObjectFieldTemplatesFromUi(
				uiSchema as Record<string, unknown>,
			) as UiSchema,
			logic,
			dictionariesSnapshot: {
				referencedDictionaryCodes: collectDictionaryCodesFromUiSchema(uiSchema),
			},
		}),
		[jsonSchema, logic, uiSchema],
	);

	const persistVersionInUrl = useCallback(
		(versionId: string, options?: { skipLeaveGuard?: boolean }) => {
			const apply = () => {
				if (onVersionIdChange) {
					onVersionIdChange(versionId);
					return;
				}
				const path = isAdminEditor
					? pathForAdminV2Template(templateId, versionId)
					: pathForPlaygroundV2Template(templateId, versionId);
				navigate(path, { replace: true });
			};

			if (!options?.skipLeaveGuard) {
				apply();
				return;
			}

			skipLeaveGuardRef.current = true;
			try {
				apply();
			} finally {
				window.setTimeout(() => {
					skipLeaveGuardRef.current = false;
				}, 0);
			}
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
			commitBaselineToCurrent();
			setLeaveDialogOpen(false);

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
		commitBaselineToCurrent,
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
				commitBaselineToCurrent();
				persistVersionInUrl(created.id, { skipLeaveGuard: true });

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
			commitBaselineToCurrent,
			createVersion,
			isAdminEditor,
			persistVersionInUrl,
			refetchVersions,
			templateId,
			versionSnapshotDto,
		],
	);

	const handleActivateAsCurrent = useCallback(async () => {
		if (!activeVersion || isSystemCurrent) return;

		try {
			if (activeVersion.status === "draft") {
				await updateVersion.mutateAsync({
					templateId,
					versionId: activeVersion.id,
					dto: versionSnapshotDto(),
				});
			}

			const activated = await activateVersion.mutateAsync({
				templateId,
				versionId: activeVersion.id,
			});
			await refetchVersions();
			commitBaselineToCurrent();
			persistVersionInUrl(activated.id, { skipLeaveGuard: true });

			if (isAdminEditor) {
				toast.success(
					`Версия v${activated.versionNumber} — актуальная схема системы`,
				);
			}
		} catch (error) {
			if (isAdminEditor) {
				toast.error("Не удалось сделать версию актуальной", {
					description: apiErrorMessage(error),
				});
			}
		}
	}, [
		activeVersion,
		activateVersion,
		isAdminEditor,
		isSystemCurrent,
		persistVersionInUrl,
		refetchVersions,
		templateId,
		updateVersion,
		versionSnapshotDto,
		commitBaselineToCurrent,
	]);

	const activateAsCurrentRef = useRef(handleActivateAsCurrent);
	activateAsCurrentRef.current = handleActivateAsCurrent;

	const savePending = updateVersion.isPending || createVersion.isPending;

	const syncMonacoApply = () => {
		let parsedSchema: unknown;
		let parsedUi: unknown;
		let parsedLogic: unknown;

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

		try {
			parsedLogic = JSON.parse(logicMonacoText);
		} catch {
			setMonacoError("JSON Logic: некорректный JSON");
			return;
		}

		if (
			!parsedSchema ||
			typeof parsedSchema !== "object" ||
			Array.isArray(parsedSchema)
		) {
			setMonacoError("JSON Schema: ожидается объект");
			return;
		}

		if (!parsedUi || typeof parsedUi !== "object" || Array.isArray(parsedUi)) {
			setMonacoError("UI Schema: ожидается объект");
			return;
		}

		if (
			!parsedLogic ||
			typeof parsedLogic !== "object" ||
			Array.isArray(parsedLogic)
		) {
			setMonacoError("JSON Logic: ожидается объект с массивом rules");
			return;
		}

		try {
			const nextSchema = coerceJsonSchema(parsedSchema);
			const nextUi = coerceUiSchema(parsedUi, nextSchema);
			const nextLogic = coerceLogicGraph(parsedLogic);
			listSchemaFields(nextSchema, "/", 0, nextUi);
			setJsonSchema(nextSchema);
			setUiSchema(nextUi);
			setLogic(nextLogic);
			setSchemaMonacoText(JSON.stringify(nextSchema, null, 2));
			setUiMonacoText(JSON.stringify(nextUi, null, 2));
			setLogicMonacoText(JSON.stringify(nextLogic, null, 2));
			setMonacoError(null);
		} catch (error) {
			setMonacoError(
				error instanceof Error
					? error.message
					: "Не удалось применить JSON — проверьте структуру схемы",
			);
		}
	};

	const reloadMonacoFromState = () => {
		setSchemaMonacoText(JSON.stringify(jsonSchema, null, 2));
		setUiMonacoText(JSON.stringify(uiSchema, null, 2));
		setLogicMonacoText(JSON.stringify(logic, null, 2));
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

	const isObjectGroup = isObjectFieldGroup(resolvedField);

	const groupChildFields = useMemo(() => {
		if (!isObjectGroup || !selectedPointer) return [];
		return listOrderedChildKeys(jsonSchema, selectedPointer, uiSchema).map(
			(key) => {
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
			},
		);
	}, [isObjectGroup, jsonSchema, selectedPointer, uiSchema]);

	const hasArrayObjectItems = Boolean(
		resolvedField && getObjectItemsSchema(resolvedField),
	);

	const arrayItemChildFields = useMemo(() => {
		if (!hasArrayObjectItems || !selectedPointer) return [];
		const itemsPointer = `${selectedPointer}/items`;
		return listOrderedChildKeys(jsonSchema, itemsPointer, uiSchema).map(
			(key) => {
				const childPointer = `${itemsPointer}/${key}`;
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
			},
		);
	}, [hasArrayObjectItems, jsonSchema, selectedPointer, uiSchema]);

	const leafUiOptions = readLeafUiOptions(leafUiBranch);

	const customUiOptionEntries = leafUiOptions
		? Object.entries(leafUiOptions).filter(([k]) => k !== "dictionaryCode")
		: [];

	const isCustomUiGroup =
		isObjectGroup &&
		(Boolean(currentWidget) ||
			customUiOptionEntries.length > 0 ||
			Boolean(leafUiBranch?.["ui:order"]));

	const customUiGroupSummary = isCustomUiGroup
		? [
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

	const canBindDictionary = canBindDictionaryToField(
		resolvedField,
		leafUiOptions,
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
				pushDraftHistory();
				setJsonSchema(next);
				setSelectedPointer(`/${key}`);
			}
		},
		[jsonSchema, pushDraftHistory],
	);

	const handleAddFieldPresetAtParent = useCallback(
		(
			parentPointer: string,
			preset: RJSFSchema,
			index: number,
			uiOptions?: Record<string, unknown>,
			uiBranch?: Record<string, unknown>,
		): string | null => {
			if (
				isTypicalWorkPaletteUiOptions(uiOptions) &&
				!canAddTypicalWorkUnderParent(jsonSchema, uiSchema, parentPointer)
			) {
				toast.error(TYPICAL_WORK_ALREADY_IN_SUBTREE_MESSAGE);
				return null;
			}

			const key = `field_${nanoid(8)}`;
			const parentSegs = pointerSegments(parentPointer);
			const safeIndex = clampCanvasInsertIndex(
				jsonSchema,
				parentPointer,
				uiSchema,
				index,
			);
			const next = insertChildPropertyAt(
				jsonSchema,
				parentSegs,
				key,
				preset,
				safeIndex,
			);
			if (next) {
				pushDraftHistory();
				setJsonSchema(next);
				const childPointer =
					parentPointer === "/" ? `/${key}` : `${parentPointer}/${key}`;
				setSelectedPointer(childPointer);
				setUiSchema((prev) => {
					let nextUi = insertKeyToUiOrderAtPointer(
						prev as Record<string, unknown>,
						parentPointer,
						key,
						safeIndex,
					);
					if (uiOptions && Object.keys(uiOptions).length > 0) {
						nextUi = patchUiOptionsAtPointer(nextUi, childPointer, uiOptions);
					}
					if (uiBranch && Object.keys(uiBranch).length > 0) {
						nextUi = mergeUiBranchAtPointer(nextUi, childPointer, uiBranch);
					}
					return nextUi as UiSchema;
				});
				return childPointer;
			}
			return null;
		},
		[jsonSchema, uiSchema, pushDraftHistory],
	);

	const placeTypicalWorkInStreamBlock = useCallback(
		(
			streamExecutor: V2ExecutorStreamLabel,
			preferredPointer?: string | null,
		): string | null => {
			const result = placeTypicalWorkInStream(
				jsonSchema,
				uiSchema as Record<string, unknown>,
				streamExecutor,
				preferredPointer,
			);
			if (!result) return null;
			pushDraftHistory();
			setJsonSchema(result.jsonSchema);
			setUiSchema(result.uiSchema as UiSchema);
			setSelectedPointer(result.typicalWorkPointer);
			return result.typicalWorkPointer;
		},
		[jsonSchema, uiSchema, pushDraftHistory],
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
		(
			finalOrders: Record<string, string[]>,
			initialOrders: Record<string, string[]>,
		) => {
			const nextSchema = applyGroupFieldOrdersToSchema(
				jsonSchema,
				initialOrders,
				finalOrders,
			);
			if (!nextSchema) return;
			setJsonSchema(nextSchema);
			setUiSchema(
				applyGroupFieldOrdersToUiSchema(
					uiSchema,
					jsonSchema,
					initialOrders,
					finalOrders,
				),
			);
		},
		[jsonSchema, uiSchema],
	);

	const moveCanvasField = useCallback(
		(
			sourcePointer: string,
			targetParentPointer: string,
			targetIndex: number,
		) => {
			if (
				isTypicalWorkFieldAtPointer(uiSchema as Record<string, unknown>, sourcePointer) &&
				!canAddTypicalWorkUnderParent(
					jsonSchema,
					uiSchema,
					targetParentPointer,
					sourcePointer,
				)
			) {
				toast.error(TYPICAL_WORK_ALREADY_IN_SUBTREE_MESSAGE);
				return;
			}

			const nextSchema = movePropertyAtPointer(
				jsonSchema,
				sourcePointer,
				targetParentPointer,
				targetIndex,
			);
			if (!nextSchema) return;

			pushDraftHistory();
			setJsonSchema(nextSchema);
			setUiSchema(
				moveUiSchemaBranchAtPointer(
					uiSchema as Record<string, unknown>,
					sourcePointer,
					targetParentPointer,
					targetIndex,
				) as UiSchema,
			);

			const key = pointerSegments(sourcePointer).at(-1);
			const nextPointer =
				key == null
					? null
					: targetParentPointer === "/"
						? `/${key}`
						: `${targetParentPointer.replace(/\/$/, "")}/${key}`;
			setSelectedPointer(nextPointer);
		},
		[jsonSchema, uiSchema, pushDraftHistory],
	);

	const duplicateCanvasField = useCallback(
		(sourcePointer: string) => {
			if (isTypicalWorkFieldAtPointer(uiSchema as Record<string, unknown>, sourcePointer)) {
				toast.error(TYPICAL_WORK_ALREADY_IN_SUBTREE_MESSAGE);
				return;
			}

			const newKey = `field_${nanoid(8)}`;
			const result = duplicateFieldAtPointer(
				jsonSchema,
				uiSchema as Record<string, unknown>,
				sourcePointer,
				newKey,
			);
			if (!result) return;

			pushDraftHistory();
			setJsonSchema(result.schema);
			setUiSchema(result.ui as UiSchema);
			setSelectedPointer(result.newPointer);
		},
		[jsonSchema, uiSchema, pushDraftHistory],
	);

	const recordDraftHistory = useCallback(() => {
		pushDraftHistory();
	}, [pushDraftHistory]);

	const updateField = useCallback(
		(patch: Partial<RJSFSchema>, options?: { recordHistory?: boolean }) => {
			if (!selectedPointer) return;
			if (options?.recordHistory !== false) {
				pushDraftHistory();
			}
			const segs = pointerSegments(selectedPointer);
			let effectivePatch = patch;

			if (typeof patch.type === "string") {
				effectivePatch = {
					...buildFieldTypeTransitionPatch(resolvedField, patch.type),
					...patch,
				};
			}

			try {
				const next = updatePropertyAtPointer(jsonSchema, segs, effectivePatch);
				if (next) {
					setJsonSchema(next);
					setMonacoError(null);
				} else {
					setMonacoError(`Не удалось обновить поле по пути ${selectedPointer}`);
				}
			} catch (error) {
				setMonacoError(
					error instanceof Error
						? error.message
						: "Не удалось применить изменение типа поля",
				);
			}
		},
		[jsonSchema, selectedPointer, resolvedField, pushDraftHistory],
	);

	const patchUiSchema = useCallback(
		(
			updater: (prev: UiSchema) => UiSchema,
			options?: { recordHistory?: boolean },
		) => {
			if (options?.recordHistory !== false) {
				pushDraftHistory();
			}
			setUiSchema(updater);
		},
		[pushDraftHistory],
	);

	const handleDeleteField = useCallback(
		(pointer?: string | null) => {
			const targetPointer = pointer ?? selectedPointer;
			if (!targetPointer) return;
			pushDraftHistory();
			const uiBranch = readUiSchemaBranchAtPointer(
				uiSchema as Record<string, unknown>,
				targetPointer,
			);
			if (resolveV2AnketaCanvasUiKind(uiBranch, { fieldPointer: targetPointer }) === "system") return;
			if (isCanvasStockField(uiSchema, targetPointer)) return;
			const segs = pointerSegments(targetPointer);
			const next = removePropertyAtPointer(jsonSchema, segs);
			if (next) {
				setJsonSchema(next);
				setUiSchema((prev) =>
					removeUiSchemaAtPointer(
						prev as Record<string, unknown>,
						targetPointer,
					),
				);
				const selected = normalizeJsonPointer(targetPointer);
				const subtreePrefix = `${selected}/`;
				setLogic((prev) => ({
					rules: prev.rules.filter((rule) => {
						const target = normalizeJsonPointer(rule.targetPath);
						if (target === selected || target.startsWith(subtreePrefix)) {
							return false;
						}
						return !rule.dependencies.some((dep) => {
							const normalized = normalizeJsonPointer(dep);
							return (
								normalized === selected || normalized.startsWith(subtreePrefix)
							);
						});
					}),
				}));
				setSelectedPointer(null);
			}
		},
		[jsonSchema, selectedPointer, uiSchema, pushDraftHistory],
	);

	const handleToggleRequired = useCallback(
		(checked: boolean) => {
			if (!selectedPointer) return;
			pushDraftHistory();
			const next = toggleRequiredAtPointer(
				jsonSchema,
				selectedPointer,
				checked,
			);
			if (next) setJsonSchema(next);
		},
		[jsonSchema, selectedPointer, pushDraftHistory],
	);

	const handleWidgetChange = useCallback(
		(widget: string) => {
			if (!selectedPointer) return;
			pushDraftHistory();
			const nextUi = setUiWidgetAtPointer(
				uiSchema as Record<string, unknown>,
				selectedPointer,
				widget.length ? widget : null,
			);
			setUiSchema(nextUi as UiSchema);
		},
		[selectedPointer, uiSchema, pushDraftHistory],
	);

	const handleDictionaryCodeChange = useCallback(
		(code: string) => {
			if (!selectedPointer) return;
			pushDraftHistory();
			const trimmed = code.trim();
			const nextUi = setUiDictionaryCodeAtPointer(
				uiSchema as Record<string, unknown>,
				selectedPointer,
				trimmed.length ? trimmed : null,
			);
			setUiSchema(nextUi as UiSchema);
			if (
				!trimmed.length &&
				isDictionaryMultiField(resolvedField, leafUiOptions)
			) {
				const segs = pointerSegments(selectedPointer);
				const next = updatePropertyAtPointer(
					jsonSchema,
					segs,
					buildDictionaryMultiSchemaPatch(false),
				);
				if (next) setJsonSchema(next);
			}
		},
		[
			selectedPointer,
			uiSchema,
			jsonSchema,
			resolvedField,
			leafUiOptions,
			pushDraftHistory,
		],
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

	const openLogicTabWithRule = useCallback(
		(ruleId: string) => {
			setMainTab("logic");
			setLogicWorkspaceTab("jsonlogic");
			setSelectedRuleId(ruleId);
		},
		[setLogicWorkspaceTab],
	);

	const openLogicTabWithPointer = useCallback(
		(pointer: string) => {
			const normalized = normalizeJsonPointer(pointer);
			setSelectedPointer(normalized);
			setMainTab("logic");
			setLogicWorkspaceTab("dependencies");
			setLogicPathPick(normalized);
		},
		[setLogicWorkspaceTab],
	);

	const clearTriggerParamPick = useCallback(() => {
		setTriggerParamPickId(null);
	}, []);

	const openLogicTabWithTriggerParam = useCallback(
		(pointer: string) => {
			const normalized = normalizeJsonPointer(pointer);
			setSelectedPointer(normalized);
			setLogicPathPick(normalized);
			setTriggerParamPickId(schemaParamIdFromPointer(normalized));
			setMainTab("logic");
			setLogicWorkspaceTab("works");
		},
		[setLogicWorkspaceTab],
	);

	const openLogicWorkspace = useCallback(() => {
		setMainTab("logic");
		setLogicWorkspaceTab("works");
	}, [setLogicWorkspaceTab]);

	useEffect(() => {
		if (!activeVersion) {
			onHeaderActionsChange?.(null);
			return;
		}

		onHeaderActionsChange?.({
			onSave: () => setSaveDialogOpen(true),
			onActivateAsCurrent: () => void activateAsCurrentRef.current(),
			savePending,
			activatePending:
				activateVersion.isPending ||
				(activeVersion.status === "draft" && updateVersion.isPending),
			canActivateAsCurrent: isAdminEditor && !isSystemCurrent,
			hasUnsavedChanges,
			getExternalPreviewPath,
			onOpenLogic: openLogicWorkspace,
		});
	}, [
		activeVersion,
		activateVersion.isPending,
		getExternalPreviewPath,
		hasUnsavedChanges,
		isAdminEditor,
		isSystemCurrent,
		onHeaderActionsChange,
		openLogicWorkspace,
		savePending,
		updateVersion.isPending,
	]);

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
				Значение условия на данных превью: <code>{JSON.stringify(raw)}</code>
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
			baselineSnapshot,
			fieldChangeByPointer,
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
			logicMonacoText,
			setLogicMonacoText,
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
			placeTypicalWorkInStreamBlock,
			reorderRootFieldKeys,
			applyGroupFieldOrders,
			moveCanvasField,
			duplicateCanvasField,
			canUndoDraft: draftPast.length > 0,
			canRedoDraft: draftFuture.length > 0,
			undoDraft,
			redoDraft,
			recordDraftHistory,
			updateField,
			patchUiSchema,
			handleDeleteField,
			handleToggleRequired,
			handleWidgetChange,
			handleDictionaryCodeChange,
			addRule,
			addRuleForTargetPath,
			openLogicTabWithRule,
			openLogicTabWithPointer,
			triggerParamPickId,
			openLogicTabWithTriggerParam,
			clearTriggerParamPick,
			updateRulePatch,
			removeSelectedRule,
			previewEvalNote,
			resolvedField,
			selectedPointerParent,
			isRequired,
			currentWidget,
			isObjectGroup,
			groupChildFields,
			hasArrayObjectItems,
			arrayItemChildFields,
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
			baselineSnapshot,
			fieldChangeByPointer,
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
			logicMonacoText,
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
			placeTypicalWorkInStreamBlock,
			reorderRootFieldKeys,
			applyGroupFieldOrders,
			moveCanvasField,
			duplicateCanvasField,
			draftPast.length,
			draftFuture.length,
			undoDraft,
			redoDraft,
			recordDraftHistory,
			updateField,
			patchUiSchema,
			handleDeleteField,
			handleToggleRequired,
			handleWidgetChange,
			handleDictionaryCodeChange,
			addRule,
			addRuleForTargetPath,
			openLogicTabWithRule,
			openLogicTabWithPointer,
			triggerParamPickId,
			openLogicTabWithTriggerParam,
			clearTriggerParamPick,
			updateRulePatch,
			removeSelectedRule,
			previewEvalNote,
			resolvedField,
			selectedPointerParent,
			isRequired,
			currentWidget,
			isObjectGroup,
			groupChildFields,
			hasArrayObjectItems,
			arrayItemChildFields,
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
			<Typography component="div">
				{wording === "adminSchema" ? (
					<FullScreenLoader />
				) : (
					"Шаблон не найден или загрузка..."
				)}
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

	const leaveDialog = (
		<SchemaEditorLeaveDialog
			open={leaveDialogOpen && hasUnsavedChanges}
			onStay={() => {
				setLeaveDialogOpen(false);
				if (blocker.state === "blocked") blocker.reset();
			}}
			onLeave={() => {
				setLeaveDialogOpen(false);
				if (blocker.state === "blocked") blocker.proceed();
			}}
		/>
	);

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
			{leaveDialog}
		</SchemaEditorProvider>
	);
};
