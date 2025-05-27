import { styled } from "@mui/material";
import { Flex } from "@react-client/common/primitives/Flex";

export const Dashboard = () => {
	return (
		<Wrapper id="dashboard_page_container">
			<Flex width="100%" height="100%" position="relative">
				Dashboard
			</Flex>
		</Wrapper>
	);
};

const Wrapper = styled("div")`
	height: calc(100vh - 82px);
	position: relative;
`;
