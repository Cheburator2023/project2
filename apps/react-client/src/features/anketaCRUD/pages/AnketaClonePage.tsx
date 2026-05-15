import { IconButton } from "@mui/material";
import { CreateCloneDto } from "@react-client/common/api/types/createCloneDto";
import { Flex } from "@react-client/common/primitives/Flex";
import { toast } from "@react-client/common/toasts";
import { useCalculationControllerCreateClone } from "@react-client/common/api/queries/calculation";
import { useAnketaCRUDFormsStore } from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { AnketaBasicLayoutCreate } from "@react-client/features/anketaCRUD/templates/AnketaBasicLayoutCreate";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import SaveIcon from "@mui/icons-material/Save";
import { useParentCalculationData } from "../hooks/useParentCalculationData";
import { useDeepEffect } from "@react-client/common/hooks/useDeepEffect";
import {routes} from "@react-client/version/v1/routing/routes";

export const AnketaClonePage = () => {
	const navigate = useNavigate();
	const { id } = useParams<{ id: string }>();
	const store = useAnketaCRUDFormsStore();

	const {
		reset,
		calculationResult,
		anketaCreate_basicInfoForm,
		anketaCreate_projectAssessmentForm,
		updateFormState,
	} = store;

	const stateBasicForm = anketaCreate_basicInfoForm.state;
	const stateProjectAssessmentForm = anketaCreate_projectAssessmentForm.state;

	const {
		parentData,
		isLoading: isLoadingParent,
		hasError: hasParentError,
		mapToAssessmentForm,
	} = useParentCalculationData(id);

	const { mutate: cloneCalculationMutation, isPending } =
		useCalculationControllerCreateClone();

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
		} = stateBasicForm?.formData || {};

		if (isFormValid && id) {
			const data: CreateCloneDto = {
				calcName: basicFormData.calcName || "",
				rfd: basicFormData.rfd || "",
				streamExecutor: basicFormData.streamExecutor || "",
				department: basicFormData.department || [],
				customerName: basicFormData.customerName || "",
				comment: basicFormData.comment || "",
				questionnaireData: stateProjectAssessmentForm?.formData || {},
				finalCoefficient: calculationResult[0]?.score,
				calculationResult: calculationResult,
			};

			cloneCalculationMutation(
				{
					id: id!,
					data,
				},
				{
					onSuccess: (_data) => {
						toast.success("Анкета успешно создана");
						reset();
						setTimeout(() => {
							navigate(routes.home.rootPath);
						}, 100);
					},
					onError: (error: any) => {
						toast.error("Ошибка создания анкеты", {
							description: error?.response?.data?.message,
							action: {
								label: "",
								onClick: () => {},
							},
						});
					},
				},
			);
		}
	}, [isFormValid, submitCount, formHasErrors]);

	useDeepEffect(() => {
		if (parentData && mapToAssessmentForm) {
			if (anketaCreate_projectAssessmentForm.api) {
				anketaCreate_projectAssessmentForm.api.setState({
					...anketaCreate_projectAssessmentForm.api.state,
					formData: mapToAssessmentForm,
				});
				updateFormState(
					"anketaCreate_projectAssessmentForm",
					anketaCreate_projectAssessmentForm.api.state,
				);
			}
		}
	}, [
		parentData,
		mapToAssessmentForm,
		anketaCreate_projectAssessmentForm.api,
		updateFormState,
	]);

	useEffect(() => {
		return () => {
			reset();
		};
	}, []);

	return (
		<div data-test-id="anketa-clone-page--div-0">
			<Header
				calcId={parentData?.readableId || ""}
				data-test-id="anketa-clone-page--Header-0"
			>
				<IconButton
					onClick={onSubmit}
					title="Использовать анкету как шаблон"
					loading={isPending}
					disabled={!!hasParentError || isLoadingParent || isPending}
				>
					<SaveIcon />
				</IconButton>
			</Header>
			<Flex
				width="100%"
				height="-webkit-fill-available"
				data-test-id="anketa-clone-page--Flex-0"
			>
				<AnketaBasicLayoutCreate
					isPending={isPending || isLoadingParent}
					isClone
					data-test-id="anketa-clone-page--AnketaBasicLayout-0"
				/>
			</Flex>
		</div>
	);
};
