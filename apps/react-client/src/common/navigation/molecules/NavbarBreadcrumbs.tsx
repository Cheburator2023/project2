import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import Breadcrumbs, { breadcrumbsClasses } from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import { styled } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { Link as RouterLink, useLocation } from "react-router";
import { buildNavbarBreadcrumbTrail } from "./navbarBreadcrumbTrail";

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

type NavbarBreadcrumbCrumbProps = {
	label: string;
	to?: string;
	isLast: boolean;
	index: number;
};

function NavbarBreadcrumbCrumb({
	label,
	to,
	isLast,
	index,
}: NavbarBreadcrumbCrumbProps) {
	if (isLast || !to) {
		return (
			<Typography
				variant="body1"
				sx={{
					color: "text.primary",
					fontWeight: 600,
				}}
				data-test-id={`navbar-breadcrumbs--Typography-${index}`}
			>
				{label}
			</Typography>
		);
	}

	return (
		<Link
			component={RouterLink}
			to={to}
			underline="hover"
			variant="body1"
			color="inherit"
			sx={{
				color: "text.secondary",
				fontWeight: 400,
			}}
			data-test-id={`navbar-breadcrumbs--Link-${index}`}
		>
			{label}
		</Link>
	);
}

export function NavbarBreadcrumbs() {
	const location = useLocation();

	const items = useMemo(
		() => buildNavbarBreadcrumbTrail(location.pathname),
		[location.pathname],
	);

	return (
		<StyledBreadcrumbs
			aria-label="breadcrumb"
			separator={<NavigateNextRoundedIcon fontSize="small" />}
			data-test-id="navbar-breadcrumbs--StyledBreadcrumbs-0"
		>
			{items.map((item, index) => (
				<NavbarBreadcrumbCrumb
					key={`${item.label}-${index}`}
					label={item.label}
					to={item.to}
					isLast={index === items.length - 1}
					index={index}
				/>
			))}
		</StyledBreadcrumbs>
	);
}
