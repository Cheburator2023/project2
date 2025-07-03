import Button from "@mui/material/Button";
import { ILL_404 } from "@react-client/common/illustrations/ILL_404";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { useNavigate } from "react-router";
import { Flex } from "../common/primitives/Flex";
import { routes } from "./routes";

export const Page404 = () => {
	const navigate = useNavigate();
	return (
		<div data-test-id="--div-0">
			<Spacer height={6} data-test-id="--Spacer-0" />
			<Header data-test-id="--Header-0" />
			<Spacer height={12} data-test-id="--Spacer-1" />
			<Flex
				width="100%"
				flexDirection="column"
				alignItems="center"
				justifyContent="center"
				height="-webkit-fill-available"
				data-test-id="--Flex-0"
			>
				<>
					<ILL_404 data-test-id="--ILL_404-0" />
					<Spacer data-test-id="--Spacer-2" />
					<Spacer data-test-id="--Spacer-3" />
					<Button
						color="primary"
						size="large"
						variant="outlined"
						onClick={() => navigate(routes.home.rootPath)}
						data-test-id="--Button-0"
					>
						На главную
					</Button>
				</>
			</Flex>
		</div>
	);
};
