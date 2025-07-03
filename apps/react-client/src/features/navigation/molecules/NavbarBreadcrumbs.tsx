import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import Breadcrumbs, { breadcrumbsClasses } from "@mui/material/Breadcrumbs";
import { styled } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { camelCase } from "lodash-es";
import { useLocation } from "react-router";
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

	const path = camelCase(location.pathname.split("/", 3).join(" "));

	const pathName = routes[path as keyof typeof routes]?.name;
	const crumb = pathName ? pathName : !path ? routes.home.name : "???";

	return (
		<StyledBreadcrumbs
			aria-label="breadcrumb"
			separator={
				<NavigateNextRoundedIcon
					fontSize="small"
					data-test-id="navbar-breadcrumbs--NavigateNextRoundedIcon-0"
				/>
			}
			data-test-id="navbar-breadcrumbs--StyledBreadcrumbs-0"
		>
			<Typography
				variant="body1"
				sx={{ color: "text.primary", fontWeight: 600 }}
				data-test-id="navbar-breadcrumbs--Typography-0"
			>
				{crumb}
			</Typography>
		</StyledBreadcrumbs>
	);
}
