import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import { IS_DEV } from "@react-client/common/constants/dev";
import { usePermissions } from "@react-client/hooks/usePermissions";
import {
	commonRoutes,
	navbarGroups as commonNavbarGroups,
} from "@react-client/routing/common/routes";
import type { AppRouteConfig } from "@react-client/routing/common/types";
import { v1Routes } from "@react-client/routing/version/v1/routes";
import { v2Routes } from "@react-client/routing/version/v2/routes";
import { useLocation, useNavigate } from "react-router";
import {useUserStore} from "@react-client/common/store/userStore";

const V1_PREFIX = "/v1";
const V2_PREFIX = "/v2";

const getAdminNavbarItems = () =>
	(Object.values(commonRoutes) as AppRouteConfig[])
		.filter((r) => r.showInNavbar)
		.filter((r) => r.navbar?.group === "adminV2")
		.filter((r) => !r.disabled)
		.sort((a, b) => (a.navbar?.order ?? 0) - (b.navbar?.order ?? 0));

const getTrackerNavbarItems = () =>
	(Object.values(commonRoutes) as AppRouteConfig[])
		.filter((r) => r.showInNavbar)
		.filter((r) => r.navbar?.group === "tracker")
		.filter((r) => !r.disabled)
		.sort((a, b) => (a.navbar?.order ?? 0) - (b.navbar?.order ?? 0));

const getDevNavbarItems = () =>
	(Object.values(commonRoutes) as AppRouteConfig[])
		.filter((r) => r.showInNavbar)
		.filter((r) => Boolean(r.devOnly) && IS_DEV)
		.filter((r) => !r.disabled)
		.sort((a, b) => (a.navbar?.order ?? 0) - (b.navbar?.order ?? 0));

const getV1MainNestedItems = () =>
	(Object.values(v1Routes) as AppRouteConfig[])
		.filter((r) => r.showInNavbar)
		.filter((r) => r.navbar?.group === "main")
		.filter((r) => !r.disabled)
		.filter((r) => r.rootPath !== v1Routes.home.rootPath)
		.sort((a, b) => (a.navbar?.order ?? 0) - (b.navbar?.order ?? 0));

const v2UserNavItems = () =>
	(Object.values(v2Routes) as AppRouteConfig[]).filter(
		(r) =>
			!r.disabled &&
			r.rootPath !== v2Routes.home.rootPath &&
			r.rootPath !== v2Routes.calculationPreview.rootPath &&
			r.rootPath !== v2Routes.calculationClone.rootPath &&
			r.rootPath !== v2Routes.calculationNewVersion.rootPath &&
			r.rootPath !== v2Routes.calculationCompare.rootPath,
	);

const useV2UserNavItems = () => {
	const { hasPermission } = useUserStore();
	
	return v2UserNavItems().filter(item => !item?.permission || hasPermission(item.permission));
};

function routeRowSelected(route: AppRouteConfig, pathname: string): boolean {
	if (route.rootPath === commonRoutes.adminV2Schemas.rootPath) {
		return (
			pathname === commonRoutes.adminV2Schemas.rootPath ||
			/^\/admin\/schemas\/[^/]+\/history$/.test(pathname) ||
			/^\/admin\/templates\/[^/]+/.test(pathname)
		);
	}
	return route.rootPath === pathname;
}

function NavSection({
	title,
	homeLabel,
	homePath,
	nestedItems,
	pathname,
	onNavigate,
}: {
	title: string;
	homeLabel: string;
	homePath: string;
	nestedItems: { rootPath: string; name: string }[];
	pathname: string;
	onNavigate: (path: string) => void;
}) {
	const homeSelected =
		pathname === homePath || pathname === `${homePath}/`;

	return (
		<Box sx={{ display: "block", mb: 0.2 }}>
			<ListItemButton disabled>
				<ListItemText secondary={title} />
			</ListItemButton>
			<List disablePadding sx={{ py: 0 }}>
				<ListItem
					disablePadding
					sx={{ display: "block", mb: 0.2 }}
					onClick={() => onNavigate(homePath)}
				>
					<ListItemButton selected={homeSelected}>
						<ListItemText primary={homeLabel} />
					</ListItemButton>
				</ListItem>
				{nestedItems.map((route) => {
					const fullPath = route.rootPath.startsWith("/")
						? route.rootPath
						: `${homePath}/${route.rootPath}`.replace(/\/+/g, "/");
					return (
						<ListItem
							key={fullPath}
							disablePadding
							sx={{ display: "block", mb: 0.2, py: 0 }}
							onClick={() => onNavigate(fullPath)}
						>
							<ListItemButton selected={pathname === fullPath}>
								<ListItemText primary={route.name} />
							</ListItemButton>
						</ListItem>
					);
				})}
			</List>
		</Box>
	);
}

export function MenuContent() {
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const { canAccessTracker } = usePermissions();

	const v2UserNavItems = useV2UserNavItems()

	const go = (path: string) => navigate(path);

	return (
		<Stack
			sx={{ flexGrow: 1, p: 1, justifyContent: "space-between" }}
			data-test-id="menu-content--Stack-0"
		>
			<List data-test-id="menu-content--List-0" disablePadding>
				<NavSection
					title="Калькулятор v2"
					homeLabel={v2Routes.home.name}
					homePath={V2_PREFIX}
					nestedItems={v2UserNavItems}
					pathname={pathname}
					onNavigate={go}
				/>

				<Divider sx={{ my: 1 }} />

				<NavSection
					title="Калькулятор v1"
					homeLabel={v1Routes.home.name}
					homePath={V1_PREFIX}
					nestedItems={getV1MainNestedItems()}
					pathname={pathname}
					onNavigate={go}
				/>

				{canAccessTracker ? (
					<>
						<Divider sx={{ my: 1 }} />

						<NavSection
							title={commonNavbarGroups.tracker.title}
							homeLabel={commonRoutes.trackerProjects.name}
							homePath={commonRoutes.trackerProjects.rootPath}
							nestedItems={getTrackerNavbarItems().filter(
								(route) =>
									route.rootPath !== commonRoutes.trackerProjects.rootPath,
							)}
							pathname={pathname}
							onNavigate={go}
						/>
					</>
				) : null}

				<Divider sx={{ my: 1 }} />

				<Box sx={{ display: "block", mb: 0.2 }}>
					<ListItemButton disabled>
						<ListItemText secondary={commonNavbarGroups.adminV2.title} />
					</ListItemButton>
					<List disablePadding sx={{ py: 0 }}>
						{getAdminNavbarItems().map((route) => (
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

				{getDevNavbarItems().length > 0 ? (
					<>
						<Divider sx={{ my: 1 }} />
						<ListItemButton disabled>
							<ListItemText secondary={commonNavbarGroups.dev.title} />
						</ListItemButton>
						{getDevNavbarItems().map((item) => (
							<ListItem
								key={item.rootPath}
								disablePadding
								sx={{ display: "block", mb: 0.2 }}
								onClick={() => go(item.rootPath)}
							>
								<ListItemButton selected={pathname === item.rootPath}>
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
