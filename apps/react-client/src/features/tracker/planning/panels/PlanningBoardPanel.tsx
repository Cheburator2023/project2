import { Flex } from "@react-client/common/primitives/Flex";
import { PlanningSourceBoardView } from "@react-client/features/tracker/planning/panels/PlanningSourceBoardView";

export function PlanningBoardPanel() {
	return (
		<Flex
			flexDirection="column"
			height="100%"
			minHeight="0"
			padding="8px"
		>
			<PlanningSourceBoardView />
		</Flex>
	);
}
