import ClearIcon from "@mui/icons-material/Clear";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import SearchIcon from "@mui/icons-material/Search";
import {
	Autocomplete,
	Box,
	Button,
	Checkbox,
	Chip,
	InputAdornment,
	InputLabel,
	ListItemText,
	MenuItem,
	SelectChangeEvent,
	TextField,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useState } from "react";
import { TextFieldCustom } from "@react-client/common/muiCustom/TextFieldCustom";
import { Flex } from "@react-client/common/primitives/Flex";
import {
	basicInfoFormInitialData,
	projectAssessmentFormInitialData,
} from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { WidgetProps } from "@rjsf/utils";
import { isEqual } from "lodash-es";
import { fuzzySearch, highlightMatches } from "@react-client/utils/fuzzySearch";

// Вспомогательная функция для преобразования indexes в matches
const indexesToMatches = (
	indexes: ReadonlyArray<number>,
): Array<{ start: number; end: number }> => {
	if (!indexes || indexes.length === 0) return [];

	const matches: Array<{ start: number; end: number }> = [];
	let start = indexes[0];
	let end = indexes[0];

	for (let i = 1; i < indexes.length; i++) {
		if (indexes[i] === end + 1) {
			end = indexes[i];
		} else {
			matches.push({ start, end: end + 1 });
			start = indexes[i];
			end = indexes[i];
		}
	}
	matches.push({ start, end: end + 1 });

	return matches;
};

const HighlightedText = styled("span")<{ highlighted?: boolean }>(
	({ highlighted, theme }) => ({
		backgroundColor: highlighted ? theme.palette.warning.light : "transparent",
		fontWeight: highlighted ? "bold" : "normal",
		color: highlighted ? theme.palette.warning.contrastText : "inherit",
	}),
);

const HighlightedMenuItem = ({
	text,
	matches,
}: {
	text: string;
	matches: Array<{ start: number; end: number }>;
}) => {
	const segments = highlightMatches(text, matches);

	return (
		<>
			{segments.map((segment, index) => (
				<HighlightedText key={index} highlighted={segment.highlighted}>
					{segment.text}
				</HighlightedText>
			))}
		</>
	);
};

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
		placeholder: _placeholder,
	} = props;

	const placeholder = _placeholder || props?.uiSchema?.["ui:placeholder"];

	const [searchTerm, setSearchTerm] = useState("");

	const initialValue = {
		...basicInfoFormInitialData,
		...projectAssessmentFormInitialData,
	}[props.name];

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
	const noDelete = options?.noDelete;

	const isFuzzy = isSelect & isMultiple;

	const fuzzyMatches =
		isFuzzy && searchTerm.trim()
			? fuzzySearch(
					searchTerm,
					optionsForSelect.map((item) => item.value),
					{ threshold: 0.1 },
				)
			: [];

	const filteredOptions =
		isFuzzy && searchTerm.trim()
			? fuzzyMatches.map((match) => ({
					...optionsForSelect.find((option) => option.value === match.target)!,
					fuzzyMatch: match,
				}))
			: optionsForSelect.map((option) => ({
					...option,
					fuzzyMatch: null,
				}));

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
				id={id}
				// title={value}
				required={required}
				disabled={isDisabled}
				autoFocus={autofocus}
				error={rawErrors && rawErrors.length > 0}
				select
				slotProps={{
					select: {
						multiple: true,
						displayEmpty: !!placeholder,
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
									padding: "0 6px !important",
								},
							},
						},
						renderValue: (selected: any) => {
							const handleChipDelete =
								(chipToDelete: string) => (event: any) => {
									event.stopPropagation();
									event.preventDefault();
									const newSelected = selected.filter(
										(item: string) => item !== chipToDelete,
									);
									onChange(newSelected);
								};

							const handleChipClick = (event: any) => {
								event.stopPropagation();
								event.preventDefault();
							};

							const handleChipMouseDown = (event: any) => {
								event.stopPropagation();
								event.preventDefault();
							};

							if (selected.length === 0 && placeholder) {
								return <div style={{ opacity: 0.4 }}>{placeholder}</div>;
							}

							return (
								<Box
									sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, py: 0.5 }}
								>
									{selected.map((item: string, index: number) => (
										<Chip
											key={index}
											label={item}
											size="medium"
											variant="outlined"
											onDelete={noDelete ? undefined : handleChipDelete(item)}
											onClick={noDelete ? undefined : handleChipClick}
											onMouseDown={noDelete ? undefined : handleChipMouseDown}
											sx={{
												fontSize: "0.75rem",
												height: "24px",
											}}
										/>
									))}
								</Box>
							);
						},
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
								<InputLabel {...props} title="" />
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
						paddingLeft: "0px !important",
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
				{filteredOptions.length > 0 ? (
					filteredOptions.map((item) => (
						<MenuItem key={item.value} value={item.value}>
							<Checkbox checked={value.includes(item.value)} />
							<ListItemText
								primary={
									<HighlightedMenuItem
										text={item.value}
										matches={
											item.fuzzyMatch?.indexes
												? indexesToMatches(item.fuzzyMatch.indexes)
												: []
										}
									/>
								}
							/>
						</MenuItem>
					))
				) : isFuzzy && searchTerm.trim() ? (
					<MenuItem disabled>
						<ListItemText
							primary="Нет совпадений"
							sx={{ textAlign: "center", opacity: 0.6 }}
						/>
					</MenuItem>
				) : null}
				{!isEqual(initialValue, props.value) && (
					<Box
						sx={{
							position: "sticky",
							bottom: 0,
							backgroundColor: "white",
							zIndex: 1,
							p: 1,
							paddingRight: "0px !important",
							paddingLeft: "0px !important",
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
		const autocompleteOptions = optionsForSelect.map((option) => option.value);

		return (
			<Autocomplete
				id={id}
				freeSolo
				options={autocompleteOptions}
				value={value || ""}
				onChange={(_event, newValue) => {
					onChange?.(newValue || "");
				}}
				onInputChange={(_event, newInputValue) => {
					onChange?.(newInputValue);
				}}
				filterOptions={(options, { inputValue }) => {
					const matches = fuzzySearch(inputValue, options, { threshold: 0.1 });
					return matches.map((match) => match.target);
				}}
				renderOption={(props, option, { inputValue }) => {
					const matches = fuzzySearch(inputValue, [option], { threshold: 0.1 });
					const match = matches[0];

					return (
						<li {...props}>
							<HighlightedMenuItem
								text={option}
								matches={match?.indexes ? indexesToMatches(match.indexes) : []}
							/>
						</li>
					);
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

	const valToTitle = props.options.valToTitle ? value : undefined;

	return (
		<TextFieldCustom
			id={id}
			title={valToTitle}
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
			sx={{
				"& .MuiInputBase-input": {
					overflow: "hidden",
					textOverflow: "ellipsis",
				},
			}}
			slotProps={{
				select: {
					MenuProps: {
						disablePortal: false,
					},
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
							<InputLabel {...props} title="" />
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
						?.filter((item) => {
							return item.value;
						})
						?.map((option) => {
							return (
								<MenuItem key={option.value} value={option.value}>
									<HighlightedMenuItem
										text={option.label || option.value}
										matches={[]}
									/>
								</MenuItem>
							);
						})
				: null}
		</TextFieldCustom>
	);
};
