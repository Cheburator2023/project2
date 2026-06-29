import Box from "@mui/material/Box";
import Select, { type SelectProps } from "@mui/material/Select";

export function isSelectValueEmpty(selected: unknown): boolean {
	return (
		selected === "" ||
		selected === undefined ||
		selected === null ||
		(Array.isArray(selected) && selected.length === 0)
	);
}

export function renderSelectPlaceholderValue(
	selected: unknown,
	placeholder: string,
	renderSelected?: (selected: unknown) => React.ReactNode,
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

export type SelectWithPlaceholderProps = SelectProps & {
	placeholder: string;
	renderSelected?: (selected: unknown) => React.ReactNode;
};

export function SelectWithPlaceholder({
	placeholder,
	renderSelected,
	renderValue,
	displayEmpty,
	...props
}: SelectWithPlaceholderProps) {
	return (
		<Select
			displayEmpty={displayEmpty ?? true}
			renderValue={
				renderValue ??
				((selected) =>
					renderSelectPlaceholderValue(selected, placeholder, renderSelected))
			}
			{...props}
		/>
	);
}
