import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import Breadcrumbs, { breadcrumbsClasses } from "@mui/material/Breadcrumbs";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import { useLocation } from "react-router";

import { camelCase } from "lodash-es";
import { routes } from "../../../routing/routes";

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

export function NavbarBreadcrumbs() {
	const location = useLocation();

	const crumb =
		routes[
			camelCase(
				location.pathname.split("/", 3).join(" "),
			) as keyof typeof routes
		]?.name || routes.home.name;

	return (
		<StyledBreadcrumbs
			aria-label="breadcrumb"
			separator={<NavigateNextRoundedIcon fontSize="small" />}
		>
			{/* <Typography variant="h5">DataLineage</Typography> */}
			<Typography
				variant="body1"
				sx={{ color: "text.primary", fontWeight: 600 }}
			>
				{crumb}
			</Typography>
		</StyledBreadcrumbs>
	);
}
