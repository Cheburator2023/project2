import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { V2DictionaryDto, V2LogicRuleDto } from "@smart-anketa/api-contract";
import { createContext, useContext } from "react";
import type { FieldPathHint, SchemaEditorMainTab, SchemaFieldRow } from "./types";

export type SchemaEditorContextValue = {
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

	selectedPointer: string | null;
	setSelectedPointer: (pointer: string | null) => void;

	treeRows: SchemaFieldRow[];
	fieldPathHints: FieldPathHint[];
	rootFieldKeys: string[];

	v2Dictionaries: V2DictionaryDto[];
	dictionaryCodeByPointer: Map<string, string>;
	dictionaryIdByCode: Map<string, string>;
	enumMapByCode: Record<string, { enums: string[]; enumNames: string[] }>;
	dictionaryEnumsLoading: boolean;

	previewSchema: RJSFSchema;
	previewUiSchema: UiSchema;

	schemaMonacoText: string;
	setSchemaMonacoText: (v: string) => void;
	uiMonacoText: string;
	setUiMonacoText: (v: string) => void;
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

	handleAddFieldPreset: (preset: RJSFSchema) => void;
	handleAddFieldPresetAt: (preset: RJSFSchema, index: number) => void;
	handleAddFieldPresetAtParent: (
		parentPointer: string,
		preset: RJSFSchema,
		index: number,
	) => void;
	reorderRootFieldKeys: (orderedKeys: string[]) => void;
	applyGroupFieldOrders: (orders: Record<string, string[]>) => void;
	updateField: (patch: Partial<RJSFSchema>) => void;
	handleDeleteField: () => void;
	handleToggleRequired: (checked: boolean) => void;
	handleWidgetChange: (widget: string) => void;
	handleObjectFieldTemplateChange: (template: string) => void;
	handleDictionaryCodeChange: (code: string) => void;
	addRule: () => void;
	addRuleForTargetPath: (rawTarget: string) => void;
	openLogicTabWithRule: (ruleId: string) => void;
	updateRulePatch: (patch: Partial<V2LogicRuleDto>) => void;
	removeSelectedRule: () => void;
	previewEvalNote: React.ReactNode;

	resolvedField: RJSFSchema | undefined;
	selectedPointerParent: ReturnType<typeof import("../utils/schemaPaths").parentOfPointer>;
	isRequired: boolean;
	currentWidget: string;
	currentObjectFieldTemplate: string;
	isObjectGroup: boolean;
	groupChildFields: Array<{ key: string; title: string; typeLabel: string }>;
	isCustomUiGroup: boolean;
	customUiGroupSummary: string | null;
	canBindDictionary: boolean;
	currentDictionaryCode: string;
	dictionaryBindingMissing: boolean;
};

const SchemaEditorContext = createContext<SchemaEditorContextValue | null>(null);

export function SchemaEditorProvider({
	value,
	children,
}: {
	value: SchemaEditorContextValue;
	children: React.ReactNode;
}) {
	return (
		<SchemaEditorContext.Provider value={value}>{children}</SchemaEditorContext.Provider>
	);
}

export function useSchemaEditor(): SchemaEditorContextValue {
	const ctx = useContext(SchemaEditorContext);
	if (!ctx) {
		throw new Error("useSchemaEditor must be used within SchemaEditorProvider");
	}
	return ctx;
}
