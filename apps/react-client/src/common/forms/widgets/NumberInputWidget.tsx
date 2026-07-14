import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import { InputAdornment, InputLabel } from "@mui/material";
import { TextFieldCustom } from "@react-client/common/muiCustom/TextFieldCustom";
import { Flex } from "@react-client/common/primitives/Flex";
import { WidgetProps } from "@rjsf/utils";
import React from "react";

export const NumberInputWidget: React.FC<WidgetProps> = (props) => {
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
		rawErrors,
		placeholder: widgetPlaceholder,
	} = props;

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		const allowedKeys = [
			"Backspace",
			"Delete",
			"Tab",
			"Escape",
			"Enter",
			"Home",
			"End",
			"ArrowLeft",
			"ArrowRight",
			"ArrowUp",
			"ArrowDown",
		];

		const allowDecimal =
			(uiSchema?.["ui:options"]?.allowDecimal as boolean) ?? false;

		const isNumber = /^[0-9]$/.test(event.key);
		const isDecimal = allowDecimal && (event.key === "." || event.key === ",");
		const isAllowedKey = allowedKeys.includes(event.key);
		const isCtrlA = event.ctrlKey && event.key === "a";
		const isCtrlC = event.ctrlKey && event.key === "c";
		const isCtrlV = event.ctrlKey && event.key === "v";
		const isCtrlX = event.ctrlKey && event.key === "x";
		const isCtrlZ = event.ctrlKey && event.key === "z";

		if (
			!isNumber &&
			!isDecimal &&
			!isAllowedKey &&
			!isCtrlA &&
			!isCtrlC &&
			!isCtrlV &&
			!isCtrlX &&
			!isCtrlZ
		) {
			event.preventDefault();
		}
	};

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = event.target.value;

		if (inputValue === "") {
			onChange(undefined);
			return;
		}

		const numValue = Number(inputValue);

		if (Number.isNaN(numValue)) {
			return;
		}

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
	const placeholder =
		widgetPlaceholder ||
		(typeof uiSchema?.["ui:placeholder"] === "string"
			? uiSchema["ui:placeholder"]
			: undefined);

	return (
		<TextFieldCustom
			id={id}
			type="number"
			value={value ?? ""}
			onChange={handleChange}
			onKeyDown={handleKeyDown}
			disabled={disabled || readonly}
			required={required}
			label={label}
			placeholder={placeholder}
			slotProps={{
				inputLabel: {
					shrink: Boolean(placeholder?.trim()) || Boolean(options?.tooltip),
				},
			}}
			slots={{
				inputLabel: (props) =>
					options.tooltip ? (
						<Flex gap={6}>
							<InputLabel {...props} />
							<div title={options.tooltip}>
								<InfoOutlineIcon
									sx={{
										scale: 0.8,
										color: "#88888877",
										position: "absolute",
										top: "-4px",
										right: "0",
									}}
								/>
							</div>
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
				(rawErrors && rawErrors.length > 0) ||
				(value !== undefined &&
					schema.minimum !== undefined &&
					schema.maximum !== undefined &&
					(value < schema.minimum || value > schema.maximum))
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
