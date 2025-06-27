import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import type { WidgetProps } from "@rjsf/utils";
import type React from "react";

export const MultiSelectAutocompleteWidget = ({
	id,
	label,
	options,
	value,
	onChange,
	required,
	readonly,
	disabled,
	...rest
}: WidgetProps) => {
	// The enumOptions from RJSF are of the format { label: string, value: any }
	// We extract the string values for the Autocomplete's `options` prop.
	const choices = options.enumOptions?.map((option) => option.value) || [];

	return (
		<Autocomplete
			multiple
			{...(rest as any)}
			id={id}
			options={choices}
			// Ensure the component's value is always an array to prevent MUI errors.
			value={Array.isArray(value) ? value : []}
			// The `newValue` from MUI Autocomplete's onChange is the complete array
			// of selected strings, which is exactly what RJSF expects.
			onChange={(event: React.SyntheticEvent, newValue: string[]) => {
				onChange(newValue);
			}}
			disabled={disabled}
			readOnly={readonly}
			// `renderInput` defines the text field that the user interacts with.
			renderInput={(params) => (
				<TextField
					{...params}
					label={label}
					required={required}
					// Add a margin for consistent spacing with other RJSF fields
					margin="normal"
				/>
			)}
		/>
	);
};
