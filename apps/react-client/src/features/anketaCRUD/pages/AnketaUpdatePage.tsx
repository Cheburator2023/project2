/** biome-ignore-all lint/correctness/noConstantCondition: <explanation> */

import ViewComfyIcon from "@mui/icons-material/ViewComfy";
import ViewDayIcon from "@mui/icons-material/ViewDay";
import { Button, IconButton, Typography } from "@mui/material";
import { useCalculationControllerFindOne } from "@react-client/common/api/generated/queries/calculation";
import { Card } from "@react-client/common/muiCustom/Card";
import { FullScreenLoader } from "@react-client/common/muiCustom/FullScreenLoader";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { useAnketaCRUDFormsStore } from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { AnketaBasicLayoutPreview } from "@react-client/features/anketaCRUD/templates/AnketaBasicLayoutPreview";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { useState } from "react";
import { useParams } from "react-router";

export const AnketaPreviewPage = () => {
	const params = useParams();
	const calcId = params.id || "";
	const [comfyView, setComfyView] = useState(true);

	const { setApiRef, resetApiRef, ...store } = useAnketaCRUDFormsStore();

	const {
		data: initialData,
		refetch,
		isFetching,
		isError,
	} = useCalculationControllerFindOne(calcId, {
		query: {
			enabled: !!calcId,
		},
	});

	return (
		<div data-test-id="anketa-preview-page--div-0">
			<Header calcId={calcId} data-test-id="anketa-preview-page--Header-0">
				<IconButton onClick={() => setComfyView(!comfyView)}>
					{!comfyView ? <ViewComfyIcon /> : <ViewDayIcon />}
				</IconButton>
			</Header>

			{isError ? (
				<Flex
					justifyContent="center"
					alignItems="center"
					width="100%"
					height="100%"
				>
					<Card padding="30px">
						<Typography variant="h4">Ошибка!</Typography>
						<Spacer />
						<Button variant="contained" onClick={refetch as any}>
							Перезапросить данные
						</Button>
					</Card>
				</Flex>
			) : isFetching ? (
				<FullScreenLoader />
			) : (
				<AnketaBasicLayoutPreview
					initialData={initialData as any}
					comfyView={comfyView}
				/>
			)}
		</div>
	);
};
