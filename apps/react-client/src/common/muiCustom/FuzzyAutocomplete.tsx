import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import type { SelectChangeEvent } from "@mui/material/Select";
import { styled } from "@mui/material/styles";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { fuzzySearch, highlightMatches } from "@react-client/utils/fuzzySearch";

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

function HighlightedOptionText({
	text,
	matches,
}: {
	text: string;
	matches: Array<{ start: number; end: number }>;
}) {
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
}

type FuzzySelectOption<T> = {
	option: T;
	value: string;
	label: string;
	fuzzyMatch: ReturnType<typeof fuzzySearch>[number] | null;
};

type FuzzyAutocompleteProps<T> = {
	options: readonly T[];
	value: T | null;
	onChange: (value: T | null) => void;
	getOptionLabel: (option: T) => string;
	getOptionValue?: (option: T) => string;
	fuzzyThreshold?: number;
	allowEmpty?: boolean;
	emptyLabel?: string;
	searchPlaceholder?: string;
	noMatchesText?: string;
	label?: string;
	placeholder?: string;
	helperText?: string;
	error?: boolean;
	size?: TextFieldProps["size"];
	fullWidth?: boolean;
	disabled?: boolean;
};

export function FuzzyAutocomplete<T>({
	options,
	value,
	onChange,
	getOptionLabel,
	getOptionValue,
	fuzzyThreshold = 0.1,
	allowEmpty = true,
	emptyLabel = "Не привязан",
	searchPlaceholder = "Поиск по значениям...",
	noMatchesText = "Нет совпадений",
	label,
	placeholder,
	helperText,
	error,
	size = "small",
	fullWidth = true,
	disabled,
}: FuzzyAutocompleteProps<T>) {
	const [searchTerm, setSearchTerm] = useState("");
	const [open, setOpen] = useState(false);
	const resolveValue = getOptionValue ?? getOptionLabel;

	const closeMenu = useCallback(() => {
		setOpen(false);
		setSearchTerm("");
	}, []);

	const optionsForSelect = useMemo(
		() =>
			options.map((option) => ({
				option,
				value: resolveValue(option),
				label: getOptionLabel(option),
			})),
		[options, getOptionLabel, resolveValue],
	);

	const fuzzyMatches =
		searchTerm.trim().length > 0
			? fuzzySearch(
					searchTerm,
					optionsForSelect.map((item) => item.label),
					{ threshold: fuzzyThreshold },
				)
			: [];

	const filteredOptions: FuzzySelectOption<T>[] = searchTerm.trim()
		? fuzzyMatches.map((match) => {
				const item = optionsForSelect.find(
					(option) => option.label === match.target,
				)!;
				return { ...item, fuzzyMatch: match };
			})
		: optionsForSelect.map((option) => ({ ...option, fuzzyMatch: null }));

	const selectedValue = value ? resolveValue(value) : "";

	const handleChange = (event: SelectChangeEvent<string>) => {
		const nextValue = event.target.value;
		if (!nextValue) {
			onChange(null);
			closeMenu();
			return;
		}
		onChange(
			options.find((option) => resolveValue(option) === nextValue) ?? null,
		);
		closeMenu();
	};

	const stopMenuEvent = (event: React.SyntheticEvent) => {
		event.stopPropagation();
	};

	const blockSelectKeys = (event: React.KeyboardEvent) => {
		event.stopPropagation();
		if (event.key === "Escape") {
			event.preventDefault();
			closeMenu();
			return;
		}
		if (
			event.key === "ArrowDown" ||
			event.key === "ArrowUp" ||
			event.key === "Enter"
		) {
			event.preventDefault();
		}
	};

	return (
		<TextField
			select
			fullWidth={fullWidth}
			size={size}
			label={label}
			helperText={helperText}
			error={error}
			disabled={disabled}
			value={selectedValue}
			onChange={
				handleChange as unknown as TextFieldProps["onChange"]
			}
			slotProps={{
				select: {
					displayEmpty: allowEmpty,
					open,
					onOpen: () => setOpen(true),
					onClose: closeMenu,
					MenuProps: {
						disablePortal: false,
						onClose: closeMenu,
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
					renderValue: (selected: unknown): ReactNode => {
						const resolved =
							typeof selected === "string" ? selected : "";
						if (!resolved && placeholder) {
							return (
								<span style={{ opacity: 0.4 }}>{placeholder}</span>
							);
						}
						const item = optionsForSelect.find(
							(option) => option.value === resolved,
						);
						return item?.label ?? resolved;
					},
				},
				inputLabel: { shrink: true },
			}}
		>
			<Box
				sx={{
					position: "sticky",
					top: 0,
					backgroundColor: "background.paper",
					zIndex: 1,
					p: 1,
					paddingRight: "0px !important",
					paddingLeft: "0px !important",
				}}
				onClick={stopMenuEvent}
				onMouseDown={stopMenuEvent}
			>
				<TextField
					size="small"
					placeholder={searchPlaceholder}
					value={searchTerm}
					onChange={(event) => setSearchTerm(event.target.value)}
					onClick={stopMenuEvent}
					onMouseDown={stopMenuEvent}
					onFocus={stopMenuEvent}
					onKeyDown={blockSelectKeys}
					onKeyUp={stopMenuEvent}
					autoFocus={false}
					fullWidth
					slotProps={{
						input: {
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon fontSize="small" />
								</InputAdornment>
							),
							onKeyDown: blockSelectKeys,
						},
					}}
				/>
			</Box>
			{allowEmpty ? (
				<MenuItem value="">
					<em>{emptyLabel}</em>
				</MenuItem>
			) : null}
			{filteredOptions.length > 0
				? filteredOptions.map((item) => (
						<MenuItem key={item.value} value={item.value}>
							<ListItemText
								primary={
									<HighlightedOptionText
										text={item.label}
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
				: searchTerm.trim() ? (
						<MenuItem disabled>
							<ListItemText
								primary={noMatchesText}
								sx={{ textAlign: "center", opacity: 0.6 }}
							/>
						</MenuItem>
					) : null}
		</TextField>
	);
}
