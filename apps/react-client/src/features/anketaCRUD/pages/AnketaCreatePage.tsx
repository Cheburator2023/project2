import { useCalculationControllerCreate } from "@react-client/common/api/generated/queries/calculation";
import { useDeepEffect } from "@react-client/common/hooks/useDeepEffect";
import { toast } from "@react-client/common/muiCustom/toasts";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { AnketaBasicLayout } from "@react-client/features/anketaCRUD/organisms/AnketaBasicLayout";
import { useAnketaCRUDFormsStore } from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { routes } from "@react-client/routing/routes";
import { useNavigate } from "react-router";

export const AnketaCreatePage = () => {
	const navigate = useNavigate();
	const {
		setApiRef,
		resetApiRef,
		calculationResult,
		anketaCreate_basicInfoForm,
		anketaCreate_projectAssessmentForm,
		...store
	} = useAnketaCRUDFormsStore();

	const stateBasicForm = anketaCreate_basicInfoForm.state;
	const stateProjectAssessmentForm = anketaCreate_projectAssessmentForm.state;
	const { mutate: createCalculationMutation } =
		useCalculationControllerCreate();

	const formHasErrors = !!(
		anketaCreate_basicInfoForm?.state?.errors?.length ||
		anketaCreate_projectAssessmentForm?.state?.errors?.length
	);

	const onSubmit = () => {
		console.log(
			"WHOLE CREATE PAGE SUBMIT:",
			stateBasicForm,
			stateProjectAssessmentForm,
		);
		anketaCreate_basicInfoForm.api?.submit();
		anketaCreate_projectAssessmentForm.api?.submit();
	};

	useDeepEffect(() => {
		console.log("1 stateBasicForm:", stateBasicForm);
		console.log("2 calculationResult:", calculationResult);
		console.log("3 stateProjectAssessmentForm:", stateProjectAssessmentForm);

		if (!formHasErrors) {
			createCalculationMutation(
				{
					// @ts-ignore
					meta: stateBasicForm,
					calculation: stateProjectAssessmentForm,
				},
				{
					onSuccess: (data) => {
						console.log("Success:", data);
						toast.success("Расчет успешно создан");
						navigate(routes.home.rootPath);
					},
					onError: (error) => {
						toast.error("Ошибка при создании расчета", {
							description: "Проверьте подключение",
							action: {
								label: "Закрыть",
								onClick: () => {},
							},
						});
						console.log("Error:", error);
					},
				},
			);
		}
	}, [formHasErrors, stateBasicForm, stateProjectAssessmentForm]);

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
					onSubmit={onSubmit}
					formHasErrors={formHasErrors}
					data-test-id="anketa-create-page--AnketaBasicLayout-0"
				/>
			</Flex>
		</div>
	);
};
