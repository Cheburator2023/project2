import { FormProps } from "@rjsf/core";
import MuiForm from "@rjsf/mui";
import fields from "../../utils/fieldsRegistration";
import { uiSchema } from "../../utils/schemas";
// import ObjectFieldTemplate from '@Ui/templates/ObjectFieldTemplate/ObjectFieldTemplate';
// import CustomFieldTemplate from '@Ui/templates/CustomFieldTemplate/CustomFieldTemplate';

const CustomForm = ({
	schema,
	onSubmit,
	onChange,
	formData,
	showErrorList,
	customValidate,
	formContext,
	ref,
	...rest
}: FormProps) => {
	return (
		<MuiForm
			{...rest}
			ref={ref}
			schema={schema}
			uiSchema={uiSchema}
			onSubmit={onSubmit}
			onChange={onChange}
			fields={fields}
			// templates={{
			// ObjectFieldTemplate,
			// FieldTemplate: CustomFieldTemplate,
			// }}
			formData={formData}
			showErrorList={showErrorList}
			formContext={formContext}
		/>
	);
};

export default CustomForm;
