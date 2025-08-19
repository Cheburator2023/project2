import { Chip, IconButton } from "@mui/material";
import { CreateNewVersionDto } from "@react-client/common/api/types/createNewVersionDto";
import { Flex } from "@react-client/common/primitives/Flex";
import { toast } from "@react-client/common/toasts";
import { useCalculationControllerCreateNewVersion } from "@react-client/common/api/hooks/useCalculationVersions";
import { useAnketaCRUDFormsStore } from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { AnketaBasicLayoutCreate } from "@react-client/features/anketaCRUD/templates/AnketaBasicLayoutCreate";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { routes } from "@react-client/routing/routes";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import SaveIcon from "@mui/icons-material/Save";
import { useParentCalculationData } from "../hooks/useParentCalculationData";
import { useDeepEffect } from "@react-client/common/hooks/useDeepEffect";

export const AnketaNewVersionPage = () => {
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
		mapToBasicForm,
		mapToAssessmentForm,
	} = useParentCalculationData(id);

	const { mutate: createNewVersionMutation, isPending } =
		useCalculationControllerCreateNewVersion();

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

	useDeepEffect(() => {
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
			const data: CreateNewVersionDto = {
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

			createNewVersionMutation(
				{
					id: id!,
					data,
				},
				{
					onSuccess: (_data) => {
						toast.success("Новая версия анкеты успешно создана");
						reset();
						setTimeout(() => {
							navigate(routes.home.rootPath);
						}, 100);
					},
					onError: (error: any) => {
						toast.error("Ошибка создания новой версии анкеты", {
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
		if (parentData && mapToBasicForm && mapToAssessmentForm) {
			if (anketaCreate_basicInfoForm.api) {
				anketaCreate_basicInfoForm.api.setState({
					...anketaCreate_basicInfoForm.api.state,
					formData: mapToBasicForm,
				});
				updateFormState(
					"anketaCreate_basicInfoForm",
					anketaCreate_basicInfoForm.api.state,
				);
			}
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
		mapToBasicForm,
		mapToAssessmentForm,
		anketaCreate_basicInfoForm.api,
		anketaCreate_projectAssessmentForm.api,
		updateFormState,
	]);

	useEffect(() => {
		return () => {
			reset();
		};
	}, []);

	return (
		<div data-test-id="anketa-new-version-page--div-0">
			<Header
				calcId={parentData?.readableId || ""}
				data-test-id="anketa-new-version-page--Header-0"
			>
				{!isLoadingParent && (
					<Chip
						label={`v ${parentData?.seriesLatestVersion || "1"} -> v ${
							Number(parentData?.seriesLatestVersion || "1") + 1
						}`}
						color="warning"
						variant="outlined"
						size="small"
					/>
				)}
				<IconButton
					onClick={onSubmit}
					title="Создать новую версию"
					loading={isPending}
					// disabled={!!hasParentError || isLoadingParent || isPending}
				>
					<SaveIcon />
				</IconButton>
			</Header>
			<Flex
				width="100%"
				height="-webkit-fill-available"
				data-test-id="anketa-new-version-page--Flex-0"
			>
				<AnketaBasicLayoutCreate
					isPending={isPending || isLoadingParent}
					isVersionUpdate
					data-test-id="anketa-new-version-page--AnketaBasicLayout-0"
				/>
			</Flex>
		</div>
	);
};
