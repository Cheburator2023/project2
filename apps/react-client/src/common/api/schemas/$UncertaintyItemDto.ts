/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $UncertaintyItemDto = {
	properties: {
		type: {
			type: "string",
			description: `Тип фактора неопределенности`,
			isRequired: true,
		},
		probability: {
			type: "string",
			description: `Вероятность возникновения риска`,
			isRequired: true,
		},
		influence: {
			type: "string",
			description: `Влияние риска на проект`,
			isRequired: true,
		},
	},
} as const;
