/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProbabilityInfluencePairDto } from "./ProbabilityInfluencePairDto";
export type GeneralUncertaintyDto = {
	/**
	 * Сложность бизнес-процессов
	 */
	businessProcessComplexity: ProbabilityInfluencePairDto;
	/**
	 * Дефекты проектного решения
	 */
	projectSolutionDefects: ProbabilityInfluencePairDto;
	/**
	 * Влияние смежных проектов
	 */
	adjacentProjectsImpact: ProbabilityInfluencePairDto;
	/**
	 * Пробелы в планировании требований
	 */
	planningRequirementGaps: ProbabilityInfluencePairDto;
	/**
	 * Проблемы с исполнением подрядчиками
	 */
	contractorPerformanceIssues: ProbabilityInfluencePairDto;
	/**
	 * Нехватка квалифицированного персонала
	 */
	qualifiedStaffShortage: ProbabilityInfluencePairDto;
	/**
	 * Риск санкций
	 */
	sanctionsRisk: ProbabilityInfluencePairDto;
	/**
	 * Пробелы в контрольных процедурах
	 */
	controlProceduresGaps: ProbabilityInfluencePairDto;
	/**
	 * Изменения в регулировании
	 */
	regulatoryChanges: ProbabilityInfluencePairDto;
	/**
	 * Недоиспользование системы
	 */
	systemUnderutilization: ProbabilityInfluencePairDto;
	/**
	 * Изменения IT-архитектуры
	 */
	itArchitectureChanges: ProbabilityInfluencePairDto;
};
