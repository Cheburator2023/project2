import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import Divider from "@mui/material/Divider";
import { dividerClasses } from "@mui/material/Divider";
import { listClasses } from "@mui/material/List";
import { listItemIconClasses } from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MuiMenuItem from "@mui/material/MenuItem";
import { paperClasses } from "@mui/material/Paper";
import { styled } from "@mui/material/styles";
import { beginLogoutOverlay } from "@react-client/common/auth/logoutOverlayState";
import { isDevLikeEnvironment } from "@react-client/common/constants/dev";
import { commonRoutes } from "@react-client/routing/common/routes";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";

import { MenuButton } from "../../../common/navigation/molecules/MenuButton";

const MenuItem = styled(MuiMenuItem)({
	margin: "2px 0",
});

export function OptionsMenu({ onLogout }: { onLogout?: () => void }) {
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const [loggingOut, setLoggingOut] = useState(false);
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const showSettings = isDevLikeEnvironment();

	const open = Boolean(anchorEl);
	const handleClick = (event: React.MouseEvent<HTMLElement>) => {
		if (loggingOut) return;
		setAnchorEl(event.currentTarget);
	};
	const handleClose = () => {
		setAnchorEl(null);
	};

	const handleOpenSettings = () => {
		setAnchorEl(null);
		navigate(commonRoutes.settings.rootPath);
	};

	const handleLogout = () => {
		if (loggingOut) return;
		setAnchorEl(null);
		// Сразу: Keycloak logout + редирект на логин могут идти десятки секунд.
		setLoggingOut(true);
		beginLogoutOverlay();
		queryClient.clear();
		onLogout?.();
	};

	return (
		<>
			<MenuButton
				aria-label="Open menu"
				onClick={handleClick}
				disabled={loggingOut}
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
				{showSettings
					? [
							<MenuItem
								key="settings"
								onClick={handleOpenSettings}
								data-test-id="options-menu--MenuItem-settings"
							>
								<ListItemText data-test-id="options-menu--ListItemText-settings">
									Настройки
								</ListItemText>
							</MenuItem>,
							<Divider key="settings-divider" />,
						]
					: null}
				<MenuItem
					onClick={handleLogout}
					disabled={loggingOut}
					sx={{
						[`& .${listItemIconClasses.root}`]: {
							ml: "auto",
							minWidth: 0,
						},
					}}
					data-test-id="options-menu--MenuItem-0"
				>
					<ListItemText data-test-id="options-menu--ListItemText-0">
						Выйти
					</ListItemText>
				</MenuItem>
			</Menu>
		</>
	);
}
