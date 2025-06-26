/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Calculation = {
	properties: {
		id: {
			type: "string",
			description: `Уникальный идентификатор расчета`,
			isRequired: true,
		},
		name: {
			type: "string",
			description: `Название расчета`,
			isRequired: true,
		},
		questionnaireData: {
			type: "dictionary",
			contains: {
				properties: {},
			},
			isRequired: true,
		},
		finalCoefficient: {
			type: "number",
			description: `Финальный коэффициент расчета`,
			isRequired: true,
		},
		createdAt: {
			type: "string",
			description: `Дата создания`,
			isRequired: true,
			format: "date-time",
		},
	},
} as const;
