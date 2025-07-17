import ClearIcon from "@mui/icons-material/Clear";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import {
	Autocomplete,
	InputAdornment,
	InputLabel,
	MenuItem,
	Tooltip,
} from "@mui/material";
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
		placeholder,
	} = props;

	const initialValue = {
		...basicInfoFormInitialData,
		...projectAssessmentFormInitialData,
	}[props.name];

	const reset = () => {
		onChange(initialValue);
	};

	const _onChange = (e: any) => {
		onChange?.(e.target.value);
	};

	const _onBlur = ({
		target: { value },
	}: React.FocusEvent<HTMLInputElement>) => {
		onBlur?.(id, value);
	};

	const _onFocus = ({
		target: { value },
	}: React.FocusEvent<HTMLInputElement>) => onFocus?.(id, value);

	const isSelect =
		(options?.defaultEnums && options?.defaultEnums.length > 0) ||
		(options?.enumOptions && options?.enumOptions.length > 0) ||
		options?.select ||
		props?.select;
	const defaultEnums =
		options?.defaultEnums?.map((item: string) => ({
			label: item,
			value: item,
		})) || [];
	const optionsForSelect = [...defaultEnums, ...(options?.enumOptions || [])];
	const allowCustomInput = options?.freeSolo || options?.allowCustomInput;

	const isDisabled = disabled || readonly;

	if (isSelect && allowCustomInput) {
		return (
			<Autocomplete
				id={id}
				freeSolo
				options={optionsForSelect.map((option) => option.value)}
				value={value || ""}
				onChange={(_event, newValue) => {
					onChange?.(newValue || "");
				}}
				onInputChange={(_event, newInputValue) => {
					onChange?.(newInputValue);
				}}
				renderInput={(params) => (
					<TextFieldCustom
						{...params}
						disabled={isDisabled}
						label={label || schema?.title}
						required={required}
						error={rawErrors && rawErrors.length > 0}
						placeholder={placeholder}
						mask={options?.mask}
						replacement={options?.replacement}
						prefix={options?.prefix}
						slotProps={{
							inputLabel: { shrink: true },
						}}
						slots={{
							inputLabel: (props) =>
								options?.tooltip ? (
									<Flex gap={6} position="relative">
										<InputLabel {...props} />
										<Tooltip title={options?.tooltip} placement="top-start">
											<InfoOutlineIcon
												sx={{
													scale: 0.8,
													color: "#88888877",
													position: "absolute",
													top: "-4px",
													right: "0",
												}}
											/>
										</Tooltip>
									</Flex>
								) : (
									<InputLabel {...props} />
								),
						}}
					/>
				)}
			/>
		);
	}

	return (
		<TextFieldCustom
			id={id}
			title={id}
			label={label || schema?.title}
			value={value}
			required={required}
			disabled={isDisabled}
			autoFocus={autofocus}
			error={rawErrors && rawErrors.length > 0}
			onChange={_onChange}
			onBlur={_onBlur}
			onFocus={_onFocus}
			placeholder={placeholder}
			mask={options?.mask}
			replacement={options?.replacement}
			prefix={options?.prefix}
			multiline={options?.multiline}
			select={isSelect}
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
				input: {
					endAdornment: isSelect &&
						initialValue !== props.value &&
						props.options?.reset && (
							<InputAdornment
								position="end"
								sx={{
									position: "relative",
									right: 30,
									cursor: "pointer",
									zIndex: 999,
								}}
							>
								<ClearIcon onClick={reset} />
							</InputAdornment>
						),
				},
			}}
			slots={{
				inputLabel: (props) =>
					options?.tooltip ? (
						<Flex gap={6} position="relative">
							<InputLabel {...props} />
							<Tooltip title={options?.tooltip} placement="top-start">
								<InfoOutlineIcon
									sx={{
										scale: 0.8,
										color: "#88888877",
										position: "absolute",
										top: "-4px",
										right: "0",
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
			{/* {optionsForSelect.length > 0 &&
				initialValue !== props.value &&
				props.options?.reset && <MenuItem onClick={reset}>Сбросить</MenuItem>} */}
			{optionsForSelect.length > 0
				? optionsForSelect
						?.filter((item) => item.value)
						?.map((option) => (
							<MenuItem key={option.value} value={option.value}>
								{option.label}
							</MenuItem>
						))
				: null}
		</TextFieldCustom>
	);
};
