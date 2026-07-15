/**
 * F-03: глобальный справочник типовых работ (вариант A — отдельные таблицы БД).
 * Нормы, условия и коэффициенты — разрез (работа × стрим-исполнитель).
 * Формула и округление — конфигурация версии шаблона.
 */

export const V2_WORK_RULE_OPERATOR_VALUES = [
	"=",
	"!=",
	">=",
	"<=",
	">",
	"<",
	"in",
	"not_in",
] as const;

export type V2WorkRuleOperator = (typeof V2_WORK_RULE_OPERATOR_VALUES)[number];

export const V2_WORK_ROUNDING_MODE_VALUES = [
	"CEIL",
	"FLOOR",
	"ROUND",
	"NONE",
] as const;

export type V2WorkRoundingMode = (typeof V2_WORK_ROUNDING_MODE_VALUES)[number];

export const V2_WORK_TRIGGER_STATUS_VALUES = [
	"appears",
	"hidden",
	"no_triggers",
	"invalid",
] as const;

export type V2WorkTriggerStatus =
	(typeof V2_WORK_TRIGGER_STATUS_VALUES)[number];

export const V2_LOGIC_WORKSPACE_TAB_VALUES = [
	"works",
	"dependencies",
	"jsonlogic",
] as const;

export type V2LogicWorkspaceTab =
	(typeof V2_LOGIC_WORKSPACE_TAB_VALUES)[number];

export type V2WorkFormulaOperatorToken = "+" | "-" | "*" | "/";

export type V2WorkFormulaToken =
	| { kind: "norm" }
	| {
			kind: "param_coeff";
			paramCode: string;
			paramName?: string;
			/** F-03: ссылка на удалённый параметр трудоёмкости */
			invalid?: boolean;
	  }
	| {
			kind: "param_anyof";
			paramCode: string;
			paramName?: string;
			invalid?: boolean;
	  }
	| {
			kind: "work_ref";
			assignmentId: string;
			workName?: string;
			invalid?: boolean;
	  }
	| { kind: "number"; value: number }
	| { kind: "operator"; op: V2WorkFormulaOperatorToken }
	| { kind: "paren_open" }
	| { kind: "paren_close" };

export type V2TypicalWorkNormDto = {
	id: string;
	streamExecutor: string;
	normValue: number;
	validFrom: string;
	validTo: string | null;
};

export type V2TypicalWorkRuleValueDto = {
	code: string;
	label: string | null;
};

export type V2TypicalWorkRuleDto = {
	id: string;
	streamExecutor: string;
	schemaFieldUid?: string | null;
	paramCode: string;
	paramName: string | null;
	operator: V2WorkRuleOperator;
	valueCode: string | null;
	valueLabel: string | null;
	/** Множество значений для in / not_in (anyof). */
	values?: V2TypicalWorkRuleValueDto[];
	sortOrder?: number;
};

export type V2TypicalWorkLaborCoefficientDto = {
	id: string;
	streamExecutor: string;
	paramCode: string;
	paramName: string | null;
	valueCode: string | null;
	valueLabel: string | null;
	coefficient: number;
};

export type V2TypicalWorkLaborAnyOfDto = {
	valueCodes: string[];
	valueLabels: string[];
	coeffOn: number;
	coeffOff: number;
};

export type V2TypicalWorkLaborParamGroupDto = {
	schemaFieldUid?: string | null;
	paramCode: string;
	paramName: string | null;
	/** by_value — коэффициент на каждое значение; any_of — on/off по множеству. */
	kind?: "by_value" | "any_of";
	coefficients: V2TypicalWorkLaborCoefficientDto[];
	anyOf?: V2TypicalWorkLaborAnyOfDto | null;
};

export type V2TypicalWorkFormulaDto = {
	tokens: V2WorkFormulaToken[];
	text: string;
};

export type V2TypicalWorkRoundingDto = {
	mode: V2WorkRoundingMode;
	step: number | null;
};

export type V2TypicalWorkAssignmentStatusDto =
	| "unassigned"
	| "free"
	| "used_on_schemas";

export type V2TypicalWorkFormulaBadgeDto =
	| "none"
	| "multiplier"
	| "additive"
	| "mixed"
	| "transitive";

export type V2TypicalWorkListItemDto = {
	id: string;
	name: string;
	archComponentType: string;
	workType: string | null;
	triggerStatus: V2WorkTriggerStatus;
	assignmentStatus?: V2TypicalWorkAssignmentStatusDto;
	formulaBadge?: V2TypicalWorkFormulaBadgeDto;
	usedOnSchemasCount?: number;
	currentNorm: number | null;
	streams: string[];
	/** Схема-владелец работы (null — глобальная работа реестра). */
	templateId?: string | null;
	/** Имя схемы-владельца для отображения (null — глобальная). */
	templateName?: string | null;
	/** Действующая норма на сегодня по каждому назначенному стриму (ключ — streamExecutor в БД). */
	normsByStream?: Record<string, number | null>;
	/** Число параметров трудоёмкости по стриму (ключ — streamExecutor в БД). */
	laborParamCountByStream?: Record<string, number>;
};

export type V2TypicalWorkListResponseDto = {
	total: number;
	items: V2TypicalWorkListItemDto[];
	archComponentTypes: string[];
};

import type { V2JsonLogicValue } from "./v2-template.types";
import type { V2TypicalWorkFormulaTermsDto } from "./v2-typical-work-v4.types";

export type V2TypicalWorkCatalogItemDto = {
	id: string;
	name: string;
	archComponentType: string;
	workType: string | null;
	streams: string[];
	assignmentCount: number;
};

export type V2TypicalWorkCatalogListResponseDto = {
	total: number;
	items: V2TypicalWorkCatalogItemDto[];
};

export type V2TypicalWorkAssignmentListItemDto = {
	id: string;
	workId: string;
	workName: string;
	archComponentType: string;
	streamExecutor: string;
	isActive: boolean;
	formulaBadge?: V2TypicalWorkFormulaBadgeDto;
	triggerStatus?: V2WorkTriggerStatus;
};

export type V2TypicalWorkAssignmentListResponseDto = {
	total: number;
	items: V2TypicalWorkAssignmentListItemDto[];
};

export type V2TypicalWorkStoredCalculationLogicDto = {
	version: 1;
	result: V2JsonLogicValue;
};

export type V2TypicalWorkCardDto = {
	id: string;
	name: string;
	archComponentType: string;
	workType: string | null;
	streamExecutor: string;
	assignmentId?: string | null;
	assignmentStatus?: V2TypicalWorkAssignmentStatusDto;
	formulaBadge?: V2TypicalWorkFormulaBadgeDto;
	usedOnSchemasCount?: number;
	triggerStatus: V2WorkTriggerStatus;
	norms: V2TypicalWorkNormDto[];
	rules: V2TypicalWorkRuleDto[];
	laborParams: V2TypicalWorkLaborParamGroupDto[];
	formula: V2TypicalWorkFormulaDto;
	formulaTerms?: V2TypicalWorkFormulaTermsDto;
	rounding: V2TypicalWorkRoundingDto;
	/** Скомпилированная JsonLogic-формула (result); include собирается из rules при расчёте. */
	calculationLogic?: V2TypicalWorkStoredCalculationLogicDto | null;
};

export type V2TypicalWorkPreviewRequestDto = {
	streamExecutor: string;
	atDate?: string;
	answers?: Record<string, string>;
};

export type V2TypicalWorkPreviewResponseDto = {
	formulaSymbolic: string;
	formulaExpanded: string;
	result: number | null;
	error: string | null;
	triggerStatus?: V2WorkTriggerStatus;
};

export type V2TypicalWorkNormInputDto = {
	id?: string;
	normValue: number;
	validFrom: string;
	validTo?: string | null;
};

export type V2TypicalWorkRuleInputDto = {
	id?: string;
	schemaFieldUid?: string | null;
	paramCode: string;
	paramName?: string | null;
	operator: V2WorkRuleOperator;
	valueCode?: string | null;
	valueLabel?: string | null;
	values?: V2TypicalWorkRuleValueDto[];
	sortOrder?: number;
};

export type V2TypicalWorkLaborCoefficientInputDto = {
	id?: string;
	paramCode: string;
	paramName?: string | null;
	valueCode?: string | null;
	valueLabel?: string | null;
	coefficient: number;
};

export type V2TypicalWorkLaborParamInputDto = {
	schemaFieldUid?: string | null;
	paramCode: string;
	paramName?: string | null;
	kind?: "by_value" | "any_of";
	coefficients?: V2TypicalWorkLaborCoefficientInputDto[];
	anyOf?: V2TypicalWorkLaborAnyOfDto | null;
};

export type PatchV2TypicalWorkRequestDto = {
	streamExecutor: string;
	templateVersionId?: string;
	/** Привязать работу к схеме (только если ещё не привязана к другой). */
	templateId?: string | null;
	name?: string;
	archComponentType?: string;
	norms?: V2TypicalWorkNormInputDto[];
	rules?: V2TypicalWorkRuleInputDto[];
	laborCoefficients?: V2TypicalWorkLaborCoefficientInputDto[];
	laborParams?: V2TypicalWorkLaborParamInputDto[];
	formula?: V2TypicalWorkFormulaDto;
	formulaTerms?: V2TypicalWorkFormulaTermsDto;
	rounding?: V2TypicalWorkRoundingDto;
};

export type CreateV2TypicalWorkRequestDto = {
	name: string;
	archComponentType: string;
	workType?: string | null;
	/** Схема-владелец работы (обязательна при создании из конструктора). */
	templateId?: string | null;
	/** v4: стрим первого назначения (обязателен при создании из области). */
	streamExecutor?: string;
	/** v4: стартовая норма первого назначения, чел.-дн. */
	starterNormValue?: number;
};

export type CreateV2TypicalWorkAssignmentRequestDto = {
	workId: string;
	streamExecutor: string;
};

export type CopyV2TypicalWorkRequestDto = {
	/** Схема-владелец копии (null — глобальная работа). */
	templateId?: string | null;
	/** Стрим-исполнитель, на который назначить копию. */
	streamExecutor?: string | null;
	/** Имя копии; по умолчанию «<имя оригинала> (копия)». */
	name?: string | null;
};

export type V2TypicalWorkAssignmentDto = {
	id: string;
	workId: string;
	archComponentType: string;
	streamExecutor: string;
	isActive: boolean;
};

export type V2TypicalWorkFieldErrorDto = {
	path: string;
	message: string;
};

export type V2TypicalWorkQuestionnaireUsageDto = {
	questionnaireId: string;
	calcName: string;
	version: string;
};

export type V2DeleteTypicalWorkConflictDto = {
	code: "WORK_IN_USE";
	usedInQuestionnaireVersions: V2TypicalWorkQuestionnaireUsageDto[];
};

export type BulkDeleteV2TypicalWorksRequestDto = {
	ids: string[];
	confirm?: boolean;
};

export type BulkDeleteV2TypicalWorkConflictDto = {
	workId: string;
	usedInQuestionnaireVersions: V2TypicalWorkQuestionnaireUsageDto[];
};

export type BulkDeleteV2TypicalWorkFailureDto = {
	id: string;
	reason: "not_found" | "delete_failed";
	message: string;
};

export type BulkDeleteV2TypicalWorksResultDto = {
	deletedIds: string[];
	conflicts: BulkDeleteV2TypicalWorkConflictDto[];
	failed: BulkDeleteV2TypicalWorkFailureDto[];
};

export type V2TypicalWorkParameterValueDto = {
	id: string;
	code: string;
	label: string;
	coefficient: number | null;
	sortOrder: number;
	validFrom: string;
	validTo: string | null;
};

export type V2TypicalWorkParameterDto = {
	id: string;
	schemaFieldUid?: string;
	schemaPointer?: string;
	code: string;
	name: string;
	description: string | null;
	/** Альтернативные ключи поля в данных анкеты (дубликаты title в схеме). */
	sourceKeys?: string[];
	/** Привязка к словарнику в uiSchema (значения подгружаются асинхронно). */
	dictionaryCode?: string;
	/** true, если все значения параметра — числа (отображается как числовая шкала, доступны операторы >, <, ≥, ≤) */
	numeric?: boolean;
	values: V2TypicalWorkParameterValueDto[];
};

export type V2TypicalWorkParameterListResponseDto = {
	items: V2TypicalWorkParameterDto[];
};

export type CreateV2TypicalWorkParameterRequestDto = {
	code?: string | null;
	name: string;
	description?: string | null;
};

export type UpdateV2TypicalWorkParameterRequestDto = {
	code?: string;
	name?: string;
	description?: string | null;
};

export type CreateV2TypicalWorkParameterValueRequestDto = {
	code?: string | null;
	label: string;
	coefficient?: number | null;
	sortOrder?: number | null;
	validFrom: string;
	validTo?: string | null;
};

export type UpdateV2TypicalWorkParameterValueRequestDto = {
	code?: string;
	label?: string;
	coefficient?: number | null;
	sortOrder?: number | null;
	validFrom?: string;
	validTo?: string | null;
};

export type V2ParameterDependencyDto = {
	paramCode: string;
	paramName: string;
	dependsOnParamCode: string | null;
	dependsOnParamName: string | null;
	description: string | null;
};

export type V2ParameterDependencyListResponseDto = {
	items: V2ParameterDependencyDto[];
};

/** Норма, действующая на дату (для дерева и превью). */
export function resolveActiveNormOnDate(
	norms: Pick<
		V2TypicalWorkNormDto,
		"streamExecutor" | "normValue" | "validFrom" | "validTo"
	>[],
	streamExecutor: string,
	atDate: string,
): number | null {
	const day = atDate.slice(0, 10);
	const matching = norms.filter((n) => {
		if (n.streamExecutor !== streamExecutor) return false;
		const from = n.validFrom.slice(0, 10);
		const to = n.validTo?.slice(0, 10) ?? null;
		if (day < from) return false;
		if (to && day > to) return false;
		return true;
	});
	if (matching.length === 0) return null;
	return matching[0]?.normValue ?? null;
}

export function defaultWorkFormula(): V2TypicalWorkFormulaDto {
	return { tokens: [{ kind: "norm" }], text: "N" };
}

export function defaultWorkRounding(): V2TypicalWorkRoundingDto {
	return { mode: "CEIL", step: 0.1 };
}
