import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import { dividerClasses } from "@mui/material/Divider";
import { listClasses } from "@mui/material/List";
import ListItemIcon, { listItemIconClasses } from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MuiMenuItem from "@mui/material/MenuItem";
import { paperClasses } from "@mui/material/Paper";
import { styled } from "@mui/material/styles";
import { useAuthStore } from "@react-client/common/store/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { MenuButton } from "./MenuButton";

const MenuItem = styled(MuiMenuItem)({
	margin: "2px 0",
});

export function OptionsMenu({ onLogout }: { onLogout?: () => void }) {
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const queryClient = useQueryClient();

	const open = Boolean(anchorEl);
	const handleClick = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget);
	};
	const handleClose = () => {
		setAnchorEl(null);
	};

	const handleLogout = () => {
		onLogout?.();
		setAnchorEl(null);
		useAuthStore.getState().setAccessToken(null);
		queryClient.removeQueries();
		queryClient.clear();
		queryClient.invalidateQueries();
		window.location.reload();
	};

	return (
		<>
			<MenuButton
				aria-label="Open menu"
				onClick={handleClick}
				sx={{ borderColor: "transparent" }}
				data-test-id="options-menu--MenuButton-0"
			>
				<MoreVertRoundedIcon data-test-id="options-menu--MoreVertRoundedIcon-0" />
			</MenuButton>
			<Menu
				anchorEl={anchorEl}
				id="menu"
				open={open}
				onClose={handleClose}
				onClick={handleClose}
				transformOrigin={{ horizontal: "right", vertical: "top" }}
				anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
				sx={{
					[`& .${listClasses.root}`]: {
						padding: "4px",
					},
					[`& .${paperClasses.root}`]: {
						padding: 0,
					},
					[`& .${dividerClasses.root}`]: {
						margin: "4px -4px",
					},
				}}
				data-test-id="options-menu--Menu-0"
			>
				{/* <MenuItem onClick={handleClose}>Profile</MenuItem>
				<MenuItem onClick={handleClose}>My account</MenuItem>
				<Divider />
				<MenuItem onClick={handleClose}>Add another account</MenuItem>
				<MenuItem onClick={handleClose}>Settings</MenuItem>
				<Divider /> */}
				<MenuItem
					onClick={handleClose}
					sx={{
						[`& .${listItemIconClasses.root}`]: {
							ml: "auto",
							minWidth: 0,
						},
					}}
					data-test-id="options-menu--MenuItem-0"
				>
					<ListItemText
						onClick={handleLogout}
						data-test-id="options-menu--ListItemText-0"
					>
						Выйти
					</ListItemText>
					<ListItemIcon data-test-id="options-menu--ListItemIcon-0">
						<LogoutRoundedIcon
							fontSize="small"
							data-test-id="options-menu--LogoutRoundedIcon-0"
						/>
					</ListItemIcon>
				</MenuItem>
			</Menu>
		</>
	);
}
