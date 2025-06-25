import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { AnketaBasicLayout } from "@react-client/features/anketaCRUD/organisms/AnketaBasicLayout";
import { useAnketaCRUDFormsStore } from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { useParams } from "react-router";

export const AnketaPreviewPage = () => {
	const params = useParams();
	const { setApiRef, resetApiRef, ...store } = useAnketaCRUDFormsStore();

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
