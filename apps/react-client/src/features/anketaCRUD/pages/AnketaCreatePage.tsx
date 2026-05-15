import { IconButton } from "@mui/material";
import { useCalculationControllerCreate } from "@react-client/common/api/queries/calculation";
import type { CreateCalculationDto } from "@smart-anketa/api-contract";
import { Flex } from "@react-client/common/primitives/Flex";
import { toast } from "@react-client/common/toasts";
import { useAnketaCRUDFormsStore } from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { AnketaBasicLayoutCreate } from "@react-client/features/anketaCRUD/templates/AnketaBasicLayoutCreate";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import SaveIcon from "@mui/icons-material/Save";
import {routes} from "@react-client/version/v1/routing/routes";

export const AnketaCreatePage = () => {
	const navigate = useNavigate();
	const store = useAnketaCRUDFormsStore();

	const {
		reset,
		calculationResult,
		anketaCreate_basicInfoForm,
		anketaCreate_projectAssessmentForm,
	} = store;

	const stateBasicForm = anketaCreate_basicInfoForm.state;
	const stateProjectAssessmentForm = anketaCreate_projectAssessmentForm.state;

	const { mutate: createCalculationMutation, isPending } =
		useCalculationControllerCreate();

	const isFormValid =
		anketaCreate_basicInfoForm?.isValid &&
		anketaCreate_projectAssessmentForm?.isValid;

	const formHasErrors = !!(
		anketaCreate_basicInfoForm?.hasErrors ||
		anketaCreate_projectAssessmentForm?.hasErrors
	);

	const submitCount =
		anketaCreate_basicInfoForm?.submitCount +
		anketaCreate_projectAssessmentForm?.submitCount;

	const onSubmit = () => {
		anketaCreate_basicInfoForm.api?.submit();
		anketaCreate_projectAssessmentForm.api?.submit();
	};

	useEffect(() => {
		if (formHasErrors && !isFormValid) {
			return;
		}
		const basicFormData: {
			calcName: string;
			rfd: string;
			streamExecutor: string;
			department: string[];
			customerName: string;
			comment: string;
			// relatedModels: never[];
			// status: string;
			// createdAt: string;
			// id: string;
			// author: string;
		} = stateBasicForm?.formData || {};

		if (isFormValid) {
			const data: CreateCalculationDto = {
				...stateProjectAssessmentForm.formData,
				finalCoefficient: calculationResult[0]?.score,
				calculationResult: calculationResult,
				calcName: basicFormData.calcName,
				rfd: basicFormData.rfd,
				streamExecutor: basicFormData.streamExecutor,
				department: basicFormData.department,
				customerName: basicFormData.customerName,
				comment: basicFormData.comment,
			};

			createCalculationMutation(
				{
					data,
				},
				{
					onSuccess: (data) => {
						console.log("Success:", data);
						toast.success("Расчет успешно создан");
						reset();
						setTimeout(() => {
							navigate(routes.home.rootPath);
						}, 100);
					},
					onError: (error: any) => {
						toast.error("Сетевая ошибка создания расчета", {
							description: error?.response?.data?.message,
							action: {
								label: "",
								onClick: () => {},
							},
						});
						console.log("Error:", error);
					},
				},
			);
		}
	}, [isFormValid, submitCount, formHasErrors]);

	useEffect(() => {
		return () => {
			reset();
		};
	}, []);

	return (
		<div data-test-id="anketa-create-page--div-0">
			<Header data-test-id="anketa-create-page--Header-0">
				<IconButton onClick={onSubmit} title="Создать" loading={isPending}>
					<SaveIcon />
				</IconButton>
			</Header>
			<Flex
				width="100%"
				height="-webkit-fill-available"
				data-test-id="anketa-create-page--Flex-0"
			>
				<AnketaBasicLayoutCreate
					isPending={isPending}
					data-test-id="anketa-create-page--AnketaBasicLayout-0"
				/>
			</Flex>
		</div>
	);
};
