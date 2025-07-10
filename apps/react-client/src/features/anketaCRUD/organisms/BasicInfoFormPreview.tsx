import { CalculationResponseDto } from "@react-client/common/api/generated/types";
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { MultiSelectAutocompleteCreateWidget } from "@react-client/common/forms/widgets/MultiSelectAutocompleteCreateWidget";
import { TextFieldCustomWidget } from "@react-client/common/forms/widgets/TextFieldCustomWidget";
import { IBasicFormData } from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import type FormRef from "@rjsf/core";
import Form from "@rjsf/mui";
import type {
	RegistryWidgetsType,
	RJSFSchema,
	TemplatesType,
	UiSchema,
} from "@rjsf/utils";
import { omit } from "lodash-es";
import { useRef, useState } from "react";
import { MultiSelectAutocompleteWidget } from "../../../common/forms/widgets/MultiSelectAutocompleteWidget";
import { RJSFObjectFieldTemplate } from "../../../common/forms/widgets/RJSFObjectFieldTemplate";

const uiSchema: UiSchema = {
	"ui:submitButtonOptions": {
		norender: true,
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
	comment: {
		"ui:widget": "TextFieldCustomWidget",
		"ui:options": {
			multiline: true,
			rows: 3,
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

export const BasicInfoFormPreview = ({
	initialData,
}: {
	initialData?: CalculationResponseDto;
}) => {
	console.log("🐸 Pepe said >> initialData:", initialData);

	const [formData, setFormData] = useState<IBasicFormData>(
		omit(initialData, ["questionnaireData"]),
	);

	const schema: RJSFSchema = {
		type: "object",
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
				minLength: 8,
				maxLength: 19,
				pattern: "^(RFD-\\d{4,15})?$",
			},
			streamExecutor: {
				type: "string",
				title: "Стрим-исполнитель",
			},
			department: {
				type: "array",
				title: "Департамент заказчика",
				uniqueItems: true,
				minItems: 1,
			},
			customerName: {
				type: "string",
				title: "ФИО заказчика",
				maxLength: 150,
			},
			comment: {
				type: "string",
				title: "Комментарий",
				maxLength: 250,
			},
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
			createdAt: {
				type: "string",
				title: "Дата создания",
				format: "date",
				readOnly: true,
			},
		},
	};

	const formRef = useRef<FormRef>(null);
	const readonly = true;

	return (
		<Form
			ref={formRef}
			schema={schema}
			uiSchema={uiSchema}
			formData={formData}
			validator={validatorRu}
			widgets={widgets}
			templates={templates}
			liveValidate={false}
			noHtml5Validate
			focusOnFirstError
			readonly={readonly}
			noValidate
			showErrorList={false}
		/>
	);
};
