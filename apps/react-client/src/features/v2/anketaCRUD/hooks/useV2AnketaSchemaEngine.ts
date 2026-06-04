import {
	useV2DictionaryEnumsMaps,
	useV2Template,
	useV2TemplateVersion,
} from "@react-client/common/api/queries/v2-templates";
import { useDebouncedV2Calculation } from "@react-client/features/v2/admin_constructor/hooks/useDebouncedV2Calculation";
import {
	EMPTY_JSON_SCHEMA,
	coerceJsonSchema,
	coerceLogicGraph,
	coerceUiSchema,
} from "@react-client/features/v2/admin_constructor/utils/coerceV2TemplateSnapshot";
import {
	collectDictionaryCodesFromUiSchema,
	mergeDictionaryEnumsIntoPreviewSchema,
} from "@react-client/features/v2/admin_constructor/utils/dictionaryPreview";
import { hideSummaryInPreviewUi } from "@react-client/features/v2/admin_constructor/utils/hideSummaryInPreviewUi";
import { derivePreviewSchemas } from "@react-client/features/v2/admin_constructor/utils/logicPreview";
import { mapCalculationResult } from "@react-client/features/v2/admin_constructor/utils/mapCalculationResult";
import { readSummaryFromFormData } from "@react-client/features/v2/admin_constructor/utils/readSummaryFromFormData";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { mergeAnketaDisplayFormData } from "../utils/mergeAnketaDisplayFormData";
import { ensureAnketaFormDataWithWorkflow } from "./useAnketaWorkflow";
import { useEffect, useMemo, useState } from "react";
import type { V2LogicGraphDto } from "@smart-anketa/api-contract";

export type V2AnketaSchemaEngineSource = {
	templateId: string;
	versionId: string | null;
	initialFormData?: Record<string, unknown>;
	initialJsonSchema?: Record<string, unknown>;
	initialUiSchema?: Record<string, unknown>;
	initialLogic?: V2LogicGraphDto;
};

export type V2AnketaSchemaEngine = ReturnType<typeof useV2AnketaSchemaEngine>;

export function useV2AnketaSchemaEngine(source: V2AnketaSchemaEngineSource | null) {
	const templateId = source?.templateId ?? "";
	const explicitVersionId = source?.versionId ?? null;

	const { data: template } = useV2Template(templateId);
	const { data: version, isLoading: versionLoading } = useV2TemplateVersion(
		templateId,
		explicitVersionId ?? template?.currentVersionId ?? null,
	);

	const [jsonSchema, setJsonSchema] = useState<RJSFSchema>(EMPTY_JSON_SCHEMA);
	const [uiSchema, setUiSchema] = useState<UiSchema>({});
	const [logic, setLogic] = useState(coerceLogicGraph(undefined));
	const [formData, setFormData] = useState<Record<string, unknown>>(() =>
		ensureAnketaFormDataWithWorkflow(source?.initialFormData ?? {}),
	);

	useEffect(() => {
		if (source?.initialJsonSchema && source.initialUiSchema && source.initialLogic) {
			setJsonSchema(coerceJsonSchema(source.initialJsonSchema));
			setUiSchema(coerceUiSchema(source.initialUiSchema, source.initialJsonSchema));
			setLogic(coerceLogicGraph(source.initialLogic));
			setFormData(ensureAnketaFormDataWithWorkflow(source.initialFormData ?? {}));
			return;
		}
		if (!version?.id) return;
		setJsonSchema(coerceJsonSchema(version.jsonSchema));
		setUiSchema(coerceUiSchema(version.uiSchema, version.jsonSchema));
		setLogic(coerceLogicGraph(version.logic));
		if (source?.initialFormData) {
			setFormData(ensureAnketaFormDataWithWorkflow(source.initialFormData));
		}
	}, [
		version?.id,
		source?.initialFormData,
		source?.initialJsonSchema,
		source?.initialUiSchema,
		source?.initialLogic,
	]);

	const referencedDictionaryCodes = useMemo(
		() => collectDictionaryCodesFromUiSchema(uiSchema),
		[uiSchema],
	);

	const { enumMapByCode, isLoading: dictionaryEnumsLoading } =
		useV2DictionaryEnumsMaps(referencedDictionaryCodes);

	const {
		result: calculationResult,
		isLoading: calculationLoading,
		error: calculationError,
	} = useDebouncedV2Calculation({
		templateId,
		versionId: version?.id ?? explicitVersionId,
		formData,
		rulesOverride: logic,
		enabled: Boolean(templateId && (version?.id ?? explicitVersionId)),
	});

	const mappedCalculation = useMemo(
		() => (calculationResult ? mapCalculationResult(calculationResult) : null),
		[calculationResult],
	);

	const logicPreviewPack = useMemo(
		() =>
			derivePreviewSchemas(
				jsonSchema,
				uiSchema,
				logic.rules,
				formData,
				mappedCalculation
					? {
							computedLiveData: mappedCalculation.liveFormData,
							calculationItems: mappedCalculation.calculationItems,
							taskTriggerItems: mappedCalculation.taskTriggerItems,
							validationIssues: mappedCalculation.validationIssues,
						}
					: undefined,
			),
		[jsonSchema, uiSchema, logic.rules, formData, mappedCalculation],
	);

	const previewSchema = useMemo(
		() =>
			mergeDictionaryEnumsIntoPreviewSchema(
				logicPreviewPack.previewSchema,
				uiSchema,
				enumMapByCode,
			),
		[logicPreviewPack.previewSchema, uiSchema, enumMapByCode],
	);

	const previewUiSchema = useMemo(
		() => hideSummaryInPreviewUi(logicPreviewPack.previewUiSchema),
		[logicPreviewPack.previewUiSchema],
	);

	const displayFormData = useMemo(
		() =>
			mergeAnketaDisplayFormData(
				formData,
				mappedCalculation?.liveFormData,
			),
		[formData, mappedCalculation?.liveFormData],
	);
	const summary = readSummaryFromFormData(displayFormData);

	return {
		template,
		version,
		versionLoading,
		dictionaryEnumsLoading,
		calculationLoading,
		calculationError,
		logicValidationIssueCount: logicPreviewPack.logicValidationIssues.length,
		logicExtraErrors: logicPreviewPack.extraErrors,
		previewSchema,
		previewUiSchema,
		displayFormData,
		formData,
		setFormData,
		summary,
		readOnly: false,
	};
}
