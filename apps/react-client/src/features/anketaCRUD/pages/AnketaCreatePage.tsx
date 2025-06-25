import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { AnketaBasicLayout } from "@react-client/features/anketaCRUD/organisms/AnketaBasicLayout";
import { useAnketaCRUDFormsStore } from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { useEffect } from "react";

export const AnketaCreatePage = () => {
	const { setApiRef, resetApiRef, ...store } = useAnketaCRUDFormsStore();

	const stateBasicForm = store.anketaCreate_basicInfoForm.state;

	const formHasErrors = !!(
		store.anketaCreate_basicInfoForm.api?.state.errors.length ||
		store.anketaCreate_projectAssessmentForm.api?.state.errors.length
	);

	const onSubmit = () => {
		console.log("!!! WHOLE PAGE SUBMIT:");

		store.anketaCreate_basicInfoForm.api?.submit();
		store.anketaCreate_projectAssessmentForm.api?.submit();
	};

	useEffect(() => {
		if (!formHasErrors) {
			// TODO: send data
			// navigate(routes.home.rootPath);
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
