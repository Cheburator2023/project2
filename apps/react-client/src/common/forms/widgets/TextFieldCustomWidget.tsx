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
} from "@react-client/features/v1/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { WidgetProps } from "@rjsf/utils";
import { isEqual } from "lodash-es";
import { fuzzySearch, highlightMatches } from "@react-client/utils/fuzzySearch";
import { buildSelectOptions, selectLabelForValue } from "./selectFieldOptions";
import { resolveFieldEnabledWhen } from "./fieldEnabledWhen";
import { normalizeUiTooltip } from "@smart-anketa/api-contract";
import { readAnketaFormContextFromRjsfProps } from "@react-client/features/v2/anketaCRUD/utils/anketaFormContext";
import { useDebouncedRjsfFieldValue } from "@react-client/common/forms/hooks/useDebouncedRjsfFieldValue";

const RJSF_WIDGET_OPTION_KEYS = new Set([
	"enumOptions",
	"enumNames",
	"defaultEnums",
	"select",
	"tooltip",
	"multiple",
	"noDelete",
	"reset",
	"freeSolo",
	"allowCustomInput",
	"valToTitle",
	"enabledWhen",
	"rows",
	"minRows",
	"maxRows",
	"multiline",
	"mask",
	"replacement",
	"prefix",
	"dictionaryCode",
	"widget",
	"inputType",
]);

function textFieldPassthroughOptions(
	options: WidgetProps["options"] | undefined,
): Record<string, unknown> {
	if (!options) return {};
	return Object.fromEntries(
		Object.entries(options).filter(
			([key]) => !RJSF_WIDGET_OPTION_KEYS.has(key),
		),
	);
}

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

	const optionsForSelect = buildSelectOptions(options, schema);
	const isSelect = optionsForSelect.length > 0;
	const allowCustomInput = options?.freeSolo || options?.allowCustomInput;
	const anketaCtx = readAnketaFormContextFromRjsfProps(props);
	const debouncePreviewInputs = Boolean(
		anketaCtx.debouncePreviewInputs ?? anketaCtx.schemaEditorPreview,
	);
	const debouncedPlainText = useDebouncedRjsfFieldValue({
		value: String(value ?? ""),
		onChange: (next) => onChange?.(next),
		enabled: debouncePreviewInputs && !isSelect,
	});
	const debouncedFreeSoloText = useDebouncedRjsfFieldValue({
		value: String(value ?? ""),
		onChange: (next) => onChange?.(next),
		enabled: debouncePreviewInputs && isSelect && Boolean(allowCustomInput),
	});

	const _onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const next = e.target.value;
		if (debouncePreviewInputs && !isSelect) {
			debouncedPlainText.onChange(next);
			return;
		}
		onChange?.(next);
	};

	const _onBlur = ({
		target: { value: blurValue },
	}: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		if (debouncePreviewInputs && !isSelect) {
			debouncedPlainText.onBlur();
		}
		onBlur?.(id, blurValue);
	};

	const _onFocus = ({
		target: { value },
	}: React.FocusEvent<HTMLInputElement>) => {
		return onFocus?.(id, value);
	};

	const fieldEnabled = resolveFieldEnabledWhen(
		props.formContext?.formData,
		options as Record<string, unknown> | undefined,
	);
	const isDisabled = disabled || readonly || !fieldEnabled;
	const tooltipText = normalizeUiTooltip(options?.tooltip);
	const isMultiple = options?.multiple;
	const noDelete = options?.noDelete;
	const fieldTitle = label || schema?.title;
	const selectPlaceholder = placeholder;
	const selectLabelSlotProps = {
		inputLabel: { shrink: true },
	};
	const showInputPlaceholder = !isSelect && Boolean(placeholder?.trim());
	const textInputLabelSlotProps = showInputPlaceholder
		? { inputLabel: { shrink: true } }
		: undefined;

	const isFuzzy = isSelect && isMultiple;

	const fuzzyMatches =
		isFuzzy && searchTerm.trim()
			? fuzzySearch(
					searchTerm,
					optionsForSelect.map((item) => item.label || item.value),
					{ threshold: 0.1 },
				)
			: [];

	const filteredOptions =
		isFuzzy && searchTerm.trim()
			? fuzzyMatches.map((match) => ({
					...optionsForSelect.find(
						(option) => (option.label || option.value) === match.target,
					)!,
					fuzzyMatch: match,
				}))
			: optionsForSelect.map((option) => ({
					...option,
					fuzzyMatch: null,
				}));

	if (isSelect && isMultiple) {
		const selectedValues = Array.isArray(value)
			? value
			: value != null
				? [value]
				: [];
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
				value={selectedValues}
				label={fieldTitle}
				title={tooltipText || undefined}
				onChange={_handleChangeMult as any}
				id={id}
				required={required}
				disabled={isDisabled}
				autoFocus={autofocus}
				error={rawErrors && rawErrors.length > 0}
				select
				slotProps={{
					...selectLabelSlotProps,
					select: {
						multiple: true,
						displayEmpty: !!selectPlaceholder,
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

							if (selected.length === 0 && selectPlaceholder) {
								return <div style={{ opacity: 0.4 }}>{selectPlaceholder}</div>;
							}

							return (
								<Box
									sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, py: 0.5 }}
								>
									{selected.map((item: string, index: number) => (
										<Chip
											key={index}
											label={selectLabelForValue(item, optionsForSelect)}
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
				{...textFieldPassthroughOptions(options)}
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
							<Checkbox checked={selectedValues.includes(item.value)} />
							<ListItemText
								primary={
									<HighlightedMenuItem
										text={item.label || item.value}
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
				value={
					debouncePreviewInputs ? debouncedFreeSoloText.value : value || ""
				}
				onChange={(_event, newValue) => {
					const next = newValue || "";
					if (debouncePreviewInputs) {
						debouncedFreeSoloText.onChange(next);
						return;
					}
					onChange?.(next);
				}}
				onInputChange={(_event, newInputValue) => {
					if (debouncePreviewInputs) {
						debouncedFreeSoloText.onChange(newInputValue);
						return;
					}
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
								tooltipText ? (
									<Flex gap={6} position="relative">
										<InputLabel {...props} />
										<div title={tooltipText}>
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
			title={isSelect ? tooltipText || valToTitle : valToTitle}
			label={fieldTitle}
			value={
				isSelect
					? (value ?? "")
					: debouncePreviewInputs
						? debouncedPlainText.value
						: value
			}
			required={required}
			disabled={isDisabled}
			autoFocus={autofocus}
			error={rawErrors && rawErrors.length > 0}
			onChange={_onChange}
			onBlur={_onBlur}
			onFocus={_onFocus}
			placeholder={isSelect ? undefined : placeholder}
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
				...(isSelect ? selectLabelSlotProps : textInputLabelSlotProps),
				select: {
					displayEmpty: isSelect && !!selectPlaceholder,
					renderValue: (selected: unknown) => {
						if (selected == null || selected === "") {
							return selectPlaceholder ? (
								<span style={{ opacity: 0.4 }}>{selectPlaceholder}</span>
							) : (
								""
							);
						}
						return selectLabelForValue(String(selected), optionsForSelect);
					},
					MenuProps: {
						disablePortal: false,
					},
				},
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
			{...textFieldPassthroughOptions(options)}
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
