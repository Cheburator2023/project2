import Box from "@mui/material/Box";
import Select, { type SelectProps } from "@mui/material/Select";
import { mergeSelectMenuProps } from "./selectDisableTypeahead";

export function isSelectValueEmpty(selected: unknown): boolean {
	return (
		selected === "" ||
		selected === undefined ||
		selected === null ||
		(Array.isArray(selected) && selected.length === 0)
	);
}

export function renderSelectPlaceholderValue<T>(
	selected: T,
	placeholder: string,
	renderSelected?: (selected: T) => React.ReactNode,
): React.ReactNode {
	if (isSelectValueEmpty(selected)) {
		return (
			<Box component="span" sx={{ color: "text.secondary" }}>
				{placeholder}
			</Box>
		);
	}
	return renderSelected ? renderSelected(selected) : String(selected);
}

export type SelectWithPlaceholderProps<T = string> = SelectProps<T> & {
	placeholder: string;
	renderSelected?: (selected: T) => React.ReactNode;
	/** Отключает type-ahead при открытом списке (рекомендуется для длинных списков параметров). */
	disableTypeahead?: boolean;
};

export function SelectWithPlaceholder<T = string>({
	placeholder,
	renderSelected,
	renderValue,
	displayEmpty,
	disableTypeahead = false,
	MenuProps,
	...props
}: SelectWithPlaceholderProps<T>) {
	return (
		<Select<T>
			displayEmpty={displayEmpty ?? true}
			MenuProps={mergeSelectMenuProps(MenuProps, disableTypeahead)}
			renderValue={
				renderValue ??
				((selected) =>
					renderSelectPlaceholderValue(selected, placeholder, renderSelected))
			}
			{...props}
		/>
	);
}
