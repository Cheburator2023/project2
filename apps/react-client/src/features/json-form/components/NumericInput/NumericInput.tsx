import TextField from "@mui/material/TextField";
import { useState } from "react";
import {
	NumericInputProps,
	TFieldTypeNumber,
	TInputChangeEvent,
} from "../../utils/interfaces";

const NumericInput = ({
	id,
	value: parentValue,
	name,
	label,
	onChange,
	error,
	required,
	helperText,
	length = 0,
}: NumericInputProps) => {
	const [innerValue, setInnerValue] = useState<TFieldTypeNumber>(parentValue);

	const handleChange: TInputChangeEvent = (e) => {
		const { value } = e.target;
		const numericValue = value.replace(/\D/g, "");
		if (length && numericValue.length > length) {
			return;
		}
		setInnerValue(numericValue);
		onChange(value);
	};

	return (
		<TextField
			id={id}
			value={innerValue}
			name={name}
			label={label}
			onChange={handleChange}
			error={error}
			required={required}
			helperText={helperText}
		/>
	);
};

export default NumericInput;

NumericInput.defaultProps = {
	length: 0,
};
