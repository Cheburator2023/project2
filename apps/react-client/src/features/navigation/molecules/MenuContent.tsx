import CallMissedOutgoingIcon from "@mui/icons-material/CallMissedOutgoing";
import { Button } from "@mui/material";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import { useLocation, useNavigate } from "react-router";
import { routes } from "@react-client/version/v1/routing/routes";

const mainListItems = Object.values(routes)
	.map((route) => route)
	.filter(
		(route) =>
			!route?.disabled &&
			route.rootPath !== routes.calculationPreview.rootPath &&
			route.rootPath !== routes.calculationClone.rootPath &&
			route.rootPath !== routes.calculationNewVersion.rootPath &&
			route.rootPath !== routes.calculationCompare.rootPath,
	);

const useSecondaryListItems = () => {
	return [
		{
			text: "sum",
			icon: (
				<CallMissedOutgoingIcon data-test-id="menu-content--CallMissedOutgoingIcon-0" />
			),
			tooltip: "Система управления моделями",
			path: "/sum",
		},
		{
			text: "sum-rm",
			icon: (
				<CallMissedOutgoingIcon data-test-id="menu-content--CallMissedOutgoingIcon-1" />
			),
			tooltip: "Рееcтр моделей",
			path: "/sum-rm",
		},
		{
			text: "v2",
			icon: (
				<CallMissedOutgoingIcon data-test-id="menu-content--CallMissedOutgoingIcon-0" />
			),
			tooltip: "v2",
			path: `/v2`,
		},
		// { text: "Настройки", icon: <SettingsRoundedIcon /> },
	];
};

export function MenuContent() {
	const navigate = useNavigate();
	const location = useLocation();

	const secondaryListItems = useSecondaryListItems();

	const handler = (path: string) => {
		navigate(path);
	};

	return (
		<Stack
			sx={{ flexGrow: 1, p: 1, justifyContent: "space-between" }}
			data-test-id="menu-content--Stack-0"
		>
			<List data-test-id="menu-content--List-0">
				{mainListItems.map((item, index) => (
					<ListItem
						key={index}
						disablePadding
						sx={{ display: "block", mb: 0.2 }}
						onClick={() => handler(item.rootPath)}
						data-test-id="menu-content--ListItem-0"
					>
						<ListItemButton
							selected={item.rootPath === location.pathname}
							data-test-id="menu-content--ListItemButton-0"
						>
							<ListItemText
								primary={item.name}
								data-test-id="menu-content--ListItemText-0"
							/>
						</ListItemButton>
					</ListItem>
				))}
			</List>
			<List data-test-id="menu-content--List-1">
				{secondaryListItems.map((item, index) => (
					<ListItem
						key={index}
						disablePadding
						sx={{ paddingBottom: 1 }}
						data-test-id="menu-content--ListItem-1"
					>
						<div title={item.tooltip} data-test-id="menu-content--Tooltip-0">
							<Button
								size="small"
								variant="outlined"
								href={item.path}
								data-test-id="menu-content--Button-0"
							>
								<ListItemIcon data-test-id="menu-content--ListItemIcon-0">
									{item.icon}
								</ListItemIcon>
								<ListItemText
									primary={item.text}
									data-test-id="menu-content--ListItemText-1"
								/>
							</Button>
						</div>
					</ListItem>
				))}
			</List>
		</Stack>
	);
}
