import type { SelectProps } from "@mui/material/Select";

/** Блокирует type-ahead MUI Select (случайный выбор пункта при нажатии клавиши). */
export function selectDisableTypeaheadMenuProps(): NonNullable<
	SelectProps["MenuProps"]
> {
	return {
		autoFocus: false,
		disableAutoFocusItem: true,
		MenuListProps: {
			onKeyDown: (event) => {
				if (
					event.key.length === 1 &&
					!event.ctrlKey &&
					!event.metaKey &&
					!event.altKey
				) {
					event.stopPropagation();
				}
			},
		},
	};
}

function mergeMenuProps(
	userMenuProps: SelectProps["MenuProps"] | undefined,
	disableTypeahead: boolean,
): SelectProps["MenuProps"] {
	if (!disableTypeahead) return userMenuProps;
	const typeahead = selectDisableTypeaheadMenuProps();
	if (!userMenuProps) return typeahead;
	return {
		...typeahead,
		...userMenuProps,
		MenuListProps: {
			...typeahead.MenuListProps,
			...userMenuProps.MenuListProps,
			onKeyDown: (event) => {
				typeahead.MenuListProps?.onKeyDown?.(event);
				userMenuProps.MenuListProps?.onKeyDown?.(event);
			},
		},
	};
}

export { mergeMenuProps as mergeSelectMenuProps };
