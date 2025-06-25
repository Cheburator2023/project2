import CallMissedOutgoingIcon from "@mui/icons-material/CallMissedOutgoing";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import { useLocation, useNavigate } from "react-router";

import { Button, Tooltip } from "@mui/material";
import { routes } from "../../../routing/routes";

const mainListItems = Object.values(routes)
	.map((route) => route)
	.filter(
		(route) =>
			!route?.disabled &&
			route.rootPath !== routes.calculationPreview.rootPath &&
			route.rootPath !== routes.calculationCompare.rootPath,
	);

const secondaryListItems = [
	{
		text: "sum",
		icon: <CallMissedOutgoingIcon />,
		tooltip: "Система управления моделями",
		path: "/sum",
	},
	{
		text: "sum-rm",
		icon: <CallMissedOutgoingIcon />,
		tooltip: "Рееcтр моделей",
		path: "/sum-rm",
	},
	// { text: "Настройки", icon: <SettingsRoundedIcon /> },
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
			<List>
				{secondaryListItems.map((item, index) => (
					<ListItem key={index} disablePadding sx={{ paddingBottom: 1 }}>
						<Tooltip title={item.tooltip}>
							<Button size="small" variant="outlined" href={item.path}>
								<ListItemIcon>{item.icon}</ListItemIcon>
								<ListItemText primary={item.text} />
							</Button>
						</Tooltip>
					</ListItem>
				))}
			</List>
		</Stack>
	);
}
