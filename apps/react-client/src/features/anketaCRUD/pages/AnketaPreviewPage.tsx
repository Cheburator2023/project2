import { CircularProgress } from "@mui/material";
import { useCalculationControllerFindOne } from "@react-client/common/api/generated/queries/calculation";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { AnketaBasicLayout } from "@react-client/features/anketaCRUD/organisms/AnketaBasicLayout";
import { useAnketaCRUDFormsStore } from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { useParams } from "react-router";

export const AnketaPreviewPage = () => {
	const params = useParams();
	const calcId = params.id || "";

	const { setApiRef, resetApiRef, ...store } = useAnketaCRUDFormsStore();

	const { data: initialData, isFetching } = useCalculationControllerFindOne(
		calcId,
		{
			query: {
				enabled: !!calcId,
			},
		},
	);

	return (
		<div data-test-id="anketa-preview-page--div-0">
			<Spacer height={6} data-test-id="anketa-preview-page--Spacer-0" />
			<Header calcId={calcId} data-test-id="anketa-preview-page--Header-0" />
			<Spacer height={12} data-test-id="anketa-preview-page--Spacer-1" />
			<Flex
				width="100%"
				height="-webkit-fill-available"
				data-test-id="anketa-preview-page--Flex-0"
			>
				{isFetching ? (
					<CircularProgress />
				) : (
					<AnketaBasicLayout
						initialData={initialData}
						data-test-id="anketa-preview-page--AnketaBasicLayout-0"
					/>
				)}
			</Flex>
		</div>
	);
};
