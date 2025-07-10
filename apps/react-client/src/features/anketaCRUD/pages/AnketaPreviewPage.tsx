/** biome-ignore-all lint/correctness/noConstantCondition: <explanation> */

import ViewComfyIcon from "@mui/icons-material/ViewComfy";
import ViewDayIcon from "@mui/icons-material/ViewDay";
import { CircularProgress, IconButton } from "@mui/material";
import { useCalculationControllerFindOne } from "@react-client/common/api/generated/queries/calculation";
import { Flex } from "@react-client/common/primitives/Flex";
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

	const { data: initialData, isFetching } = useCalculationControllerFindOne(
		calcId,
		{
			query: {
				enabled: !!calcId,
			},
		},
	);

	const mock = {
		id: "1d3a214c-6713-489a-83dc-696efec13490",
		name: "test_name_WWW_666",
		rfd: "RFD-33333",
		streamExecutor: ["Разработка моделей для КМБ и КСБ"],
		department: ["Департамент операционной поддержки бизнеса", "тест", "тест2"],
		customerName: "customerName test",
		comment: "test comment",
		questionnaireData: {
			name: "test_name_WWW_666",
			modelsCount: 1,
			autoMlRequired: "Не требуется",
			initiativeCost: "438-870 млн.",
			setupComplexity:
				"2 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено. Модель оценки риска",
			dataSourcesCount: "5",
			readyPromReports: "Нет",
			generalUncertainty: [
				{
					type: "planningRequirementGaps",
					probability: "Реализация 1 раз в 1-3 года",
					influence:
						"Значительный негативный эффект на возможность достижения целей проекта",
				},
				{
					type: "adjacentProjectsImpact",
					probability: "Реализация 1 раз в 1-3 года",
					influence:
						"Реализация проекта с контролируемыми отклонениями от изначальных целей",
				},
			],
			initiativeTimeline: "1-4 мес.",
			pilotModelRequired: "Не требуется",
			algorithmComplexity: [
				{
					algorithmType: "Текстовая аналитика_LLM",
				},
			],
			pilotSupportRequired: "Не требуется",
			uncertaintyAdjustment: 2,
			assessedInitiativesCount: "1",
			productionAdditionalReports: "6",
			productionDeploymentChannels: ["LLM"],
		},
		finalCoefficient: 718.3599999999999,
		createdAt: "2025-07-09T15:38:39.181Z",
		author: "test_ds_lead test_ds_lead",
	};

	return (
		<div data-test-id="anketa-preview-page--div-0">
			<Header calcId={calcId} data-test-id="anketa-preview-page--Header-0">
				<IconButton onClick={() => setComfyView(!comfyView)}>
					{!comfyView ? <ViewComfyIcon /> : <ViewDayIcon />}
				</IconButton>
			</Header>
			<Flex
				width="100%"
				height="-webkit-fill-available"
				data-test-id="anketa-preview-page--Flex-0"
			>
				{false ? (
					<CircularProgress />
				) : (
					<AnketaBasicLayoutPreview
						initialData={mock as any}
						comfyView={comfyView}
					/>
				)}
			</Flex>
		</div>
	);
};
