import { Typography } from "@mui/material";
import Button from "@mui/material/Button";
import { useNavigate } from "react-router";

import { Spacer } from "@react-client/common/primitives/Spacer";
import { Flex } from "../common/primitives/Flex";
import { routes } from "./routes";

export const Page404 = () => {
	const navigate = useNavigate();
	return (
		<Flex
			width="100vw"
			height="100vh"
			alignItems="center"
			justifyContent="center"
		>
			<Flex flexDirection="column" alignItems="center">
				<Typography variant="h4">Страница не найдена</Typography>
				<Spacer />
				<Button
					color="primary"
					variant="contained"
					onClick={() => navigate(routes.home.rootPath)}
				>
					На главную
				</Button>
			</Flex>
		</Flex>
	);
};
