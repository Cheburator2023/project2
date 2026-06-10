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

function schemaEnumOptions(schema: RJSFSchema | undefined): SelectOption[] {
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

function applyKnownLabels(
	options: SelectOption[],
	labelByValue: Map<string, string>,
	uiEnumNames?: string[],
): SelectOption[] {
	return options.map((option, index) => {
		const value = String(option.value);
		const uiName = uiEnumNames?.[index];
		const schemaLabel = labelByValue.get(value);
		const label =
			typeof uiName === "string" && uiName.trim()
				? uiName
				: schemaLabel && schemaLabel !== value
					? schemaLabel
					: option.label !== value
						? option.label
						: value;
		return { value: option.value, label };
	});
}

/** Опции select: подписи из ui:options.enumNames / schema.enumNames; значение — код. */
export function buildSelectOptions(
	options: WidgetProps["options"] | undefined,
	schema: RJSFSchema | undefined,
): SelectOption[] {
	const schemaOptions = schemaEnumOptions(schema);
	const labelByValue = new Map(
		schemaOptions.map((option) => [option.value, option.label]),
	);
	const uiEnumNames = Array.isArray(options?.enumNames)
		? (options.enumNames as string[])
		: undefined;

	const fromDefaultEnums =
		options?.defaultEnums?.map((item: string) => ({
			value: item,
			label: item,
		})) ?? [];
	const fromEnumOptions =
		(options?.enumOptions as SelectOption[] | undefined) ?? [];

	if (fromEnumOptions.length > 0 || fromDefaultEnums.length > 0) {
		return [
			...applyKnownLabels(fromDefaultEnums, labelByValue, uiEnumNames),
			...applyKnownLabels(fromEnumOptions, labelByValue, uiEnumNames),
		];
	}

	return schemaOptions;
}

export function selectLabelForValue(
	value: string,
	optionsForSelect: SelectOption[],
): string {
	return (
		optionsForSelect.find((option) => option.value === value)?.label ?? value
	);
}
