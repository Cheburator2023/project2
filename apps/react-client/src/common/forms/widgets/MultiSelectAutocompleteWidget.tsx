import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { TextFieldCustom } from "@react-client/common/muiCustom/TextFieldCustom";
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
	const choices = options.enumOptions?.map((option) => option.value) || [];

	return (
		<Autocomplete
			multiple
			{...(rest as any)}
			id={id}
			options={choices}
			value={Array.isArray(value) ? value : []}
			onChange={(_event: React.SyntheticEvent, newValue: string[]) => {
				onChange(newValue);
			}}
			disabled={disabled}
			readOnly={readonly}
			renderInput={(params) => (
				<TextFieldCustom
					{...params}
					label={label}
					required={required}
					margin="normal"
					data-test-id="multi-select-autocomplete-widget--TextField-0"
				/>
			)}
			data-test-id="multi-select-autocomplete-widget--Autocomplete-0"
		/>
	);
};
