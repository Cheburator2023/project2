import { TextField, TextFieldProps } from "@mui/material";
import { useMask } from "@react-client/common/forms/masks";
import React from "react";

interface TextFieldCustomProps extends Omit<TextFieldProps, "inputRef"> {
	mask?: string;
	replacement?: string;
	prefix?: string;
}

export const TextFieldCustom: React.FC<TextFieldCustomProps> = ({
	mask,
	replacement,
	value,
	onChange,
	prefix,
	...props
}) => {
	const inputRef = useMask({ mask, replacement: replacement });

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (onChange) {
			const _value = event.target.value;
			const cleanValue = _value.replace(prefix || "", "");
			const prefixedValue = prefix ? `${prefix}${cleanValue}` : _value;

			if (prefix) {
				if (cleanValue !== "") {
					onChange({
						...event,
						target: {
							...event.target,
							value: prefixedValue,
						},
					});
				} else {
					onChange({
						...event,
						target: {
							...event.target,
							value: cleanValue,
						},
					});
				}
			} else {
				onChange(event);
			}
		}
	};

	return (
		<TextField
			{...props}
			title={props.id}
			value={value}
			onChange={handleChange}
			inputRef={mask ? inputRef : undefined}
		/>
	);
};
