import type FormRef from "@rjsf/core";
import Form from "@rjsf/mui";
import { RJSFSchema, RegistryWidgetsType, UiSchema } from "@rjsf/utils";

import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { IChangeEvent } from "@rjsf/core";
import { TemplatesType } from "@rjsf/utils";
import { createRef } from "react";
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
			enum: ["Стрим 1", "Стрим 2", "Стрим 3"],
			minLength: 1,
		},
		department: {
			type: "string",
			title: "Департамент заказчика",
			enum: ["Департамент A", "Департамент B", "Департамент C"],
			minLength: 1,
		},
		customerName: {
			type: "string",
			title: "ФИО заказчика",
		},
		comment: {
			type: "string",
			title: "Комментарий",
		},
		relatedModels: {
			type: "array",
			title: "Связанные модели",
			items: {
				type: "string",
				enum: ["model666", "model777", "model888"],
			},
			uniqueItems: true,
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
		id: {
			type: "string",
			title: "ID",
		},
		author: {
			type: "string",
			title: "Автор",
		},
	},
};

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
		"comment",
		"relatedModels",
		"status",
		"createdAt",
		"id",
		"author",
	],
	comment: {
		"ui:widget": "textarea",
		"ui:options": {
			rows: 3,
		},
	},
	relatedModels: {
		"ui:widget": "MultiSelectAutocomplete",
	},
	status: {
		"ui:widget": "radio",
	},
	createdAt: {
		"ui:widget": "date",
	},
};

const widgets: RegistryWidgetsType = {
	MultiSelectAutocomplete: MultiSelectAutocompleteWidget,
};

const initialFormData: FormData = {
	calculationName: "",
	streamExecutor: "Стрим 1",
	department: "Департамент A",
	id: "auto-generated-uuid-12345",
	author: "Текущий Пользователь",
	status: "Активна",
	createdAt: new Date().toISOString().substring(0, 10),
	relatedModels: ["model777"],
};

export const BasicInfoForm = ({ isCreate }: { isCreate?: boolean }) => {
	const formRef = createRef<FormRef>();

	const onSubmit = ({ formData }: IChangeEvent<FormData>) => {
		console.log("Form submitted:", formData);
		// formRef.current?.submit();
		alert(`Форма отправлена! Название: ${formData?.calculationName}`);
	};

	const onError = (errors: any) => {
		console.log("Form errors:", errors);
	};

	const readonly = !isCreate;
	console.log("🐸 Pepe said ~ BasicInfoForm ~ readonly:", readonly);

	return (
		<Form
			ref={formRef}
			schema={schema}
			uiSchema={uiSchema}
			formData={initialFormData}
			validator={validatorRu}
			widgets={widgets}
			onSubmit={onSubmit}
			onError={onError}
			templates={templates}
			liveValidate={isCreate}
			readonly={readonly}
			showErrorList={false}
		/>
	);
};
