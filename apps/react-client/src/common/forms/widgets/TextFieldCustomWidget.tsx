import CloseIcon from "@mui/icons-material/Close";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import { InputAdornment, InputLabel, MenuItem, Tooltip } from "@mui/material";
import { TextFieldCustom } from "@react-client/common/muiCustom/TextFieldCustom";
import { Flex } from "@react-client/common/primitives/Flex";
import {
	basicInfoFormInitialData,
	projectAssessmentFormInitialData,
} from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { WidgetProps } from "@rjsf/utils";

export const TextFieldCustomWidget = (props: WidgetProps) => {
	const {
		id,
		required,
		readonly,
		disabled,
		label,
		value,
		onChange,
		onBlur,
		onFocus,
		autofocus,
		options,
		schema,
		mask,
		rawErrors,
	} = props;

	const initialValue = {
		...basicInfoFormInitialData,
		...projectAssessmentFormInitialData,
	}[props.name];

	const reset = () => {
		onChange(initialValue);
	};

	const isRfdField = id?.includes("rfd");

	const _onChange = (value: string) => {
		if (isRfdField && value === "") {
			onChange?.("Отсутствует");
		} else {
			onChange?.(value === "" ? options.emptyValue : value);
		}
	};

	const _onBlur = ({
		target: { value },
	}: React.FocusEvent<HTMLInputElement>) => {
		if (isRfdField && value === "") {
			onChange?.("Отсутствует");
		}
		onBlur?.(id, value);
	};

	const _onFocus = ({
		target: { value },
	}: React.FocusEvent<HTMLInputElement>) => onFocus?.(id, value);

	const displayValue = isRfdField && value === "Отсутствует" ? "" : value || "";

	const isSelect =
		(options?.enumOptions && options?.enumOptions.length > 0) ||
		options?.select ||
		props?.select;
	const optionsForSelect = options?.enumOptions;
	const isDisabled = disabled || readonly;

	return (
		<TextFieldCustom
			id={id}
			title={id}
			label={label || schema?.title}
			value={displayValue}
			required={required}
			disabled={isDisabled}
			autoFocus={autofocus}
			error={rawErrors && rawErrors.length > 0}
			// helperText={rawErrors?.join(" ")}
			onChange={(event) => _onChange?.(event.target.value)}
			onBlur={_onBlur}
			onFocus={_onFocus}
			mask={options?.mask}
			replacement={options?.replacement}
			prefix={options?.prefix}
			multiline={options?.multiline}
			select={isSelect}
			slotProps={{
				input: {
					endAdornment: isSelect && initialValue !== props.value && (
						<InputAdornment
							position="end"
							sx={{
								position: "relative",
								right: 30,
								cursor: "pointer",
								zIndex: 999,
							}}
						>
							<CloseIcon onClick={reset} />
						</InputAdornment>
					),
				},
			}}
			slots={{
				inputLabel: (props) =>
					options?.tooltip ? (
						<Flex gap={6}>
							<InputLabel {...props} />
							<Tooltip title={options?.tooltip} placement="top-start">
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
			{...options}
		>
			{optionsForSelect && initialValue !== props.value && (
				<MenuItem onClick={reset}>Сбросить</MenuItem>
			)}
			{optionsForSelect
				? optionsForSelect?.map((option) => (
						<MenuItem key={option.value} value={option.value}>
							{option.label}
						</MenuItem>
					))
				: null}
		</TextFieldCustom>
	);
};
