import { Box } from "@mui/material";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import { IS_DEV } from "@react-client/common/constants/dev";
import { navbarGroups, routes, type AppRouteConfig } from "@react-client/routing/routes";
import { useLocation, useNavigate } from "react-router";

type NavbarGroupKey = keyof typeof navbarGroups;

const getNavbarItemsByGroup = (group: NavbarGroupKey) =>
	(Object.values(routes) as AppRouteConfig[])
		.filter((r) => r.showInNavbar)
		.filter((r) => r.navbar?.group === group)
		.filter((r) => !r.disabled)
		.filter((r) => !(r.devOnly && !IS_DEV))
		.sort((a, b) => (a.navbar?.order ?? 0) - (b.navbar?.order ?? 0));

const devOnlyNavItems = (Object.values(routes) as AppRouteConfig[])
	.filter((r) => r.showInNavbar)
	.filter((r) => Boolean(r.devOnly) && IS_DEV)
	.filter((r) => !r.disabled)
	.sort((a, b) => (a.navbar?.order ?? 0) - (b.navbar?.order ?? 0));

/** Вложенные пункты группы «Разделы» (без главной — она отдельной строкой сверху). */
const mainNestedItems = () =>
	getNavbarItemsByGroup("main").filter((r) => r.rootPath !== routes.home.rootPath);

function routeRowSelected(route: AppRouteConfig, pathname: string): boolean {
	if (route.rootPath === routes.adminV2Schemas.rootPath) {
		return (
			pathname === routes.adminV2Schemas.rootPath ||
			/^\/admin\/v2\/schemas\/[^/]+\/history$/.test(pathname) ||
			/^\/admin\/v2\/templates\/[^/]+$/.test(pathname)
		);
	}
	return route.rootPath === pathname;
}

export function MenuContent() {
	const navigate = useNavigate();
	const { pathname } = useLocation();

	const go = (path: string) => navigate(path);

	return (
		<Stack sx={{ flexGrow: 1, p: 1, justifyContent: "space-between" }} data-test-id="menu-content--Stack-0">
			<List data-test-id="menu-content--List-0" disablePadding>
				<ListItem disablePadding sx={{ display: "block", mb: 0.2 }} onClick={() => go(routes.home.rootPath)}>
					<ListItemButton selected={pathname === routes.home.rootPath}>
						<ListItemText primary={routes.home.name} />
					</ListItemButton>
				</ListItem>

				<Box sx={{ display: "block", mb: 0.2 }}>
					<ListItemButton disabled>
						<ListItemText secondary={navbarGroups.main.title} />
					</ListItemButton>
					<List disablePadding sx={{ py: 0 }}>
						{mainNestedItems().map((route) => (
							<ListItem
								key={route.rootPath}
								disablePadding
								sx={{ display: "block", mb: 0.2, py: 0 }}
								onClick={() => go(route.rootPath)}
							>
								<ListItemButton selected={route.rootPath === pathname}>
									<ListItemText primary={route.name} />
								</ListItemButton>
							</ListItem>
						))}
					</List>
				</Box>

				<Box sx={{ display: "block", mb: 0.2 }}>
					<ListItemButton disabled>
						<ListItemText secondary={navbarGroups.adminV2.title} />
					</ListItemButton>
					<List disablePadding sx={{ py: 0 }}>
						{getNavbarItemsByGroup("adminV2").map((route) => (
							<ListItem
								key={route.rootPath}
								disablePadding
								sx={{ display: "block", mb: 0.2, py: 0 }}
								onClick={() => go(route.rootPath)}
							>
								<ListItemButton selected={routeRowSelected(route, pathname)}>
									<ListItemText primary={route.name} />
								</ListItemButton>
							</ListItem>
						))}
					</List>
				</Box>

				{devOnlyNavItems.length > 0 ? (
					<>
						<Divider sx={{ my: 1 }} />
						{devOnlyNavItems.map((item) => (
							<ListItem
								key={item.rootPath}
								disablePadding
								sx={{ display: "block", mb: 0.2 }}
								onClick={() => go(item.rootPath)}
							>
								<ListItemButton selected={item.rootPath === pathname}>
									<ListItemText primary={item.name} />
								</ListItemButton>
							</ListItem>
						))}
					</>
				) : null}
			</List>
		</Stack>
	);
}
