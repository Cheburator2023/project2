import type {
	V2JsonSchemaDto,
	V2LogicGraphDto,
	V2UiSchemaDto,
} from "@smart-anketa/api-contract";

/**
 * Заводская схема V2 — каркас базовой анкеты по мотивам блока «Основная информация» (v1).
 * Хранится на бэкенде и используется при сбросе шаблона к умолчанию.
 */
export const V2_DEFAULT_TEMPLATE_SNAPSHOT = {
	jsonSchema: {
		type: "object",
		title: "Базовая анкета",
		required: ["calcName", "streamExecutor", "department"],
		properties: {
			calcName: {
				type: "string",
				title: "Название анкеты",
				minLength: 1,
				maxLength: 150,
			},
			rfd: {
				type: "string",
				title: "RFD",
				maxLength: 64,
			},
			streamExecutor: {
				type: "string",
				title: "Стрим-исполнитель",
				minLength: 1,
				maxLength: 120,
			},
			department: {
				type: "array",
				title: "Департамент заказчика",
				items: { type: "string", maxLength: 120 },
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
			author: {
				type: "string",
				title: "Автор",
				maxLength: 250,
			},
			createdAt: {
				type: "string",
				title: "Дата создания",
				format: "date-time",
			},
		},
	} satisfies V2JsonSchemaDto,

	uiSchema: {
		"ui:order": [
			"calcName",
			"rfd",
			"streamExecutor",
			"department",
			"customerName",
			"comment",
			"author",
			"createdAt",
		],
		comment: {
			"ui:widget": "textarea",
			"ui:options": { rows: 4 },
		},
		createdAt: {
			"ui:widget": "hidden",
		},
	} satisfies V2UiSchemaDto,

	logic: {
		rules: [
			{
				id: "default-v2-hint-comment",
				kind: "hint",
				targetPath: "/comment",
				dependencies: [],
				condition: true,
				payload: {
					text: "Подсказка из заводской схемы: сначала заполните название, стрим и департамент.",
				},
				description: "Демонстрационное правило подсказки",
			},
		],
	} satisfies V2LogicGraphDto,

	releaseNotes:
		"Заводская схема V2 (каркас базовой анкеты, по мотивам блока основной информации v1)",
} as const;
