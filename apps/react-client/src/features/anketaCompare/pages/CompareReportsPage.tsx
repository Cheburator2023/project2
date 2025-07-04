import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { AnketaCompareLayout } from "@react-client/features/anketaCompare/organisms/AnketaCompareLayout";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { useSearchParams } from "react-router";

export const CompareReportsPage = () => {
	const [_params] = useSearchParams();

	return (
		<div data-test-id="compare-reports-page--div-0">
			<Spacer height={6} data-test-id="compare-reports-page--Spacer-0" />
			<Header data-test-id="compare-reports-page--Header-0" />
			<Spacer height={12} data-test-id="compare-reports-page--Spacer-1" />
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
