import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { V2LogicRuleDto } from "@smart-anketa/api-contract";

export type SchemaEditorMainTab = "designer" | "json" | "logic" | "preview";

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
	dictionaryCode: string | null;
	codesPreview: string[] | null;
};

export type SchemaEditorSnapshot = {
	jsonSchema: RJSFSchema;
	uiSchema: UiSchema;
	logic: { rules: V2LogicRuleDto[] };
};
