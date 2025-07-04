import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import { InputAdornment, InputLabel, Tooltip } from "@mui/material";
import { TextFieldCustom } from "@react-client/common/muiCustom/TextFieldCustom";
import { Flex } from "@react-client/common/primitives/Flex";
import { WidgetProps } from "@rjsf/utils";
import React from "react";

const NumberInputWidget: React.FC<WidgetProps> = (props) => {
	const {
		id,
		value,
		onChange,
		disabled,
		readonly,
		schema,
		required,
		label,
		uiSchema,
		options,
	} = props;
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
		<TextFieldCustom
			id={id}
			type="number"
			value={value ?? ""}
			onChange={handleChange}
			disabled={disabled || readonly}
			required={required}
			label={label}
			slots={{
				inputLabel: (props) =>
					options.tooltip ? (
						<Flex gap={6}>
							<InputLabel {...props} />
							<Tooltip title={options.tooltip} placement="top-start">
								<InfoOutlineIcon
									sx={{
										scale: 0.8,
										color: "#88888877",
									}}
								/>
							</Tooltip>
						</Flex>
					) : (
						<InputLabel {...props} />
					),
			}}
			InputProps={{
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
