import ClearIcon from "@mui/icons-material/Clear";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import SearchIcon from "@mui/icons-material/Search";
import {
	Autocomplete,
	Box,
	Button,
	Checkbox,
	InputAdornment,
	InputLabel,
	ListItemText,
	MenuItem,
	Select,
	SelectChangeEvent,
	TextField,
} from "@mui/material";
import { useState } from "react";
import { TextFieldCustom } from "@react-client/common/muiCustom/TextFieldCustom";
import { Flex } from "@react-client/common/primitives/Flex";
import {
	basicInfoFormInitialData,
	projectAssessmentFormInitialData,
} from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { WidgetProps } from "@rjsf/utils";
import { isEqual } from "lodash-es";

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

	const [searchTerm, setSearchTerm] = useState("");

	const initialValue = {
		...basicInfoFormInitialData,
		...projectAssessmentFormInitialData,
	}[props.name];
	console.log(
		"🐸 Pepe said >> TextFieldCustomWidget >> initialValue:",
		initialValue,
	);

	const reset = () => {
		onChange(initialValue);
	};

	const resetSelection = () => {
		onChange([]);
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
	}: React.FocusEvent<HTMLInputElement>) => {
		return onFocus?.(id, value);
	};

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
	const isMultiple = options?.multiple;

	const filteredOptions = optionsForSelect.filter((item) =>
		item.value.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	if (isSelect & isMultiple) {
		const _handleChangeMult = (event: SelectChangeEvent) => {
			const {
				target: { value },
			} = event;
			onChange(
				// On autofill we get a stringified value.
				typeof value === "string" ? value.split(",") : value,
			);
		};

		return (
			<TextFieldCustom
				value={value}
				label={label || schema?.title}
				onChange={_handleChangeMult as any}
				select
				id={id}
				title={value}
				required={required}
				disabled={isDisabled}
				autoFocus={autofocus}
				error={rawErrors && rawErrors.length > 0}
				placeholder={placeholder}
				slotProps={{
					select: {
						MenuProps: {
							disablePortal: false,
							PaperProps: {
								sx: {
									padding: 0,
									maxHeight: 400,
								},
							},
							MenuListProps: {
								sx: {
									padding: "0 !important",
									paddingRight: "0px !important",
								},
							},
						},
						multiple: true,
						renderValue: (selected: any) => selected.join(", "),
					},
					inputLabel: { shrink: true },
					input: {
						endAdornment: isSelect &&
							!isEqual(initialValue, props.value) &&
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
								<div title={options?.tooltip}>
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
				{...options}
			>
				<Box
					sx={{
						position: "sticky",
						top: 0,
						backgroundColor: "white",
						zIndex: 1,
						p: 1,
						paddingRight: "0px !important",
					}}
					onClick={(e) => e.stopPropagation()}
					onMouseDown={(e) => e.stopPropagation()}
				>
					<TextField
						size="small"
						placeholder="Поиск по значениям..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						onClick={(e) => e.stopPropagation()}
						onMouseDown={(e) => e.stopPropagation()}
						onFocus={(e) => e.stopPropagation()}
						onKeyDown={(e) => {
							e.stopPropagation();
							if (
								e.key === "ArrowDown" ||
								e.key === "ArrowUp" ||
								e.key === "Enter" ||
								e.key === "Escape"
							) {
								e.preventDefault();
							}
						}}
						onKeyUp={(e) => e.stopPropagation()}
						onKeyPress={(e) => e.stopPropagation()}
						autoFocus={false}
						fullWidth
						slotProps={{
							input: {
								startAdornment: (
									<InputAdornment position="start">
										<SearchIcon />
									</InputAdornment>
								),
								onKeyDown: (e) => {
									e.stopPropagation();
									if (
										e.key === "ArrowDown" ||
										e.key === "ArrowUp" ||
										e.key === "Enter" ||
										e.key === "Escape"
									) {
										e.preventDefault();
									}
								},
							},
						}}
					/>
				</Box>
				{filteredOptions.map((item) => (
					<MenuItem key={item.value} value={item.value}>
						<Checkbox checked={value.includes(item.value)} />
						<ListItemText primary={item.value} />
					</MenuItem>
				))}
				{!isEqual(initialValue, props.value) && (
					<Box
						sx={{
							position: "sticky",
							bottom: 0,
							backgroundColor: "white",
							zIndex: 1,
							p: 1,
							paddingRight: "0px !important",
						}}
					>
						<Button
							size="small"
							variant="contained"
							onClick={resetSelection}
							fullWidth
						>
							Сброс
						</Button>
					</Box>
				)}
			</TextFieldCustom>
		);
	}

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
										<div title={options?.tooltip}>
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
			slotProps={{
				select: {
					MenuProps: {
						disablePortal: false,
					},
				},
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
							<div title={options?.tooltip}>
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
