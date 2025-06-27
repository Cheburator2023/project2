import { InputAdornment, TextField } from "@mui/material";
import type { WidgetProps } from "@rjsf/utils";
import type React from "react";

const NumberInputWidget: React.FC<WidgetProps> = ({
	id,
	value,
	onChange,
	disabled,
	readonly,
	schema,
	required,
	label,
	uiSchema,
}) => {
	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = event.target.value;

		if (inputValue === "") {
			onChange(undefined);
			return;
		}

		const numValue = Number(inputValue);

		// Check if the input is a valid number
		if (Number.isNaN(numValue)) {
			return;
		}

		// Clamp the value between min and max if they are defined
		const min = schema.minimum;
		const max = schema.maximum;
		const clampedValue =
			min !== undefined && max !== undefined
				? Math.min(Math.max(numValue, min), max)
				: numValue;

		onChange(clampedValue);
	};

	const prefix = uiSchema?.["ui:options"]?.prefix as string | undefined;
	const suffix = uiSchema?.["ui:options"]?.suffix as string | undefined;

	return (
		<TextField
			id={id}
			type="number"
			value={value ?? ""}
			onChange={handleChange}
			disabled={disabled || readonly}
			required={required}
			label={label}
			InputProps={{
				readOnly: readonly,
				startAdornment: prefix ? (
					<InputAdornment position="start">{prefix}</InputAdornment>
				) : undefined,
				endAdornment: suffix ? (
					<InputAdornment position="end">{suffix}</InputAdornment>
				) : undefined,
			}}
			inputProps={{
				min: schema.minimum,
				max: schema.maximum,
				step: 1,
			}}
			fullWidth
			error={
				!readonly &&
				value !== undefined &&
				schema.minimum !== undefined &&
				schema.maximum !== undefined &&
				(value < schema.minimum || value > schema.maximum)
			}
			helperText={
				value !== undefined &&
				schema.minimum !== undefined &&
				schema.maximum !== undefined &&
				(value < schema.minimum || value > schema.maximum)
					? `Value must be between ${schema.minimum} and ${schema.maximum}${suffix ? suffix : ""}`
					: ""
			}
		/>
	);
};

export default NumberInputWidget;
