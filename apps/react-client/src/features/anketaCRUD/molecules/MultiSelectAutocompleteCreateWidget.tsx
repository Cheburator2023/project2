import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import { WidgetProps } from "@rjsf/utils";
import * as React from "react";

interface OptionType {
	title: string;
	value: string;
	inputValue?: string;
	isNew?: boolean;
}

const filter = createFilterOptions<OptionType>();

export function MultiSelectAutocompleteCreateWidget({
	id,
	label,
	options,
	value,
	onChange,
	required,
	readonly,
	disabled,
	placeholder,
	schema,
	...rest
}: WidgetProps) {
	// State to track all available options (including newly created ones)
	const [allOptions, setAllOptions] = React.useState<OptionType[]>([]);

	// Initialize options from RJSF enumOptions
	React.useEffect(() => {
		const initialOptions =
			options.enumOptions?.map((option) => ({
				title: option.label,
				value: option.value,
				isNew: false,
			})) || [];

		setAllOptions(initialOptions);
	}, [options.enumOptions]);

	// Current selected values (array)
	const selectedValues = React.useMemo(() => {
		if (!value || !Array.isArray(value)) return [];

		return value.map((val) => {
			const found = allOptions.find((opt) => opt.value === val);
			return found || { title: String(val), value: String(val), isNew: true };
		});
	}, [value, allOptions]);

	const handleChange = (event: any, newValues: (OptionType | string)[]) => {
		if (!onChange) return;

		const processedValues: string[] = [];
		const newOptionsToAdd: OptionType[] = [];

		newValues.forEach((newValue) => {
			if (typeof newValue === "string") {
				// Handle free solo string input
				processedValues.push(newValue);
				// Check if this is a new option that needs to be added
				if (!allOptions.some((opt) => opt.value === newValue)) {
					newOptionsToAdd.push({
						title: newValue,
						value: newValue,
						isNew: true,
					});
				}
			} else if (newValue && newValue.inputValue) {
				// Handle newly created option
				processedValues.push(newValue.inputValue);
				newOptionsToAdd.push({
					title: newValue.inputValue,
					value: newValue.inputValue,
					isNew: true,
				});
			} else if (newValue) {
				// Handle existing option selection
				processedValues.push(newValue.value);
			}
		});

		// Add new options to the available options list
		if (newOptionsToAdd.length > 0) {
			setAllOptions((prev) => [...prev, ...newOptionsToAdd]);
		}

		// Update the form value
		onChange(processedValues.length > 0 ? processedValues : undefined);
	};

	const filterOptions = (options: OptionType[], params: any) => {
		const filtered = filter(options, params);
		const { inputValue } = params;

		// Check if the input value already exists
		const isExisting = options.some(
			(option) => inputValue.toLowerCase() === option.title.toLowerCase(),
		);

		// Add create option if input doesn't match existing options
		if (inputValue !== "" && !isExisting) {
			filtered.push({
				inputValue,
				title: `Add "${inputValue}"`,
				value: inputValue,
				isNew: true,
			});
		}

		return filtered;
	};

	const getOptionLabel = (option: OptionType | string) => {
		// Handle string values (for freeSolo)
		if (typeof option === "string") {
			return option;
		}

		// Handle create option
		if (option.inputValue) {
			return option.inputValue;
		}

		// Handle regular option
		return option.title || "";
	};

	const isOptionEqualToValue = (option: OptionType, value: OptionType) => {
		return option.value === value.value;
	};

	return (
		<Autocomplete
			multiple
			id={id}
			value={selectedValues}
			onChange={handleChange}
			disabled={disabled || readonly}
			options={allOptions}
			filterOptions={filterOptions}
			getOptionLabel={getOptionLabel}
			isOptionEqualToValue={isOptionEqualToValue}
			renderTags={(tagValue, getTagProps) =>
				tagValue.map((option, index) => {
					const { key, ...tagProps } = getTagProps({ index });
					return (
						<Chip
							key={key}
							variant="outlined"
							label={option.title}
							color={option.isNew ? "primary" : "default"}
							{...tagProps}
						/>
					);
				})
			}
			renderOption={(props, option) => {
				const { key, ...optionProps } = props;
				return (
					<li key={key} {...optionProps}>
						{option.title}
						{option.isNew && (
							<span style={{ marginLeft: 8, fontSize: "0.75em", opacity: 0.6 }}>
								(new)
							</span>
						)}
					</li>
				);
			}}
			renderInput={(params) => (
				<TextField
					{...params}
					label={label}
					placeholder={placeholder}
					required={required}
					error={false} // You can add error handling based on RJSF validation
					helperText={schema?.description}
				/>
			)}
			freeSolo
			selectOnFocus
			clearOnBlur
			handleHomeEndKeys
			fullWidth
			ChipProps={{
				size: "small",
			}}
		/>
	);
}
