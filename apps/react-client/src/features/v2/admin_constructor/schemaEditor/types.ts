import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { V2LogicRuleDto } from "@smart-anketa/api-contract";
import type { SchemaEditorDockPanelId } from "./constants";

export type { SchemaEditorDockPanelId };
export type SchemaEditorMainTab = SchemaEditorDockPanelId;

export type SchemaFieldRow = {
	pointer: string;
	depth: number;
	key: string;
	typeLabel: string;
};

export type FieldPathHint = {
	pointer: string;
	key: string;
	title: string | null;
	varPath: string;
	schemaFieldUid?: string | null;
	dictionaryCode: string | null;
	codesPreview: string[] | null;
};

export type SchemaEditorSnapshot = {
	jsonSchema: RJSFSchema;
	uiSchema: UiSchema;
	logic: { rules: V2LogicRuleDto[] };
};
