import type { ErrorSchema, RJSFSchema, UiSchema } from "@rjsf/utils";
import type {
	V2DictionaryDto,
	V2LogicRuleDto,
} from "@smart-anketa/api-contract";
import { createContext, useContext } from "react";
import type {
	CalculationItem,
	TaskTriggerItem,
} from "../utils/calculationEngine";
import type { V2LegacyStageEvaluationDto } from "@smart-anketa/api-contract";
import type {
	FieldPathHint,
	SchemaEditorMainTab,
	SchemaFieldRow,
} from "./types";
import type { SchemaEditorDraftSnapshot } from "../utils/schemaEditorLocalDraft";
import type { SchemaFieldChangeInfo } from "./schemaFieldTreeChanges";
import type { LogicValidationIssue } from "../utils/logicValidation";
import type {
	SchemaEditorIssue,
} from "./collectSchemaEditorIssues";
import type { TypicalWorkSchemaConsistencyIssue } from "@smart-anketa/api-contract";

export type SchemaEditorContextValue = {
	templateId: string;
	mainTab: SchemaEditorMainTab;
	setMainTab: (tab: SchemaEditorMainTab) => void;

	jsonSchema: RJSFSchema;
	setJsonSchema: React.Dispatch<React.SetStateAction<RJSFSchema>>;
	uiSchema: UiSchema;
	setUiSchema: React.Dispatch<React.SetStateAction<UiSchema>>;
	logic: { rules: V2LogicRuleDto[] };
	setLogic: React.Dispatch<React.SetStateAction<{ rules: V2LogicRuleDto[] }>>;
	formData: Record<string, unknown>;
	setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
	resetPreviewForm: () => void;
	previewResetPending: boolean;
	previewFormRemountKey: number;

	selectedPointer: string | null;
	setSelectedPointer: (pointer: string | null) => void;

	treeRows: SchemaFieldRow[];
	baselineSnapshot: SchemaEditorDraftSnapshot | null;
	fieldChangeByPointer: Map<string, SchemaFieldChangeInfo>;
	fieldPathHints: FieldPathHint[];
	rootFieldKeys: string[];

	v2Dictionaries: V2DictionaryDto[];
	dictionaryCodeByPointer: Map<string, string>;
	dictionaryIdByCode: Map<string, string>;
	enumMapByCode: Record<string, { enums: string[]; enumNames: string[] }>;
	dictionaryEnumsLoading: boolean;

	previewSchema: RJSFSchema;
	previewUiSchema: UiSchema;
	calculationItems: CalculationItem[];
	taskTriggerItems: TaskTriggerItem[];
	liveFormData: Record<string, unknown>;
	calculationLoading: boolean;
	calculationError: string | null;
	requestCalculationRefresh: () => void;
	logicExtraErrors: ErrorSchema;
	logicValidationIssueCount: number;
	logicValidationIssues: LogicValidationIssue[];
	legacyStageEvaluation: V2LegacyStageEvaluationDto | null;
	schemaConsistencyIssues: TypicalWorkSchemaConsistencyIssue[];
	navigateToSchemaEditorIssue: (issue: SchemaEditorIssue) => void;

	schemaMonacoText: string;
	setSchemaMonacoText: (v: string) => void;
	uiMonacoText: string;
	setUiMonacoText: (v: string) => void;
	logicMonacoText: string;
	setLogicMonacoText: (v: string) => void;
	monacoError: string | null;
	setMonacoError: (v: string | null) => void;
	syncMonacoApply: () => void;
	reloadMonacoFromState: () => void;

	selectedRuleId: string | null;
	setSelectedRuleId: (id: string | null) => void;
	selectedRule: V2LogicRuleDto | undefined;
	depsDraft: string;
	setDepsDraft: (v: string) => void;
	handleDepsBlur: () => void;
	logicPathPick: string;
	setLogicPathPick: (v: string) => void;
	logicPathFieldHint: FieldPathHint | undefined;
	cycles: string[];

	rulesForSelectedExact: V2LogicRuleDto[];
	rulesForSelectedSubtree: V2LogicRuleDto[];
	rulesWhereSelectedIsDependency: V2LogicRuleDto[];

	handleAddFieldPreset: (preset: RJSFSchema) => void;
	handleAddFieldPresetAt: (preset: RJSFSchema, index: number) => void;
	handleAddFieldPresetAtParent: (
		parentPointer: string,
		preset: RJSFSchema,
		index: number,
		uiOptions?: Record<string, unknown>,
		uiBranch?: Record<string, unknown>,
	) => string | null;
	placeTypicalWorkInStreamBlock: (
		streamExecutor: import("@smart-anketa/api-contract").V2ExecutorStreamLabel,
		preferredPointer?: string | null,
	) => string | null;
	reorderRootFieldKeys: (orderedKeys: string[]) => void;
	applyGroupFieldOrders: (
		finalOrders: Record<string, string[]>,
		initialOrders: Record<string, string[]>,
	) => void;
	moveCanvasField: (
		sourcePointer: string,
		targetParentPointer: string,
		targetIndex: number,
	) => void;
	duplicateCanvasField: (sourcePointer: string) => void;
	canUndoDraft: boolean;
	canRedoDraft: boolean;
	undoDraft: () => void;
	redoDraft: () => void;
	recordDraftHistory: () => void;
	updateField: (
		patch: Partial<RJSFSchema>,
		options?: { recordHistory?: boolean },
	) => void;
	patchUiSchema: (
		updater: (prev: UiSchema) => UiSchema,
		options?: { recordHistory?: boolean },
	) => void;
	handleDeleteField: (pointer?: string | null) => Promise<boolean>;
	getFieldDeleteImpact: (
		pointer: string,
	) => Promise<
		import("@smart-anketa/api-contract").V2TypicalWorkSchemaFieldSyncImpactDto
	>;
	handleToggleRequired: (checked: boolean) => void;
	handleWidgetChange: (widget: string) => void;
	handleDictionaryCodeChange: (code: string) => void;
	addRule: () => void;
	addRuleForTargetPath: (rawTarget: string) => void;
	openLogicTabWithRule: (ruleId: string) => void;
	openLogicTabWithPointer: (pointer: string) => void;
	/** Id параметра (`schema:…`) для подсветки в селекте «Параметр-триггер». */
	triggerParamPickId: string | null;
	openLogicTabWithTriggerParam: (pointer: string) => void;
	clearTriggerParamPick: () => void;
	openTypicalWorksTab: (workId?: string) => void;
	updateRulePatch: (patch: Partial<V2LogicRuleDto>) => void;
	removeSelectedRule: () => void;
	previewEvalNote: React.ReactNode;

	resolvedField: RJSFSchema | undefined;
	selectedPointerParent: ReturnType<
		typeof import("../utils/schemaPaths").parentOfPointer
	>;
	isRequired: boolean;
	currentWidget: string;
	isObjectGroup: boolean;
	groupChildFields: Array<{ key: string; title: string; typeLabel: string }>;
	hasArrayObjectItems: boolean;
	arrayItemChildFields: Array<{
		key: string;
		title: string;
		typeLabel: string;
	}>;
	isCustomUiGroup: boolean;
	customUiGroupSummary: string | null;
	canBindDictionary: boolean;
	currentDictionaryCode: string;
	dictionaryBindingMissing: boolean;

	/** Состояние автосохранения открытой типовой работы. */
	typicalWorkSaveDisplay: import("./typicalWorkSaveGate").TypicalWorkSaveGateState | null;
	typicalWorkSaveBlocked: boolean;
	typicalWorkSaveBlockedMessage: string | null;
	registerTypicalWorkSaveGate: (
		state: import("./typicalWorkSaveGate").TypicalWorkSaveGateState | null,
	) => void;
};

const SchemaEditorContext = createContext<SchemaEditorContextValue | null>(
	null,
);

export function SchemaEditorProvider({
	value,
	children,
}: {
	value: SchemaEditorContextValue;
	children: React.ReactNode;
}) {
	return (
		<SchemaEditorContext.Provider value={value}>
			{children}
		</SchemaEditorContext.Provider>
	);
}

export function useSchemaEditor(): SchemaEditorContextValue {
	const ctx = useContext(SchemaEditorContext);
	if (!ctx) {
		throw new Error("useSchemaEditor must be used within SchemaEditorProvider");
	}
	return ctx;
}
