import type { RJSFSchema } from "@rjsf/utils";
import type { WidgetProps } from "@rjsf/utils";

export type SelectOption = { value: string; label: string };

function enumPairFromSchema(
	enumValues: unknown[] | undefined,
	enumNames: string[] | undefined,
): SelectOption[] {
	if (!Array.isArray(enumValues) || enumValues.length === 0) return [];
	return enumValues.map((rawValue, index) => {
		const value = String(rawValue);
		const name = enumNames?.[index];
		return {
			value,
			label: typeof name === "string" && name.trim() ? name : value,
		};
	});
}

/** Опции select: ui:options.enumOptions, schema.enum/enumNames (справочники). */
export function buildSelectOptions(
	options: WidgetProps["options"] | undefined,
	schema: RJSFSchema | undefined,
): SelectOption[] {
	const fromDefaultEnums =
		options?.defaultEnums?.map((item: string) => ({
			value: item,
			label: item,
		})) ?? [];
	const fromEnumOptions = (options?.enumOptions as SelectOption[] | undefined) ?? [];

	if (fromEnumOptions.length > 0 || fromDefaultEnums.length > 0) {
		return [...fromDefaultEnums, ...fromEnumOptions];
	}

	const fromSchema = enumPairFromSchema(
		schema?.enum as unknown[] | undefined,
		schema?.enumNames as string[] | undefined,
	);
	if (fromSchema.length > 0) return fromSchema;

	const itemsSchema =
		schema?.items && typeof schema.items === "object" && !Array.isArray(schema.items)
			? (schema.items as RJSFSchema)
			: undefined;

	return enumPairFromSchema(
		itemsSchema?.enum as unknown[] | undefined,
		itemsSchema?.enumNames as string[] | undefined,
	);
}

export function selectLabelForValue(
	value: string,
	optionsForSelect: SelectOption[],
): string {
	return (
		optionsForSelect.find((option) => option.value === value)?.label ?? value
	);
}
