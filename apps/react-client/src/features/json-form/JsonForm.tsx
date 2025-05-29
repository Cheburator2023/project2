import Container from "@mui/material/Container";
import { IChangeEvent } from "@rjsf/core";
import { RJSFSchema } from "@rjsf/utils";
import { useRef, useState } from "react";
import CustomForm from "./components/CustomForm/CustomForm";
import { customSchema } from "./utils/schemas";
import validator from "./utils/validator";

export const JsonForm = () => {
	const formRef = useRef(null);
	const [formState, setFormState] = useState<RJSFSchema | null>(
		customSchema.formData,
	);

	const onSubmit = (data: any, e: any) => {
		console.log("submitted data >>>", data);
	};

	const handleChange = ({ formData }: IChangeEvent<any, RJSFSchema, any>) => {
		// console.log('FORM onChange>>>', formData);
		setFormState(formData);
	};

	return (
		<Container>
			<h1>Анкета</h1>
			<CustomForm
				ref={formRef}
				validator={validator}
				schema={customSchema}
				formData={formState}
				onSubmit={onSubmit}
				onChange={handleChange}
				showErrorList={false}
				formContext={{
					...formRef,
					formState,
				}}
				noHtml5Validate
			/>
		</Container>
	);
};
