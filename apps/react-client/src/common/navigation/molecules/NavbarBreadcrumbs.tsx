import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import Breadcrumbs, { breadcrumbsClasses } from "@mui/material/Breadcrumbs";
import { styled } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { commonRoutes } from "@react-client/routing/common/routes";
import { v1Routes } from "@react-client/routing/version/v1/routes";
import { v2Routes } from "@react-client/routing/version/v2/routes";
import { useMemo } from "react";
import { useLocation } from "react-router";

const StyledBreadcrumbs = styled(Breadcrumbs)(({ theme }) => ({
	margin: theme.spacing(1, 0),
	[`& .${breadcrumbsClasses.separator}`]: {
		color: (theme.vars || theme).palette.action.disabled,
		margin: 1,
	},
	[`& .${breadcrumbsClasses.ol}`]: {
		alignItems: "center",
	},
}));

function adminTrail(pathname: string): string[] | null {
	const adminRoot = commonRoutes.admin.rootPath;
	if (!pathname.startsWith(adminRoot)) return null;

	const trail: string[] = [commonRoutes.admin.name];

	if (
		pathname.startsWith(`${adminRoot}/schemas/`) &&
		pathname.endsWith("/history")
	) {
		trail.push(commonRoutes.adminV2Schemas.name);
		trail.push(
			commonRoutes.adminV2TemplateHistory.shortName ??
				commonRoutes.adminV2TemplateHistory.name,
		);
		return trail;
	}

	if (pathname.startsWith(commonRoutes.adminV2History.rootPath)) {
		trail.push(commonRoutes.adminV2Schemas.name);
		return trail;
	}

	if (pathname.startsWith(commonRoutes.adminV2Schemas.rootPath)) {
		trail.push(commonRoutes.adminV2Schemas.name);
		return trail;
	}

	if (pathname.startsWith(commonRoutes.adminV2Guide.rootPath)) {
		trail.push(commonRoutes.adminV2Guide.name);
		return trail;
	}

	if (pathname.startsWith(commonRoutes.adminV2Dictionaries.rootPath)) {
		trail.push(commonRoutes.adminV2Dictionaries.name);
		return trail;
	}

	const templateModeMatch = pathname.match(
		/^\/admin\/templates\/[^/]+\/(edit|read|logic)$/,
	);
	if (templateModeMatch?.[1]) {
		trail.push(commonRoutes.adminV2Schemas.name);
		const mode = templateModeMatch[1];
		if (mode === "edit") {
			trail.push(
				commonRoutes.adminV2TemplateEditor.shortName ??
					commonRoutes.adminV2TemplateEditor.name,
			);
		} else if (mode === "read") {
			trail.push(
				commonRoutes.adminV2TemplateRead.shortName ??
					commonRoutes.adminV2TemplateRead.name,
			);
		} else {
			trail.push(
				commonRoutes.adminV2TemplateLogic.shortName ??
					commonRoutes.adminV2TemplateLogic.name,
			);
		}
		return trail;
	}

	return trail;
}

export function NavbarBreadcrumbs() {
	const location = useLocation();

	const labels = useMemo(() => {
		const pathname = location.pathname;

		const adminLabels = adminTrail(pathname);
		if (adminLabels) return adminLabels;

		const playgroundTemplateMatch = pathname.match(
			/^\/playground\/v2\/templates\/[^/]+\/(edit|read|logic)$/,
		);
		if (playgroundTemplateMatch?.[1]) {
			const mode = playgroundTemplateMatch[1];
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
				commonRoutes.playground.name,
				commonRoutes.playgroundV2.name,
				modeLabel,
			];
		}
		if (pathname.startsWith(commonRoutes.playgroundV2.rootPath)) {
			return [commonRoutes.playground.name, commonRoutes.playgroundV2.name];
		}
		if (pathname.startsWith(commonRoutes.playground.rootPath)) {
			return [commonRoutes.playground.name];
		}

		if (pathname === "/v2" || pathname === "/v2/") {
			return ["Калькулятор v2", v2Routes.home.name];
		}
		if (pathname.startsWith("/v2/")) {
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
					return ["Калькулятор v2", route.name];
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
					return ["Калькулятор v2", route.name];
				}
			}

			return ["Калькулятор v2", v2Routes.home.name];
		}

		if (pathname === "/v1" || pathname === "/v1/") {
			return [v1Routes.home.name];
		}
		if (pathname.startsWith("/v1/")) {
			for (const r of Object.values(v1Routes)) {
				if (
					"rootPath" in r &&
					typeof r.rootPath === "string" &&
					!r.rootPath.startsWith("/") &&
					!r.rootPath.includes(":")
				) {
					const full = `/v1/${r.rootPath}`.replace(/\/$/, "");
					if (pathname === full) return ["Калькулятор v1", r.name];
				}
			}
		}

		if (pathname === "/") return ["Реестр"];

		return ["…"];
	}, [location.pathname]);

	return (
		<StyledBreadcrumbs
			aria-label="breadcrumb"
			separator={<NavigateNextRoundedIcon fontSize="small" />}
			data-test-id="navbar-breadcrumbs--StyledBreadcrumbs-0"
		>
			{labels.map((label, index) => (
				<Typography
					key={`${label}-${index}`}
					variant="body1"
					sx={{
						color:
							index === labels.length - 1 ? "text.primary" : "text.secondary",
						fontWeight: index === labels.length - 1 ? 600 : 400,
					}}
					data-test-id={`navbar-breadcrumbs--Typography-${index}`}
				>
					{label}
				</Typography>
			))}
		</StyledBreadcrumbs>
	);
}
