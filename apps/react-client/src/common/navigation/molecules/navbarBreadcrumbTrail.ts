import { commonRoutes } from "@react-client/routing/common/routes";
import { v1Routes } from "@react-client/routing/version/v1/routes";
import { v2Routes } from "@react-client/routing/version/v2/routes";

export type NavbarBreadcrumbItem = {
	label: string;
	/** Путь для RouterLink; у последней крошки не задаётся. */
	to?: string;
};

const ADMIN_HOME = commonRoutes.adminV2Schemas.rootPath;
const V2_HOME = "/v2";
const V1_HOME = "/v1";

function adminTrail(pathname: string): NavbarBreadcrumbItem[] | null {
	const adminRoot = commonRoutes.admin.rootPath;
	if (!pathname.startsWith(adminRoot)) return null;

	const adminCrumb = (): NavbarBreadcrumbItem => ({
		label: commonRoutes.admin.name,
		to: ADMIN_HOME,
	});

	if (
		pathname.startsWith(`${adminRoot}/schemas/`) &&
		pathname.endsWith("/history")
	) {
		return [
			adminCrumb(),
			{ label: commonRoutes.adminV2Schemas.name, to: ADMIN_HOME },
			{
				label:
					commonRoutes.adminV2TemplateHistory.shortName ??
					commonRoutes.adminV2TemplateHistory.name,
			},
		];
	}

	if (pathname.startsWith(commonRoutes.adminV2History.rootPath)) {
		return [
			adminCrumb(),
			{ label: commonRoutes.adminV2History.name },
		];
	}

	if (pathname.startsWith(commonRoutes.adminV2Schemas.rootPath)) {
		return [adminCrumb(), { label: commonRoutes.adminV2Schemas.name }];
	}

	if (pathname.startsWith(commonRoutes.adminV2Guide.rootPath)) {
		return [adminCrumb(), { label: commonRoutes.adminV2Guide.name }];
	}

	const dictionaryDetailMatch = pathname.match(/^\/admin\/dictionaries\/([^/]+)$/);
	if (dictionaryDetailMatch) {
		return [
			adminCrumb(),
			{
				label: commonRoutes.adminV2Dictionaries.name,
				to: commonRoutes.adminV2Dictionaries.rootPath,
			},
			{
				label:
					commonRoutes.adminV2DictionaryDetail.shortName ??
					commonRoutes.adminV2DictionaryDetail.name,
			},
		];
	}

	if (pathname.startsWith(commonRoutes.adminV2Dictionaries.rootPath)) {
		return [adminCrumb(), { label: commonRoutes.adminV2Dictionaries.name }];
	}

	const typicalWorkDetailMatch = pathname.match(/^\/admin\/typical-works\/([^/]+)$/);
	if (typicalWorkDetailMatch) {
		return [
			adminCrumb(),
			{
				label: commonRoutes.adminV2TypicalWorks.name,
				to: commonRoutes.adminV2TypicalWorks.rootPath,
			},
			{
				label:
					commonRoutes.adminV2TypicalWorkDetail.shortName ??
					commonRoutes.adminV2TypicalWorkDetail.name,
			},
		];
	}

	if (pathname.startsWith(commonRoutes.adminV2TypicalWorks.rootPath)) {
		return [adminCrumb(), { label: commonRoutes.adminV2TypicalWorks.name }];
	}

	if (pathname.startsWith(commonRoutes.adminV2Formulas.rootPath)) {
		return [adminCrumb(), { label: commonRoutes.adminV2Formulas.name }];
	}

	if (pathname.startsWith(commonRoutes.adminV2Settings.rootPath)) {
		return [adminCrumb(), { label: commonRoutes.adminV2Settings.name }];
	}

	if (pathname.startsWith(commonRoutes.adminV2KeycloakMatrix.rootPath)) {
		return [adminCrumb(), { label: commonRoutes.adminV2KeycloakMatrix.name }];
	}

	const templateModeMatch = pathname.match(
		/^\/admin\/templates\/[^/]+\/(edit|read|logic)$/,
	);
	if (templateModeMatch?.[1]) {
		const mode = templateModeMatch[1];
		const modeLabel =
			mode === "edit"
				? (commonRoutes.adminV2TemplateEditor.shortName ??
						commonRoutes.adminV2TemplateEditor.name)
				: mode === "read"
					? (commonRoutes.adminV2TemplateRead.shortName ??
							commonRoutes.adminV2TemplateRead.name)
					: (commonRoutes.adminV2TemplateLogic.shortName ??
							commonRoutes.adminV2TemplateLogic.name);
		return [
			adminCrumb(),
			{ label: commonRoutes.adminV2Schemas.name, to: ADMIN_HOME },
			{ label: modeLabel },
		];
	}

	if (pathname === adminRoot || pathname === `${adminRoot}/`) {
		return [{ label: commonRoutes.admin.name }];
	}

	return [adminCrumb()];
}

function playgroundTrail(pathname: string): NavbarBreadcrumbItem[] | null {
	const playgroundRoot = commonRoutes.playground.rootPath;
	if (!pathname.startsWith(playgroundRoot)) return null;

	const playgroundCrumb = (): NavbarBreadcrumbItem => ({
		label: commonRoutes.playground.name,
		to: playgroundRoot,
	});

	const templateMatch = pathname.match(
		/^\/playground\/v2\/templates\/[^/]+\/(edit|read|logic)$/,
	);
	if (templateMatch?.[1]) {
		const mode = templateMatch[1];
		const modeLabel =
			mode === "edit"
				? (commonRoutes.playgroundV2TemplateEditor.shortName ??
						commonRoutes.playgroundV2TemplateEditor.name)
				: mode === "read"
					? (commonRoutes.playgroundV2TemplateRead.shortName ??
							commonRoutes.playgroundV2TemplateRead.name)
					: (commonRoutes.playgroundV2TemplateLogic.shortName ??
							commonRoutes.playgroundV2TemplateLogic.name);
		return [
			playgroundCrumb(),
			{ label: commonRoutes.playgroundV2.name, to: playgroundRoot },
			{ label: modeLabel },
		];
	}

	if (pathname.startsWith(commonRoutes.playgroundV2.rootPath)) {
		return [playgroundCrumb(), { label: commonRoutes.playgroundV2.name }];
	}

	return [playgroundCrumb()];
}

function v2Trail(pathname: string): NavbarBreadcrumbItem[] | null {
	if (pathname !== "/v2" && !pathname.startsWith("/v2/")) return null;

	const rootCrumb = (): NavbarBreadcrumbItem => ({
		label: "Калькулятор v2",
		to: V2_HOME,
	});

	if (pathname === "/v2" || pathname === "/v2/") {
		return [rootCrumb(), { label: v2Routes.home.name }];
	}

	const staticRoutes = Object.values(v2Routes)
		.filter(
			(segment) =>
				"rootPath" in segment &&
				typeof segment.rootPath === "string" &&
				segment.rootPath.length > 0 &&
				!segment.rootPath.includes(":"),
		)
		.map((segment) => ({
			name: segment.name,
			full: `/v2/${segment.rootPath}`.replace(/\/$/, ""),
		}))
		.sort((a, b) => b.full.length - a.full.length);

	for (const route of staticRoutes) {
		if (pathname === route.full || pathname.startsWith(`${route.full}/`)) {
			return [rootCrumb(), { label: route.name }];
		}
	}

	const paramRoutes: Array<{ pattern: RegExp; name: string }> = [
		{
			pattern: /^\/v2\/calculation\/preview\//,
			name: v2Routes.calculationPreview.name,
		},
		{
			pattern: /^\/v2\/calculation\/new_version\//,
			name: v2Routes.calculationNewVersion.name,
		},
		{
			pattern: /^\/v2\/calculation\/clone\//,
			name: v2Routes.calculationClone.name,
		},
	];

	for (const route of paramRoutes) {
		if (route.pattern.test(pathname)) {
			return [rootCrumb(), { label: route.name }];
		}
	}

	return [rootCrumb(), { label: v2Routes.home.name }];
}

function v1Trail(pathname: string): NavbarBreadcrumbItem[] | null {
	if (pathname !== "/v1" && !pathname.startsWith("/v1/")) return null;

	if (pathname === "/v1" || pathname === "/v1/") {
		return [{ label: v1Routes.home.name }];
	}

	for (const route of Object.values(v1Routes)) {
		if (
			"rootPath" in route &&
			typeof route.rootPath === "string" &&
			!route.rootPath.startsWith("/") &&
			!route.rootPath.includes(":")
		) {
			const full = `/v1/${route.rootPath}`.replace(/\/$/, "");
			if (pathname === full) {
				return [
					{ label: "Калькулятор v1", to: V1_HOME },
					{ label: route.name },
				];
			}
		}
	}

	return [{ label: "Калькулятор v1", to: V1_HOME }];
}

export function buildNavbarBreadcrumbTrail(
	pathname: string,
): NavbarBreadcrumbItem[] {
	const admin = adminTrail(pathname);
	if (admin) return admin;

	const playground = playgroundTrail(pathname);
	if (playground) return playground;

	if (pathname.startsWith(commonRoutes.settings.rootPath)) {
		return [{ label: commonRoutes.settings.name }];
	}

	const v2 = v2Trail(pathname);
	if (v2) return v2;

	const v1 = v1Trail(pathname);
	if (v1) return v1;

	if (pathname === "/") return [{ label: "Реестр" }];

	return [{ label: "…" }];
}
