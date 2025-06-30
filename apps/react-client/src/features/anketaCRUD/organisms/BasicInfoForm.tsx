import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { useDeepEffect } from "@react-client/common/hooks/useDeepEffect";
import { MultiSelectAutocompleteCreateWidget } from "@react-client/features/anketaCRUD/molecules/MultiSelectAutocompleteCreateWidget";
import {
	AnketaCRUDFormNames,
	useAnketaCRUDFormsStore,
} from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import type FormRef from "@rjsf/core";
import type { IChangeEvent } from "@rjsf/core";
import Form from "@rjsf/mui";
import type { RJSFSchema, RegistryWidgetsType, UiSchema } from "@rjsf/utils";
import type { TemplatesType } from "@rjsf/utils";
import { useRef } from "react";
import { MultiSelectAutocompleteWidget } from "../molecules/MultiSelectAutocompleteWidget";
import { RJSFObjectFieldTemplate } from "../molecules/RJSFObjectFieldTemplate";

const templates: Partial<TemplatesType> = {
	ObjectFieldTemplate: RJSFObjectFieldTemplate,
};

interface FormData {
	calculationName: string;
	rfd?: string;
	streamExecutor: string;
	department: string;
	customerName?: string;
	comment?: string;
	relatedModels?: string[];
	status?: "Активна" | "Завершена";
	createdAt?: string;
	id?: string;
	author?: string;
}

const uiSchema: UiSchema = {
	"ui:submitButtonOptions": {
		props: {
			disabled: false,
			className: "btn btn-info",
		},
		norender: true,
		submitText: "Submit",
	},
	"ui:order": [
		"calculationName",
		"rfd",
		"streamExecutor",
		"department",
		"customerName",
		"relatedModels",
		"status",
		"createdAt",
		"id",
		"author",
		"comment",
	],
	comment: {
		"ui:widget": "textarea",
		"ui:options": {
			rows: 3,
		},
	},
	relatedModels: {
		"ui:widget": "MultiSelectAutocompleteCreateWidget",
	},
	status: {
		"ui:widget": "radio",
	},
	createdAt: {
		"ui:widget": "date",
	},
};

const widgets: RegistryWidgetsType = {
	MultiSelectAutocompleteWidget,
	MultiSelectAutocompleteCreateWidget,
};

const initialFormData: FormData = {
	calculationName: "",
	streamExecutor: "",
	department: "",
	id: "",
	author: "",
	relatedModels: [],
};

export const BasicInfoForm = ({ isCreate }: { isCreate?: boolean }) => {
	const schema: RJSFSchema = {
		type: "object",
		required: ["calculationName", "streamExecutor", "department"],
		properties: {
			calculationName: {
				type: "string",
				title: "Название расчета",
				minLength: 1,
			},
			rfd: {
				type: "string",
				title: "RFD",
			},
			streamExecutor: {
				type: "string",
				title: "Стрим-исполнитель",
				enum: [],
				minLength: 1,
			},
			department: {
				type: "string",
				title: "Департамент заказчика",
				enum: [],
				minLength: 1,
			},
			customerName: {
				type: "string",
				title: "ФИО заказчика",
			},
			relatedModels: {
				type: "array",
				title: "Связанные модели",
				items: {
					type: "string",
					enum: [],
				},
				uniqueItems: true,
			},
			comment: {
				type: "string",
				title: "Комментарий",
			},
			...(isCreate
				? {}
				: {
						id: {
							type: "string",
							title: "ID",
						},
						author: {
							type: "string",
							title: "Автор",
						},
						status: {
							type: "string",
							title: "Статус заявки",
							enum: ["Активна", "Завершена"],
						},
						createdAt: {
							type: "string",
							title: "Дата создания",
							format: "date",
						},
					}),
		},
	};

	const { setApiRef, resetApiRef, updateFormState, ...store } =
		useAnketaCRUDFormsStore();

	const formRef = useRef<FormRef>(null);
	const readonly = !isCreate;
	const formName = isCreate
		? AnketaCRUDFormNames.anketaCreate_basicInfoForm
		: AnketaCRUDFormNames.anketaPreview_basicInfoForm;

	const apiFormStore = store[formName].api;
	const formState = apiFormStore?.state;
	const formStateFromRef = formRef?.current?.state;

	// init api in store
	useDeepEffect(() => {
		if (formRef.current && !apiFormStore) {
			setApiRef(formName, formRef.current);
		}
	}, [formRef.current, isCreate]);

	// useEffect(() => {
	// 	return () => {
	// 		console.log("🐸 RESET:", formName);
	// 		resetApiRef(formName);
	// 	};
	// }, []);

	useDeepEffect(() => {
		updateFormState(formName, formState);
	}, [formState]);

	const onChange = (formState: any) => {
		if (formState) {
			updateFormState(formName, formState);
		}
	};

	const onSubmit = ({ formData }: IChangeEvent<FormData>) => {
		console.log("Form submitted:", formData);
		if (formStateFromRef) {
			updateFormState(formName, formStateFromRef);
		}
	};

	const onError = (errors: any) => {
		if (formStateFromRef) {
			updateFormState(formName, formStateFromRef);
		}
		console.log("Form errors:", errors);
	};

	const onBlur = (id: string, data: any) => {
		console.log("Form onBlur:", id, data);
		if (formStateFromRef) {
			updateFormState(formName, formStateFromRef);
		}
	};

	const onFocus = (id: string, data: any) => {
		console.log("Form onFocus:", id, data);
		if (formStateFromRef) {
			updateFormState(formName, formStateFromRef);
		}
	};

	return (
		<Form
			ref={formRef}
			schema={schema}
			uiSchema={uiSchema}
			formData={initialFormData}
			validator={validatorRu}
			widgets={widgets}
			onChange={onChange}
			onSubmit={onSubmit}
			onError={onError}
			onBlur={onBlur}
			onFocus={onFocus}
			templates={templates}
			// liveValidate={isCreate}
			noHtml5Validate
			focusOnFirstError
			readonly={readonly}
			showErrorList={false}
			data-test-id="basic-info-form--Form-0"
		/>
	);
};
