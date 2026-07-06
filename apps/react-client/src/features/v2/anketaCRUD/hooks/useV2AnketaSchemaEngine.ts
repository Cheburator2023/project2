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
	mergeDictionaryOptionsIntoPreviewUiSchema,
} from "@react-client/features/v2/admin_constructor/utils/dictionaryPreview";
import { derivePreviewSchemas } from "@react-client/features/v2/admin_constructor/utils/logicPreview";
import { mapCalculationResult } from "@react-client/features/v2/admin_constructor/utils/mapCalculationResult";
import { readSummaryFromFormData } from "@react-client/features/v2/admin_constructor/utils/readSummaryFromFormData";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { mergeAnketaDisplayFormData } from "../utils/mergeAnketaDisplayFormData";
import { ensureAnketaFormDataWithWorkflow } from "./useAnketaWorkflow";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	ensureGroupActivationDefaults,
	patchV2TypicalWorksLogicRules,
	type V2LogicGraphDto,
} from "@smart-anketa/api-contract";

export type V2AnketaSchemaEngineSource = {
	templateId: string;
	versionId: string | null;
	/** Стабильный id анкеты — ключ одноразовой гидрации (см. эффект ниже). */
	instanceId?: string;
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
	const [logic, setLogic] = useState(() =>
		coerceLogicGraph(patchV2TypicalWorksLogicRules(coerceLogicGraph(undefined))),
	);
	const [formData, setFormData] = useState<Record<string, unknown>>(() =>
		ensureAnketaFormDataWithWorkflow(source?.initialFormData ?? {}),
	);

	// Гидрируем снепшот ОДИН раз на стабильную идентичность (id анкеты / версии),
	// а не на ссылку source.initialFormData. Иначе рефетч form-package (после
	// сохранения или window-focus) даёт новую ссылку и затирает правки/открытую
	// модалку. Ключ меняется при загрузке другой анкеты/версии — тогда гидрация
	// повторяется. Паттерн как в schemaEditor (ParameterDependenciesPanel).
	const hydratedKeyRef = useRef<string | null>(null);

	useEffect(() => {
		const hydrationKey = source?.instanceId ?? version?.id ?? null;
		if (!hydrationKey || hydratedKeyRef.current === hydrationKey) return;

		if (source?.initialJsonSchema && source.initialUiSchema && source.initialLogic) {
			setJsonSchema(coerceJsonSchema(source.initialJsonSchema));
			setUiSchema(coerceUiSchema(source.initialUiSchema, source.initialJsonSchema));
			setLogic(
				coerceLogicGraph(
					patchV2TypicalWorksLogicRules(
						coerceLogicGraph(source.initialLogic),
					),
				),
			);
			setFormData(ensureAnketaFormDataWithWorkflow(source.initialFormData ?? {}));
			hydratedKeyRef.current = hydrationKey;
			return;
		}
		if (!version?.id) return;
		setJsonSchema(coerceJsonSchema(version.jsonSchema));
		setUiSchema(coerceUiSchema(version.uiSchema, version.jsonSchema));
		setLogic(
			coerceLogicGraph(
				patchV2TypicalWorksLogicRules(coerceLogicGraph(version.logic)),
			),
		);
		if (source?.initialFormData) {
			setFormData(ensureAnketaFormDataWithWorkflow(source.initialFormData));
		}
		hydratedKeyRef.current = hydrationKey;
	}, [version, source]);

	useEffect(() => {
		if (!uiSchema || Object.keys(uiSchema).length === 0) return;
		setFormData((prev) => ensureGroupActivationDefaults(prev, uiSchema));
	}, [uiSchema]);

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
				jsonSchema,
			),
		[logicPreviewPack.previewSchema, uiSchema, enumMapByCode, jsonSchema],
	);

	const previewUiSchema = useMemo(
		() =>
			mergeDictionaryOptionsIntoPreviewUiSchema(
				logicPreviewPack.previewUiSchema,
				uiSchema,
				jsonSchema,
				enumMapByCode,
			),
		[
			logicPreviewPack.previewUiSchema,
			uiSchema,
			jsonSchema,
			enumMapByCode,
		],
	);

	const displayFormData = useMemo(
		() =>
			mergeAnketaDisplayFormData(
				formData,
				mappedCalculation?.liveFormData,
				uiSchema as Record<string, unknown>,
			),
		[formData, mappedCalculation?.liveFormData, uiSchema],
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
