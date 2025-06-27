import Badge, { badgeClasses } from "@mui/material/Badge";
import IconButton, { type IconButtonProps } from "@mui/material/IconButton";

export interface MenuButtonProps extends IconButtonProps {
	showBadge?: boolean;
}

export function MenuButton({ showBadge = false, ...props }: MenuButtonProps) {
	return (
		<Badge
			color="error"
			variant="dot"
			invisible={!showBadge}
			sx={{ [`& .${badgeClasses.badge}`]: { right: 2, top: 2 } }}
			data-test-id="menu-button--Badge-0"
		>
			<IconButton
				size="small"
				{...props}
				data-test-id="menu-button--IconButton-0"
			/>
		</Badge>
	);
}
