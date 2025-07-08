import { useQuestionnaireControllerGetFullQuestionnaire } from "@react-client/common/api/generated/queries/calculation";
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { MultiSelectAutocompleteCreateWidget } from "@react-client/common/forms/widgets/MultiSelectAutocompleteCreateWidget";
import { TextFieldCustomWidget } from "@react-client/common/forms/widgets/TextFieldCustomWidget";
import { useDeepEffect } from "@react-client/common/hooks/useDeepEffect";
import {
	AnketaCRUDFormNames,
	basicInfoFormInitialData,
	IBasicFormData,
	useAnketaCRUDFormsStore,
} from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import type FormRef from "@rjsf/core";
import type { IChangeEvent } from "@rjsf/core";
import Form from "@rjsf/mui";
import type {
	RegistryWidgetsType,
	RJSFSchema,
	TemplatesType,
	UiSchema,
} from "@rjsf/utils";
import { useRef, useState } from "react";
import { MultiSelectAutocompleteWidget } from "../../../common/forms/widgets/MultiSelectAutocompleteWidget";
import { RJSFObjectFieldTemplate } from "../../../common/forms/widgets/RJSFObjectFieldTemplate";

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
		"name",
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
	name: {
		"ui:widget": "TextFieldCustomWidget",
		"ui:options": {
			tooltip: "Текстовое поле со свободным вводом, 150 символов.",
		},
	},
	rfd: {
		"ui:widget": "TextFieldCustomWidget",
		"ui:options": {
			prefix: "RFD-",
			tooltip: "",
		},
	},
	streamExecutor: {
		"ui:widget": "TextFieldCustomWidget",
		"ui:options": {
			select: true,
			tooltip: "",
		},
	},
	department: {
		"ui:widget": "MultiSelectAutocompleteWidget",
		"ui:options": {
			tooltip: "",
		},
	},
	customerName: {
		"ui:widget": "TextFieldCustomWidget",
		"ui:options": {
			tooltip: "",
		},
	},
	// relatedModels: {
	// 	"ui:widget": "MultiSelectAutocompleteCreateWidget",
	// 	"ui:options": {
	// 		tooltip: "",
	// 	},
	// },
	comment: {
		"ui:widget": "TextFieldCustomWidget",
		"ui:options": {
			multiline: true,
			rows: 3,
		},
	},
	status: {
		"ui:widget": "radio",
		"ui:options": {
			tooltip: "",
		},
	},
	createdAt: {
		"ui:widget": "date",
		"ui:options": {
			tooltip: "",
		},
	},
	id: {
		"ui:options": {
			tooltip: "",
		},
	},
	author: {
		"ui:options": {
			tooltip: "",
		},
	},
};

const templates: Partial<TemplatesType> = {
	ObjectFieldTemplate: RJSFObjectFieldTemplate,
	// FieldTemplate: RJSFFieldTemplate,
};

const widgets: RegistryWidgetsType = {
	MultiSelectAutocompleteWidget,
	MultiSelectAutocompleteCreateWidget,
	TextFieldCustomWidget,
};

export const BasicInfoForm = ({ isCreate }: { isCreate?: boolean }) => {
	const { data: questData } = useQuestionnaireControllerGetFullQuestionnaire();
	const [formData, setFormData] = useState<IBasicFormData>(
		basicInfoFormInitialData,
	);

	const dictionaries = questData?.dictionaries;

	console.log("🐸 Pepe said >> BasicInfoForm >> dictionaries:", dictionaries);

	const schema: RJSFSchema = {
		type: "object",
		required: ["name", "rfd", "streamExecutor", "department"],
		properties: {
			name: {
				type: "string",
				title: "Название анкеты",
				minLength: 1,
				maxLength: 150,
			},
			rfd: {
				type: "string",
				title: "RFD",
				// minLength: 8,
				// maxLength: 19,
				pattern: "^(RFD-\\d{4,15})?$",
			},
			streamExecutor: {
				type: "string",
				title: "Стрим-исполнитель",
				enum: ["Стрим 1", "Стрим 2", "Стрим 3", "Стрим 4", "Стрим 5"],
				minLength: 1,
			},
			department: {
				type: "array",
				title: "Департамент заказчика",
				items: {
					type: "string",
					enum: [
						"Департамент разработки",
						"Департамент аналитики",
						"Департамент тестирования",
						"Департамент продаж",
						"Департамент маркетинга",
					],
				},
				uniqueItems: true,
				minItems: 1,
			},
			customerName: {
				type: "string",
				title: "ФИО заказчика",
				maxLength: 150,
			},
			// relatedModels: {
			// 	type: "array",
			// 	title: "Связанные модели",
			// 	items: {
			// 		type: "string",
			// 	},
			// 	uniqueItems: true,
			// 	maxItems: 99,
			// },
			comment: {
				type: "string",
				title: "Комментарий",
				maxLength: 250,
			},
			...(isCreate
				? {}
				: {
						id: {
							type: "string",
							title: "ID",
							readOnly: true,
						},
						author: {
							type: "string",
							title: "Автор",
							readOnly: true,
						},
						status: {
							type: "string",
							title: "Статус заявки",
							enum: ["Активна", "Завершена"],
							readOnly: true,
						},
						createdAt: {
							type: "string",
							title: "Дата создания",
							format: "date",
							readOnly: true,
						},
					}),
		},
	};

	const { setApiRef, updateFormState, setFormDirty, ...store } =
		useAnketaCRUDFormsStore();
	const [liveValidate, setLiveValidate] = useState(false);

	const formRef = useRef<FormRef>(null);
	const readonly = !isCreate;

	const formName = isCreate
		? AnketaCRUDFormNames.anketaCreate_basicInfoForm
		: AnketaCRUDFormNames.anketaPreview_basicInfoForm;
	const formDataStore = store[formName];
	const apiFormStore = formDataStore.api;
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

	const onChange = (formState: IChangeEvent<IBasicFormData>) => {
		if (formState.formData) {
			setFormData(formState.formData);
		}
		if (formState) {
			setFormDirty(formName, true);
			updateFormState(formName, formState);
		}
	};

	const onSubmit = ({ formData }: IChangeEvent<IBasicFormData>) => {
		console.log("🐸 BasicInfoForm >> formData:", formData);

		if (formData) {
			setFormData(formData);
		}

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
		setLiveValidate(true);

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
			formData={formData}
			validator={validatorRu}
			widgets={widgets}
			onChange={onChange}
			onSubmit={onSubmit}
			onError={onError}
			onBlur={onBlur}
			onFocus={onFocus}
			templates={templates}
			liveValidate={liveValidate}
			noHtml5Validate
			focusOnFirstError
			readonly={readonly}
			showErrorList={false}
			data-test-id="basic-info-form--Form-0"
		/>
	);
};
