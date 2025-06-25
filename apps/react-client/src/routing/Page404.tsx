import { Typography } from "@mui/material";
import Button from "@mui/material/Button";
import { useNavigate } from "react-router";

import { Spacer } from "@react-client/common/primitives/Spacer";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { Flex } from "../common/primitives/Flex";
import { routes } from "./routes";

export const Page404 = () => {
	const navigate = useNavigate();
	return (
		<div>
			<Spacer height={6} />
			<Header />
			<Spacer height={12} />
			<Flex
				width="100%"
				flexDirection="column"
				alignItems="center"
				justifyContent="center"
				height="-webkit-fill-available"
			>
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
		</div>
	);
};
