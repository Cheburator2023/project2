import { styled } from "@mui/material";
import { Flex } from "@react-client/common/primitives/Flex";
import { JsonForm } from "@react-client/features/json-form/JsonForm";

export const Dashboard = () => {
	return (
		<Wrapper id="dashboard_page_container">
			<Flex width="100%" height="100%" position="relative">
				<JsonForm />
			</Flex>
		</Wrapper>
	);
};

const Wrapper = styled("div")`
  height: calc(100vh - 82px);
  position: relative;
`;
