import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { AnketaBasicLayout } from "@react-client/features/anketa/organisms/AnketaBasicLayout";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { useParams } from "react-router";

export const AnketaPreviewPage = () => {
	const params = useParams();

	const calcId = params.id;

	return (
		<div>
			<Spacer height={6} />
			<Header calcId={calcId} />
			<Spacer height={12} />
			<Flex width="100%" height="-webkit-fill-available">
				<AnketaBasicLayout />
			</Flex>
		</div>
	);
};
