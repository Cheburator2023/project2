import type { V2TypicalWorkCardDto, V2TypicalWorkParameterDto } from "@smart-anketa/api-contract";
import type { TriggerPreviewState } from "@smart-anketa/api-contract";
import { useMemo } from "react";
import { useSchemaEditor } from "../../SchemaEditorContext";
import { buildSchemaWorkParameters } from "./schemaWorkParameters";
import {
	analyzeTriggerRules,
	type TriggerValidationIssue,
} from "./typicalWorkPatchErrors";

export type TypicalWorkTriggerAnalysis = {
	status: ReturnType<typeof analyzeTriggerRules>["status"];
	previewState: TriggerPreviewState;
	issues: TriggerValidationIssue[];
};

/**
 * Статус условий появления работы в конструкторе — только по конфигурации админа.
 * Не зависит от превью анкеты и расчёта.
 */
export function useTypicalWorkTriggerAnalysis(
	work: Pick<
		V2TypicalWorkCardDto,
		| "rules"
		| "triggerArchCount"
		| "triggerMode"
		| "triggerFormula"
		| "id"
		| "streamExecutor"
		| "assignmentId"
	> | null,
	methodologyCatalog: V2TypicalWorkParameterDto[],
	schemaParamOptions?: V2TypicalWorkParameterDto[],
): TypicalWorkTriggerAnalysis {
	const { fieldPathHints, uiSchema, jsonSchema, enumMapByCode } =
		useSchemaEditor();

	const builtParamOptions = useMemo(
		() =>
			buildSchemaWorkParameters({
				fieldPathHints,
				uiSchema: uiSchema as Record<string, unknown>,
				jsonSchema,
				enumMapByCode,
			}),
		[enumMapByCode, fieldPathHints, jsonSchema, uiSchema],
	);
	const paramOptions = schemaParamOptions ?? builtParamOptions;

	return useMemo(() => {
		if (!work) {
			return {
				status: "no_triggers" as const,
				previewState: "none" as const,
				issues: [],
			};
		}

		return analyzeTriggerRules(
			work.rules ?? [],
			paramOptions,
			methodologyCatalog,
			undefined,
			undefined,
			undefined,
			work.triggerArchCount,
			work.triggerMode ?? "simple",
			work.triggerFormula,
		);
	}, [methodologyCatalog, paramOptions, work]);
}

/** @deprecated используйте useTypicalWorkTriggerAnalysis */
export const useTypicalWorkTriggerPreview = useTypicalWorkTriggerAnalysis;
