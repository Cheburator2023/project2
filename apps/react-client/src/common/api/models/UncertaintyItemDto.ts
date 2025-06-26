/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UncertaintyItemDto = {
	/**
	 * Тип фактора неопределенности
	 */
	type:
		| "businessProcessComplexity"
		| "projectSolutionDefects"
		| "adjacentProjectsImpact"
		| "planningRequirementGaps"
		| "contractorPerformanceIssues"
		| "qualifiedStaffShortage"
		| "sanctionsRisk"
		| "controlProceduresGaps"
		| "regulatoryChanges"
		| "systemUnderutilization"
		| "itArchitectureChanges";
	/**
	 * Вероятность возникновения риска
	 */
	probability:
		| "Не применимо"
		| "Реализация не чаще 1 раза в 10 лет"
		| "Реализация 1 раз в 3-10 лет"
		| "Реализация 1 раз в 1-3 года"
		| "Реализация 1 раз в год"
		| "Реализация 1 раз в 6 мес. или чаще";
	/**
	 * Влияние риска на проект
	 */
	influence: "Незначительное" | "Существенное" | "Критичное";
};
