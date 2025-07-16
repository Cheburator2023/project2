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
			const cleanValue = _value?.replace(prefix || "", "");
			const prefixedValue = prefix ? `${prefix}${cleanValue}` : _value;

			if (prefix) {
				setTimeout(() => {
					const input = event.target;
					input.setSelectionRange(input.value.length, input.value.length);
				}, 0);

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

	const handleFocus = (e: any) => {
		props?.onFocus?.(e);

		if (e.target && prefix) {
			const length = e.target?.value?.length;
			e.target.setSelectionRange(length, length);
		}
	};

	const handleClick = (e: any) => {
		props?.onClick?.(e);

		if (e.target && prefix) {
			const length = e.target?.value?.length;
			e.target.setSelectionRange(length, length);
		}
	};

	return (
		<TextField
			{...props}
			title={props.id}
			value={value}
			onChange={handleChange}
			onFocus={handleFocus}
			onClick={handleClick}
			inputRef={mask ? inputRef : undefined}
		/>
	);
};
