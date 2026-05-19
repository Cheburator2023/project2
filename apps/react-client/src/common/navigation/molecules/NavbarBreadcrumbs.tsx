import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import Breadcrumbs, { breadcrumbsClasses } from "@mui/material/Breadcrumbs";
import { styled } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { routes } from "@react-client/routing/routes";
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
	if (!pathname.startsWith("/admin")) return null;

	const trail: string[] = [routes.admin.name];

	if (pathname.startsWith("/admin/v2/schemas/") && pathname.endsWith("/history")) {
		trail.push(routes.adminV2Schemas.name);
		trail.push(
			routes.adminV2TemplateHistory.shortName ?? routes.adminV2TemplateHistory.name,
		);
		return trail;
	}

	if (pathname.startsWith(routes.adminV2History.rootPath)) {
		trail.push(routes.adminV2Schemas.name);
		return trail;
	}

	if (pathname.startsWith(routes.adminV2Schemas.rootPath)) {
		trail.push(routes.adminV2Schemas.name);
		return trail;
	}

	if (pathname.startsWith(routes.adminV2Dictionaries.rootPath)) {
		trail.push(routes.adminV2Dictionaries.name);
		return trail;
	}

	const templateModeMatch = pathname.match(
		/^\/admin\/v2\/templates\/[^/]+\/(edit|read)$/,
	);
	if (templateModeMatch?.[1]) {
		trail.push(routes.adminV2Schemas.name);
		trail.push(
			templateModeMatch[1] === "edit"
				? (routes.adminV2TemplateEditor.shortName ??
						routes.adminV2TemplateEditor.name)
				: (routes.adminV2TemplateRead.shortName ?? routes.adminV2TemplateRead.name),
		);
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
			/^\/playground\/v2\/templates\/[^/]+\/(edit|read)$/,
		);
		if (playgroundTemplateMatch?.[1]) {
			return [
				routes.playground.name,
				routes.playgroundV2.name,
				playgroundTemplateMatch[1] === "edit"
					? (routes.playgroundV2TemplateEditor.shortName ??
							routes.playgroundV2TemplateEditor.name)
					: (routes.playgroundV2TemplateRead.shortName ??
							routes.playgroundV2TemplateRead.name),
			];
		}
		if (pathname.startsWith(routes.playgroundV2.rootPath)) {
			return [routes.playground.name, routes.playgroundV2.name];
		}
		if (pathname.startsWith(routes.playground.rootPath)) {
			return [routes.playground.name];
		}

		for (const r of Object.values(routes)) {
			if ("rootPath" in r && typeof r.rootPath === "string" && !r.rootPath.includes(":")) {
				if (r.rootPath === pathname) return [r.name];
			}
		}

		if (pathname === "/") return [routes.home.name];

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
