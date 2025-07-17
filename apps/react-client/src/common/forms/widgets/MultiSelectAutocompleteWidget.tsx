import Autocomplete from "@mui/material/Autocomplete";
import { TextFieldCustom } from "@react-client/common/muiCustom/TextFieldCustom";
import type { WidgetProps } from "@rjsf/utils";
import type React from "react";

export const MultiSelectAutocompleteWidget = (props: WidgetProps) => {
	const {
		id,
		label,
		options,
		value,
		onChange,
		required,
		readonly,
		disabled,
		...rest
	} = props;

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
					error={!!props.rawErrors}
					placeholder={props.placeholder}
					SelectProps={{
						MenuProps: {
							anchorOrigin: {
								vertical: "bottom",
								horizontal: "left",
							},
							transformOrigin: {
								vertical: "top",
								horizontal: "left",
							},
							disablePortal: false, // Try both true and false
						},
					}}
					slotProps={{
						inputLabel: { shrink: true },
					}}
					data-test-id="multi-select-autocomplete-widget--TextField-0"
				/>
			)}
			data-test-id="multi-select-autocomplete-widget--Autocomplete-0"
		/>
	);
};
