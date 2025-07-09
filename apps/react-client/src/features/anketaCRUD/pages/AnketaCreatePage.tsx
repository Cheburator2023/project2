import { useCalculationControllerCreate } from "@react-client/common/api/generated/queries/calculation";
import { CreateCalculationDto } from "@react-client/common/api/generated/types";
import { AccessDenied } from "@react-client/common/primitives/AccessDenied";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { toast } from "@react-client/common/toasts";
import { AnketaBasicLayout } from "@react-client/features/anketaCRUD/organisms/AnketaBasicLayout";
import { useAnketaCRUDFormsStore } from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { usePermissions } from "@react-client/hooks/usePermissions";
import { routes } from "@react-client/routing/routes";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

export const AnketaCreatePage = () => {
	const navigate = useNavigate();
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const store = useAnketaCRUDFormsStore();
	const { canCreateCalculation } = usePermissions();

	if (!canCreateCalculation) {
		return <AccessDenied message="У вас нет прав на создание анкеты" />;
	}

	const {
		setApiRef,
		resetApiRef,
		calculationResult,
		anketaCreate_basicInfoForm,
		anketaCreate_projectAssessmentForm,
	} = store;

	const stateBasicForm = anketaCreate_basicInfoForm.state;
	const stateProjectAssessmentForm = anketaCreate_projectAssessmentForm.state;

	const { mutate: createCalculationMutation, isPending } =
		useCalculationControllerCreate();

	const formHasErrors = !!(
		stateBasicForm?.errors?.length || stateProjectAssessmentForm?.errors?.length
	);
	const isFormDirty =
		anketaCreate_basicInfoForm?.isDirty || stateProjectAssessmentForm?.isDirty;

	const onSubmit = () => {
		setHasSubmitted(true);
		anketaCreate_basicInfoForm.api?.submit();
		anketaCreate_projectAssessmentForm.api?.submit();
	};

	useEffect(() => {
		setHasSubmitted(false);

		const basicFormData: {
			name: string;
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

		if (isFormDirty && hasSubmitted && !formHasErrors) {
			const data: CreateCalculationDto = {
				finalCoefficient: calculationResult[0]?.score,
				name: basicFormData.name,
				rfd: basicFormData.rfd,
				streamExecutor: basicFormData.streamExecutor,
				department: basicFormData.department,
				customerName: basicFormData.customerName,
				comment: basicFormData.comment,
				...stateProjectAssessmentForm.formData,
			};

			createCalculationMutation(
				{
					data,
				},
				{
					onSuccess: (data) => {
						console.log("Success:", data);
						toast.success("Расчет успешно создан");
						navigate(routes.home.rootPath);
					},
					onError: (error: any) => {
						toast.error("Ошибка при создании расчета", {
							description: error.message,
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
	}, [
		isFormDirty,
		hasSubmitted,
		formHasErrors,
		stateBasicForm,
		stateProjectAssessmentForm,
	]);

	return (
		<div data-test-id="anketa-create-page--div-0">
			<Header data-test-id="anketa-create-page--Header-0" />
			<Spacer height={6} data-test-id="anketa-create-page--Spacer-1" />
			<Flex
				width="100%"
				height="-webkit-fill-available"
				data-test-id="anketa-create-page--Flex-0"
			>
				<AnketaBasicLayout
					isCreate
					isPending={isPending}
					onSubmit={onSubmit}
					formHasErrors={formHasErrors}
					data-test-id="anketa-create-page--AnketaBasicLayout-0"
				/>
			</Flex>
		</div>
	);
};
