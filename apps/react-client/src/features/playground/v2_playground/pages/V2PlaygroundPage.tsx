import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { V2TemplateList } from "../organisms/V2TemplateList";
import { V2AnketaExample } from "../organisms/V2AnketaExample";

export const V2PlaygroundPage = () => {
	return (
		<Flex flexDirection="column" gap={24}>
			<V2TemplateList />
			<Spacer />
			<V2AnketaExample />
		</Flex>
	);
};
