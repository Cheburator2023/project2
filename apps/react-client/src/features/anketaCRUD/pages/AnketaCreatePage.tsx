import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { AnketaBasicLayout } from "@react-client/features/anketaCRUD/organisms/AnketaBasicLayout";
import { useAnketaCRUDFormsStore } from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { useEffect } from "react";

export const AnketaCreatePage = () => {
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

	const formHasErrors = !!(
		anketaCreate_basicInfoForm.api?.state.errors.length ||
		anketaCreate_projectAssessmentForm.api?.state.errors.length
	);

	const onSubmit = () => {
		console.log("WHOLE CREATE PAGE SUBMIT:");

		anketaCreate_basicInfoForm.api?.submit();
		anketaCreate_projectAssessmentForm.api?.submit();
	};

	useEffect(() => {
		console.log("1 stateBasicForm:", stateBasicForm);
		console.log("2 calculationResult:", calculationResult);
		console.log("3 stateProjectAssessmentForm:", stateProjectAssessmentForm);

		if (!formHasErrors) {
			// TODO: send data
			// navigate(routes.home.rootPath); onSuccess
		}
	}, [formHasErrors]);

	return (
		<div>
			<Spacer height={6} />
			<Header />
			<Spacer height={12} />
			<Flex width="100%" height="-webkit-fill-available">
				<AnketaBasicLayout
					isCreate
					onSubmit={onSubmit}
					formHasErrors={formHasErrors}
				/>
			</Flex>
		</div>
	);
};
