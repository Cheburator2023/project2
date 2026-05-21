import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import { IS_DEV } from "@react-client/common/constants/dev";
import {
	navbarGroups,
	routes,
	type AppRouteConfig,
} from "@react-client/routing/version/v1/routing/routes";
import { routes as routesV2User } from "@react-client/routing/version/v2/routing/routes";
import { useLocation, useNavigate } from "react-router";

type NavbarGroupKey = keyof typeof navbarGroups;

const V1_PREFIX = "/v1";
const V2_PREFIX = "/v2";

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

function joinVersionPath(prefix: string, segment: string): string {
	if (!segment) return prefix;
	if (segment.startsWith("/")) return segment;
	return `${prefix}/${segment}`.replace(/\/+/g, "/");
}

const v1MainNestedItems = () =>
	getNavbarItemsByGroup("main").filter((r) => r.rootPath !== routes.home.rootPath);

const v2UserNavItems = () =>
	(Object.values(routesV2User) as AppRouteConfig[]).filter(
		(r) =>
			!r.disabled &&
			r.rootPath !== routesV2User.home.rootPath &&
			r.rootPath !== routesV2User.calculationPreview.rootPath &&
			r.rootPath !== routesV2User.calculationClone.rootPath &&
			r.rootPath !== routesV2User.calculationNewVersion.rootPath &&
			r.rootPath !== routesV2User.calculationCompare.rootPath,
	);

function routeRowSelected(route: AppRouteConfig, pathname: string): boolean {
	if (route.rootPath === routes.adminV2Schemas.rootPath) {
		return (
			pathname === routes.adminV2Schemas.rootPath ||
			/^\/v2\/admin\/schemas\/[^/]+\/history$/.test(pathname) ||
			/^\/v2\/admin\/templates\/[^/]+/.test(pathname)
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
						: joinVersionPath(
								homePath.startsWith(V2_PREFIX) ? V2_PREFIX : V1_PREFIX,
								route.rootPath,
							);
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

	const go = (path: string) => navigate(path);

	return (
		<Stack
			sx={{ flexGrow: 1, p: 1, justifyContent: "space-between" }}
			data-test-id="menu-content--Stack-0"
		>
			<List data-test-id="menu-content--List-0" disablePadding>
				<NavSection
					title="Калькулятор v2"
					homeLabel={routesV2User.home.name}
					homePath={V2_PREFIX}
					nestedItems={v2UserNavItems()}
					pathname={pathname}
					onNavigate={go}
				/>

				<Divider sx={{ my: 1 }} />

				<NavSection
					title="Калькулятор v1"
					homeLabel={routes.home.name}
					homePath={V1_PREFIX}
					nestedItems={v1MainNestedItems()}
					pathname={pathname}
					onNavigate={go}
				/>

				<Divider sx={{ my: 1 }} />

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
						<ListItemButton disabled>
							<ListItemText secondary="Разработка" />
						</ListItemButton>
						{devOnlyNavItems.map((item) => {
							const href = item.rootPath.startsWith("/")
								? item.rootPath
								: `/${item.rootPath}`;
							return (
							<ListItem
								key={href}
								disablePadding
								sx={{ display: "block", mb: 0.2 }}
								onClick={() => go(href)}
							>
								<ListItemButton selected={pathname === href}>
									<ListItemText primary={item.name} />
								</ListItemButton>
							</ListItem>
							);
						})}
					</>
				) : null}
			</List>
		</Stack>
	);
}
