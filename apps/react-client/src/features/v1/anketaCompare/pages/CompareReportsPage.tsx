import { Flex } from "@react-client/common/primitives/Flex";
import { AnketaCompareLayout } from "@react-client/features/v1/anketaCompare/organisms/AnketaCompareLayout";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { useSearchParams } from "react-router";

export const CompareReportsPage = () => {
	const [_params] = useSearchParams();

	return (
		<div data-test-id="compare-reports-page--div-0">
			<Header data-test-id="compare-reports-page--Header-0" />
			<Flex
				width="100%"
				height="-webkit-fill-available"
				data-test-id="compare-reports-page--Flex-0"
			>
				<AnketaCompareLayout data-test-id="compare-reports-page--AnketaCompareLayout-0" />
			</Flex>
		</div>
	);
};
