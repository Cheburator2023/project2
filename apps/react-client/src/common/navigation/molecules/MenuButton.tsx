import IconButton, { type IconButtonProps } from "@mui/material/IconButton";

export interface MenuButtonProps extends IconButtonProps {
	showBadge?: boolean;
}

export function MenuButton({ showBadge = false, ...props }: MenuButtonProps) {
	return (
		<IconButton
			size="small"
			{...props}
			data-test-id="menu-button--IconButton-0"
		/>
	);
}
