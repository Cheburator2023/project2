import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";

import { useLocation, useNavigate } from "react-router";

import { routes } from "../../../routing/routes";

const mainListItems = Object.values(routes)
	.map((route) => route)
	.filter(
		(route) =>
			route.rootPath !== routes.anketaPreview.rootPath &&
			route.rootPath !== routes.anketaCompare.rootPath,
	);

const secondaryListItems = [
	{ text: "Система управления моделями (СУМ)", icon: <InfoRoundedIcon /> },
	{ text: "Реестр моделей (СУМ РМ)", icon: <InfoRoundedIcon /> },
	{ text: "Настройки", icon: <SettingsRoundedIcon /> },
];

export function MenuContent() {
	const navigate = useNavigate();
	const location = useLocation();

	const handler = (path: string) => {
		navigate(path);
	};

	return (
		<Stack sx={{ flexGrow: 1, p: 1, justifyContent: "space-between" }}>
			<List>
				{mainListItems.map((item, index) => (
					<ListItem
						key={index}
						disablePadding
						sx={{ display: "block", mb: 0.2 }}
						onClick={() => handler(item.rootPath.replace("/", ""))}
					>
						<ListItemButton
							selected={item.rootPath === location.pathname.replace("/", "")}
						>
							<ListItemText primary={item.name} />
						</ListItemButton>
					</ListItem>
				))}
			</List>
			<List dense>
				{secondaryListItems.map((item, index) => (
					<ListItem key={index} disablePadding sx={{ display: "block" }}>
						<ListItemButton>
							<ListItemIcon>{item.icon}</ListItemIcon>
							<ListItemText primary={item.text} />
						</ListItemButton>
					</ListItem>
				))}
			</List>
		</Stack>
	);
}
