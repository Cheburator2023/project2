import DarkModeIcon from "@mui/icons-material/DarkModeRounded";
import LightModeIcon from "@mui/icons-material/LightModeRounded";
import { IconButton, Tooltip } from "@mui/material";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useColorScheme } from "@mui/material/styles";
import React from "react";

export function ColorModeIconDropdown() {
	const { mode, systemMode, setMode } = useColorScheme();
	const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
	const open = Boolean(anchorEl);
	const handleClick = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget);
	};
	const handleClose = () => {
		setAnchorEl(null);
	};
	const handleMode = (targetMode: "system" | "light" | "dark") => () => {
		// remove scrollbars
		document.documentElement.style.overflow = "hidden";
		// trigger reflow so that overflow style is applied
		document.body.clientWidth;
		// change scheme
		document.documentElement.setAttribute(
			"data-color-scheme",
			targetMode !== "dark" ? "light" : "dark",
		);
		// remove overflow style, which will bring back the scrollbar with the correct scheme
		document.documentElement.style.overflow = "";

		setMode(targetMode);
		handleClose();
	};
	if (!mode) {
		return (
			<Box
				data-screenshot="toggle-mode"
				sx={(theme) => ({
					verticalAlign: "bottom",
					display: "inline-flex",
					width: "2.25rem",
					height: "2.25rem",
					borderRadius: theme.shape.borderRadius,
					border: "1px solid",
					borderColor: theme.palette.divider,
				})}
			/>
		);
	}
	const resolvedMode = (systemMode || mode) as "light" | "dark";
	const icon = {
		light: <LightModeIcon />,
		dark: <DarkModeIcon />,
	}[resolvedMode];
	return (
		<React.Fragment>
			<Tooltip title="Сменить тему">
				<IconButton onClick={handleClick}>{icon}</IconButton>
			</Tooltip>
			<Menu
				anchorEl={anchorEl}
				id="account-menu"
				open={open}
				onClose={handleClose}
				onClick={handleClose}
				slotProps={{
					paper: {
						variant: "outlined",
						elevation: 0,
						sx: {
							my: "4px",
						},
					},
				}}
				transformOrigin={{ horizontal: "right", vertical: "top" }}
				anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
			>
				<MenuItem selected={mode === "system"} onClick={handleMode("system")}>
					Как в системе
				</MenuItem>
				<MenuItem selected={mode === "light"} onClick={handleMode("light")}>
					Светлая
				</MenuItem>
				<MenuItem selected={mode === "dark"} onClick={handleMode("dark")}>
					Dark
				</MenuItem>
			</Menu>
		</React.Fragment>
	);
}
