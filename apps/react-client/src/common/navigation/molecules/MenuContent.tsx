import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import { IS_DEV } from "@react-client/common/constants/dev";
import { useUserStore } from "@react-client/common/store/userStore";
import { usePermissions } from "@react-client/hooks/usePermissions";
import {
	commonRoutes,
	navbarGroups as commonNavbarGroups,
} from "@react-client/routing/common/routes";
import type { AppRouteConfig } from "@react-client/routing/common/types";
import { v1Routes } from "@react-client/routing/version/v1/routes";
import { v2Routes } from "@react-client/routing/version/v2/routes";
import { useLocation, useNavigate } from "react-router";

const V1_PREFIX = "/v1";
const V2_PREFIX = "/v2";

/** Показывать заголовок «Смарт-анкета» — позже при объединении приложений в один shell. */
const SHOW_SMART_ANKETA_APP_TITLE = false;

type RemoteAppLink = {
	id: string;
	label: string;
	/** Путь shell/host к приложению-ремоуту. */
	href: string;
};

const REMOTE_APP_LINKS: RemoteAppLink[] = [
	{ id: "datalineage", label: "Data Lineage", href: "/dataLineage" },
	{ id: "sum", label: "СУМ", href: "/sum" },
	{ id: "sum-rm", label: "СУРМ", href: "/sum-rm" },
];

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

	return v2UserNavItems().filter(
		(item) => !item?.permission || hasPermission(item.permission),
	);
};

const useV1MainNestedItems = () => {
	const { hasPermission } = useUserStore();

	return getV1MainNestedItems().filter(
		(item) => !item?.permission || hasPermission(item.permission),
	);
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

/** Переход в remote shell-приложения (вне basename React Router смарт-анкеты). */
function openRemoteApp(href: string) {
	window.location.assign(href);
}

function NavSection({
	title,
	homeLabel,
	homePath,
	nestedItems,
	pathname,
	onNavigate,
	indent = 0,
}: {
	title: string;
	homeLabel: string;
	homePath: string;
	nestedItems: { rootPath: string; name: string }[];
	pathname: string;
	onNavigate: (path: string) => void;
	indent?: number;
}) {
	const homeSelected = pathname === homePath || pathname === `${homePath}/`;
	const pl = 1 + indent;

	return (
		<Box sx={{ display: "block", mb: 0.2 }}>
			<ListItemButton disabled sx={{ pl }}>
				<ListItemText secondary={title} />
			</ListItemButton>
			<List disablePadding sx={{ py: 0 }}>
				<ListItem
					disablePadding
					sx={{ display: "block", mb: 0.2 }}
					onClick={() => onNavigate(homePath)}
				>
					<ListItemButton selected={homeSelected} sx={{ pl: pl + 1 }}>
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
							<ListItemButton
								selected={pathname === fullPath}
								sx={{ pl: pl + 1 }}
							>
								<ListItemText primary={route.name} />
							</ListItemButton>
						</ListItem>
					);
				})}
			</List>
		</Box>
	);
}

function SmartAnketaSections({
	pathname,
	onNavigate,
}: {
	pathname: string;
	onNavigate: (path: string) => void;
}) {
	const {
		canAccessTracker,
		canAccessAdminPanel,
		canAccessAudit,
		canViewAllCalculations,
	} = usePermissions();
	const v2NavItems = useV2UserNavItems();
	const v1NavItems = useV1MainNestedItems();
	const adminNavItems = getAdminNavbarItems().filter((route) => {
		if (route.rootPath === commonRoutes.adminV2Audit.rootPath) {
			return canAccessAudit || canAccessAdminPanel;
		}
		return true;
	});

	return (
		<Box>
			{SHOW_SMART_ANKETA_APP_TITLE ? (
				<ListItemButton disabled>
					<ListItemText
						primary="Смарт-анкета"
						primaryTypographyProps={{ fontWeight: 700, fontSize: 13 }}
					/>
				</ListItemButton>
			) : null}

			{/* ФТ-13: без права просмотра реестра секции калькуляторов скрыты целиком. */}
			{canViewAllCalculations ? (
				<>
					<NavSection
						title="Калькулятор v2"
						homeLabel={v2Routes.home.name}
						homePath={V2_PREFIX}
						nestedItems={v2NavItems}
						pathname={pathname}
						onNavigate={onNavigate}
						indent={SHOW_SMART_ANKETA_APP_TITLE ? 1 : 0}
					/>

					<Divider sx={{ my: 1 }} />

					<NavSection
						title="Калькулятор v1"
						homeLabel={v1Routes.home.name}
						homePath={V1_PREFIX}
						nestedItems={v1NavItems}
						pathname={pathname}
						onNavigate={onNavigate}
						indent={SHOW_SMART_ANKETA_APP_TITLE ? 1 : 0}
					/>
				</>
			) : null}

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
						onNavigate={onNavigate}
						indent={SHOW_SMART_ANKETA_APP_TITLE ? 1 : 0}
					/>
				</>
			) : null}

			{/* Аудитор без admin_panel: только журнал аудита. */}
			{canAccessAudit && !canAccessAdminPanel ? (
				<>
					<Divider sx={{ my: 1 }} />
					<Box sx={{ display: "block", mb: 0.2 }}>
						<ListItem
							disablePadding
							sx={{ display: "block", mb: 0.2, py: 0 }}
							onClick={() => onNavigate(commonRoutes.adminV2Audit.rootPath)}
						>
							<ListItemButton
								selected={pathname === commonRoutes.adminV2Audit.rootPath}
								sx={{ pl: SHOW_SMART_ANKETA_APP_TITLE ? 2 : 1 }}
							>
								<ListItemText primary={commonRoutes.adminV2Audit.name} />
							</ListItemButton>
						</ListItem>
					</Box>
				</>
			) : null}

			{/* ФТ-13: админка только для appadmin / sacfg. */}
			{canAccessAdminPanel ? (
				<>
					<Divider sx={{ my: 1 }} />

					<Box sx={{ display: "block", mb: 0.2 }}>
						<ListItemButton
							disabled
							sx={{ pl: SHOW_SMART_ANKETA_APP_TITLE ? 2 : 1 }}
						>
							<ListItemText secondary={commonNavbarGroups.adminV2.title} />
						</ListItemButton>
						<List disablePadding sx={{ py: 0 }}>
							{adminNavItems.map((route) => (
								<ListItem
									key={route.rootPath}
									disablePadding
									sx={{ display: "block", mb: 0.2, py: 0 }}
									onClick={() => onNavigate(route.rootPath)}
								>
									<ListItemButton
										selected={routeRowSelected(route, pathname)}
										sx={{ pl: SHOW_SMART_ANKETA_APP_TITLE ? 3 : 2 }}
									>
										<ListItemText primary={route.name} />
									</ListItemButton>
								</ListItem>
							))}
						</List>
					</Box>
				</>
			) : null}

			{getDevNavbarItems().length > 0 ? (
				<>
					<Divider sx={{ my: 1 }} />
					<ListItemButton
						disabled
						sx={{ pl: SHOW_SMART_ANKETA_APP_TITLE ? 2 : 1 }}
					>
						<ListItemText secondary={commonNavbarGroups.dev.title} />
					</ListItemButton>
					{getDevNavbarItems().map((item) => (
						<ListItem
							key={item.rootPath}
							disablePadding
							sx={{ display: "block", mb: 0.2 }}
							onClick={() => onNavigate(item.rootPath)}
						>
							<ListItemButton
								selected={pathname === item.rootPath}
								sx={{ pl: SHOW_SMART_ANKETA_APP_TITLE ? 3 : 2 }}
							>
								<ListItemText primary={item.name} />
							</ListItemButton>
						</ListItem>
					))}
				</>
			) : null}
		</Box>
	);
}

function RemoteAppsList() {
	return (
		<Box>
			<ListItemButton disabled>
				<ListItemText secondary="Приложения" />
			</ListItemButton>
			<List disablePadding>
				{REMOTE_APP_LINKS.map((app) => (
					<ListItem
						key={app.id}
						disablePadding
						sx={{ display: "block", mb: 0.2 }}
					>
						<ListItemButton
							onClick={() => openRemoteApp(app.href)}
							title={`Открыть ${app.label}`}
						>
							<ListItemText primary={app.label} />
						</ListItemButton>
					</ListItem>
				))}
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
				{/* Уровень приложений: Смарт-анкета первая (без названия — мы уже в ней) */}
				<SmartAnketaSections pathname={pathname} onNavigate={go} />

				<Divider sx={{ my: 1.5 }} />

				{/* Остальные приложения-ремоуты */}
				<RemoteAppsList />
			</List>
		</Stack>
	);
}
