import DarkModeIcon from "@mui/icons-material/DarkModeRounded";
import LightModeIcon from "@mui/icons-material/LightModeRounded";
import { IconButton } from "@mui/material";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useColorScheme } from "@mui/material/styles";
import {
	publishAppSync,
	subscribeAppSync,
} from "@react-client/common/crossTab/appBroadcast";
import { useEffectOnce } from "@react-client/common/hooks/useEffectOnce";
import React from "react";

function applyRootColorMode(mode: "light" | "dark") {
	const rootEl = document.getElementById("root");
	if (!rootEl) return;
	rootEl.setAttribute("data-color-scheme", mode);
	rootEl.style.backgroundColor = "";
}

export function ColorModeIconDropdown() {
	const { mode, setMode } = useColorScheme();
	const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

	const open = Boolean(anchorEl);

	const handleClick = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget);
	};
	const handleClose = () => {
		setAnchorEl(null);
	};

	useEffectOnce(() => {
		applyRootColorMode(mode === "dark" ? "dark" : "light");
		setMode(mode === "dark" ? "dark" : "light");
	}, !!mode);

	React.useEffect(
		() =>
			subscribeAppSync((event) => {
				if (event.type !== "settings:theme") return;
				applyRootColorMode(event.mode);
				setMode(event.mode);
			}),
		[setMode],
	);

	const handleMode = (targetMode: "light" | "dark") => () => {
		// remove scrollbars
		document.documentElement.style.overflow = "hidden";
		// trigger reflow so that overflow style is applied
		document.body.clientWidth;
		// change scheme
		applyRootColorMode(targetMode);
		// remove overflow style, which will bring back the scrollbar with the correct scheme
		document.documentElement.style.overflow = "";

		setMode(targetMode);
		publishAppSync({ type: "settings:theme", mode: targetMode });
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
				data-test-id="color-mode-icon-dropdown--Box-0"
			/>
		);
	}

	const currentSystemTheme = window.matchMedia?.("(prefers-color-scheme: dark)")
		.matches
		? "dark"
		: "light";

	const resolvedMode = mode === "system" ? currentSystemTheme : mode;

	const icon = {
		light: (
			<LightModeIcon data-test-id="color-mode-icon-dropdown--LightModeIcon-0" />
		),
		dark: (
			<DarkModeIcon data-test-id="color-mode-icon-dropdown--DarkModeIcon-0" />
		),
	}[resolvedMode];

	return (
		<React.Fragment>
			<div
				title="Сменить тему"
				data-test-id="color-mode-icon-dropdown--Tooltip-0"
			>
				<IconButton
					onClick={handleClick}
					data-test-id="color-mode-icon-dropdown--IconButton-0"
				>
					{icon}
				</IconButton>
			</div>
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
				data-test-id="color-mode-icon-dropdown--Menu-0"
			>
				{/* <MenuItem selected={mode === "system"} onClick={handleMode("system")}>
					Как в системе
				</MenuItem> */}
				<MenuItem
					selected={mode === "light"}
					onClick={handleMode("light")}
					data-test-id="color-mode-icon-dropdown--MenuItem-0"
				>
					Светлая
				</MenuItem>
				<MenuItem
					selected={mode === "dark"}
					onClick={handleMode("dark")}
					data-test-id="color-mode-icon-dropdown--MenuItem-1"
				>
					Темная
				</MenuItem>
			</Menu>
		</React.Fragment>
	);
}
