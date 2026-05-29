import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { V2TemplateList } from "../organisms/V2TemplateList";
import { V2AnketaExample } from "../organisms/V2AnketaExample";
import React from "react";
import {
	ModalExample
} from "@react-client/features/playground/v2_playground/organisms/ModalExample";

export const V2PlaygroundPage = () => {
	return (
		<Flex flexDirection="column" gap={24}>
			<V2TemplateList />
			<Spacer />
			<V2AnketaExample />
			<Spacer/>
			<ModalExample/>
		</Flex>
	);
};
