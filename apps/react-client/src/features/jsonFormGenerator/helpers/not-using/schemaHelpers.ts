import fieldsSchema from "../../schemas/not-using/fields_schema.json";
import relationsWidgets from "../../schemas/not-using/relations_widgets.json";

// Type definitions
export type Dictionary = {
	values: string[];
	displayNames?: string[];
};
export type Dictionaries = Record<string, Dictionary>;
export type FieldsSchema = typeof fieldsSchema;
export type RelationsWidgets = typeof relationsWidgets;

// Helper to inject enums from dictionaries into a field config
function injectDictionaries(fieldConfig: any, dictionaries: Dictionaries): any {
	if (fieldConfig.dictionary && dictionaries[fieldConfig.dictionary]) {
		fieldConfig.enum = dictionaries[fieldConfig.dictionary].values;
		if (dictionaries[fieldConfig.dictionary].displayNames) {
			fieldConfig.enumNames = dictionaries[fieldConfig.dictionary].displayNames;
		}
	}
	// Recursively handle nested items/properties
	if (fieldConfig.items) {
		fieldConfig.items = injectDictionaries(fieldConfig.items, dictionaries);
	}
	if (fieldConfig.properties) {
		for (const [key, prop] of Object.entries(fieldConfig.properties)) {
			fieldConfig.properties[key] = injectDictionaries(prop, dictionaries);
		}
	}
	return fieldConfig;
}

// Generate the final JSON Schema by assembling properties, required, and injecting enums
export function generateFinalSchema(
	fieldsSchema: FieldsSchema,
	dictionaries: Dictionaries,
	required: string[],
): any {
	const properties: Record<string, any> = {};
	for (const [field, config] of Object.entries(fieldsSchema)) {
		properties[field] = injectDictionaries({ ...config }, dictionaries);
	}
	return {
		$schema: "http://json-schema.org/draft-07/schema#",
		title: "Project Assessment Form",
		type: "object",
		properties,
		required,
	};
}

// Generate the final UI Schema from relationsWidgets
export function generateFinalUiSchema(
	relationsWidgets: RelationsWidgets,
): Record<string, any> {
	const uiSchema: Record<string, any> = {};

	for (const [field, config] of Object.entries(relationsWidgets)) {
		uiSchema[field] = {};
		if ((config as any).widget) {
			uiSchema[field]["ui:widget"] = (config as any).widget;
		}
		if ((config as any).options) {
			uiSchema[field]["ui:options"] = (config as any).options;
		}
	}

	return uiSchema;
}
