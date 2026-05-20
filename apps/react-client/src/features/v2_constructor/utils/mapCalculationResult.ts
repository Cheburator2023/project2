import type {
	V2CalculationItemDto,
	V2CalculationResultDto,
	V2TaskTriggerItemDto,
} from "@smart-anketa/api-contract";
import type { CalculationItem, TaskTriggerItem } from "./calculationEngine";
import type { LogicValidationIssue } from "./logicValidation";
import type { V2LegacyStageEvaluationDto } from "@smart-anketa/api-contract";

/** API DTO совместимы с UI-типами панели калькуляции. */
export function mapCalculationItems(
	items: V2CalculationItemDto[],
): CalculationItem[] {
	return items as CalculationItem[];
}

export function mapTaskTriggers(
	items: V2TaskTriggerItemDto[],
): TaskTriggerItem[] {
	return items as TaskTriggerItem[];
}

export function mapCalculationResult(result: V2CalculationResultDto): {
	calculationItems: CalculationItem[];
	taskTriggerItems: TaskTriggerItem[];
	liveFormData: Record<string, unknown>;
	validationIssues: LogicValidationIssue[];
	legacyStageEvaluation: V2LegacyStageEvaluationDto | null;
} {
	return {
		calculationItems: mapCalculationItems(result.items),
		taskTriggerItems: mapTaskTriggers(result.taskTriggers),
		liveFormData: result.formData,
		validationIssues: result.validationIssues ?? [],
		legacyStageEvaluation: result.legacyStageEvaluation ?? null,
	};
}
