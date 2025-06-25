import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { AnketaCompareLayout } from "@react-client/features/anketa/organisms/AnketaCompareLayout";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { useSearchParams } from "react-router";

export const CompareReportsPage = () => {
	const [params] = useSearchParams();

	return (
		<div>
			<Spacer height={6} />
			<Header />
			<Spacer height={12} />
			<Flex width="100%" height="-webkit-fill-available">
				<AnketaCompareLayout />
			</Flex>
		</div>
	);
};
