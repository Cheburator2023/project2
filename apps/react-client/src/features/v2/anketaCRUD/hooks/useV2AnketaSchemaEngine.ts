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
	collectGeneratedTypicalWorkArrayPaths,
	ensureGroupActivationDefaults,
	resolveAnketaCalculationLogic,
	syncTriggerGatedGroupActivationFromTypicalWorks,
	resolveV2QuestionnaireUncertaintyCoefficient,
	syncAtypicalWorkCoefficientsInFormData,
	type V2LogicGraphDto,
} from "@smart-anketa/api-contract";
import { IS_DEV } from "@react-client/common/constants/dev";

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
		coerceLogicGraph(
			resolveAnketaCalculationLogic(coerceLogicGraph(undefined), {
				jsonSchema: source?.initialJsonSchema,
				uiSchema: source?.initialUiSchema,
			}),
		),
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
					resolveAnketaCalculationLogic(
						coerceLogicGraph(source.initialLogic),
						{
							jsonSchema: source.initialJsonSchema,
							uiSchema: source.initialUiSchema,
						},
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
				resolveAnketaCalculationLogic(coerceLogicGraph(version.logic), {
					jsonSchema: version.jsonSchema,
					uiSchema: version.uiSchema,
				}),
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

	const uncertaintySyncSignature = useMemo(
		() =>
			JSON.stringify({
				uncertainty: formData.uncertaintyCalculation,
				overallUncertainty: (formData.generalInfo as Record<string, unknown> | undefined)
					?.overallUncertainty,
			}),
		[formData.uncertaintyCalculation, formData.generalInfo],
	);

	useEffect(() => {
		if (!uiSchema || Object.keys(uiSchema).length === 0) return;
		setFormData((prev) => {
			const { coefficient } = resolveV2QuestionnaireUncertaintyCoefficient(prev);
			const synced = syncAtypicalWorkCoefficientsInFormData(
				prev,
				uiSchema,
				coefficient,
			);
			return synced.changed ? synced.formData : prev;
		});
	}, [uiSchema, uncertaintySyncSignature]);

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
		jsonSchema: jsonSchema as Record<string, unknown>,
		uiSchema: uiSchema as Record<string, unknown>,
		enabled: Boolean(templateId && (version?.id ?? explicitVersionId)),
	});

	const mappedCalculation = useMemo(
		() => (calculationResult ? mapCalculationResult(calculationResult) : null),
		[calculationResult],
	);

	useEffect(() => {
		if (!mappedCalculation?.liveFormData) return;
		setFormData((prev) =>
			syncTriggerGatedGroupActivationFromTypicalWorks(
				prev,
				uiSchema,
				mappedCalculation.liveFormData,
			),
		);
	}, [mappedCalculation?.liveFormData, uiSchema]);

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

	const calculationItems = mappedCalculation?.calculationItems ?? [];
	const taskTriggerItems = mappedCalculation?.taskTriggerItems ?? [];

	useEffect(() => {
		if (!IS_DEV) return;
		if (!calculationResult) return;

		const typicalPaths = collectGeneratedTypicalWorkArrayPaths(uiSchema);
		const typicalRows = typicalPaths.map((path) => ({
			path,
			rows: path.split(".").reduce<unknown>((cur, key) => {
				if (!cur || typeof cur !== "object" || Array.isArray(cur)) {
					return undefined;
				}
				return (cur as Record<string, unknown>)[key];
			}, mappedCalculation?.liveFormData),
		}));

		console.groupCollapsed(
			`[anketa-calc] ${new Date().toISOString()} · template=${templateId}`,
		);
		console.log("request.formData", formData);
		console.log("response.formData.summary", calculationResult.formData?.summary);
		console.log("display.summary", summary);
		console.log("items", calculationItems);
		console.log("taskTriggers", taskTriggerItems);
		console.log("typicalWorkPaths", typicalRows);
		console.log("legacyStageEvaluation", mappedCalculation?.legacyStageEvaluation);
		if (calculationError) {
			console.warn("error", calculationError);
		}
		console.groupEnd();
	}, [
		calculationResult,
		calculationItems,
		taskTriggerItems,
		summary,
		formData,
		templateId,
		uiSchema,
		mappedCalculation?.liveFormData,
		mappedCalculation?.legacyStageEvaluation,
		calculationError,
	]);

	return {
		template,
		version,
		versionLoading,
		dictionaryEnumsLoading,
		calculationLoading,
		calculationError,
		calculationResult,
		calculationItems,
		taskTriggerItems,
		calculationLiveFormData: mappedCalculation?.liveFormData,
		logicRules: logic.rules,
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
