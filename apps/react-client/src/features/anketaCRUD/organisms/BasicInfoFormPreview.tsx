import { CalculationResponseDto } from "@react-client/common/api/generated/types";
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { ListWidget } from "@react-client/common/forms/widgets/ListWidget";
import { MultiSelectAutocompleteCreateWidget } from "@react-client/common/forms/widgets/MultiSelectAutocompleteCreateWidget";
import { TextFieldCustomWidget } from "@react-client/common/forms/widgets/TextFieldCustomWidget";
import Form from "@rjsf/mui";
import type {
	RegistryWidgetsType,
	RJSFSchema,
	TemplatesType,
	UiSchema,
} from "@rjsf/utils";
import { omit } from "lodash-es";
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
		"ui:widget": "text",
		"ui:options": {
			tooltip: "Текстовое поле со свободным вводом, 150 символов.",
		},
	},
	rfd: {
		"ui:widget": "text",
		"ui:placeholder": "http://",
		"ui:options": {
			prefix: "RFD-",
			tooltip: "",
		},
	},
	streamExecutor: {
		"ui:widget": "text",
		"ui:options": {
			select: true,
			tooltip: "",
		},
	},
	department: {
		"ui:widget": "ListWidget",
		"ui:options": {
			addable: false,
			orderable: false,
			removable: false,
		},
	},
	customerName: {
		"ui:widget": "text",
		"ui:options": {
			tooltip: "",
		},
	},
	comment: {
		"ui:widget": "textarea",
		"ui:options": {
			multiline: true,
			rows: 3,
		},
	},
	createdAt: {
		type: "string",
		format: "date-time",
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
	ListWidget,
};

export const BasicInfoFormPreview = ({
	initialData,
}: {
	initialData?: CalculationResponseDto;
}) => {
	const formData = omit(initialData, ["questionnaireData"]);
	console.log("🐸 Pepe said >> formData:", formData);

	const schema: RJSFSchema = {
		type: "object",
		properties: {
			name: {
				type: "string",
				title: "Название анкеты",
			},
			rfd: {
				type: "string",
				title: "RFD",
			},
			streamExecutor: {
				type: "string",
				title: "Стрим-исполнитель",
			},
			department: {
				type: "array",
				title: "Департамент заказчика",
				items: {
					type: "string",
					default: "lorem ipsum",
				},
			},
			customerName: {
				type: "string",
				title: "ФИО заказчика",
			},
			comment: {
				type: "string",
				title: "Комментарий",
			},
			id: {
				type: "string",
				title: "ID",
			},
			author: {
				type: "string",
				title: "Автор",
			},
			createdAt: {
				type: "string",
				title: "Дата создания",
			},
		},
	};

	return (
		<Form
			schema={schema}
			uiSchema={uiSchema}
			formData={formData}
			validator={validatorRu}
			widgets={widgets}
			templates={templates}
			liveValidate={false}
			noHtml5Validate
			focusOnFirstError
			readonly
			noValidate
			showErrorList={false}
		/>
	);
};
