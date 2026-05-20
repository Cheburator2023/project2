import {
	useV2DictionaryEnumsMaps,
	useV2TemplateVersions,
} from "@react-client/common/api/queries/v2-templates";
import { Flex } from "@react-client/common/primitives/Flex";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Form from "@rjsf/mui";
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { useEffect, useMemo, useState } from "react";
import {
	collectDictionaryCodesFromUiSchema,
	mergeDictionaryEnumsIntoPreviewSchema,
} from "../utils/dictionaryPreview";
import {
	EMPTY_JSON_SCHEMA,
	coerceJsonSchema,
	coerceLogicGraph,
	coerceUiSchema,
} from "../utils/coerceV2TemplateSnapshot";
import { v2PreviewFormTemplates } from "../templates/v2PreviewFormTemplates";
import { V2_TEMPLATE_READ_TEST_IDS } from "../testIds";
import { useDebouncedV2Calculation } from "../hooks/useDebouncedV2Calculation";
import { derivePreviewSchemas } from "../utils/logicPreview";
import { mapCalculationResult } from "../utils/mapCalculationResult";
import { V2FormWithEvaluationLayout } from "./V2FormWithEvaluationLayout";
import { hideSummaryInPreviewUi } from "../utils/hideSummaryInPreviewUi";
import { readSummaryFromFormData } from "../utils/readSummaryFromFormData";

type V2TemplateFormPreviewProps = {
	templateId: string;
};

export function V2TemplateFormPreview({
	templateId,
}: V2TemplateFormPreviewProps) {
	const { data: versions, isLoading: versionsLoading } =
		useV2TemplateVersions(templateId);

	const draftVersion = useMemo(() => {
		const drafts =
			versions
				?.filter((v) => v.status === "draft")
				.sort((a, b) => b.versionNumber - a.versionNumber) ?? [];
		return drafts[0];
	}, [versions]);

	const [jsonSchema, setJsonSchema] = useState<RJSFSchema>(EMPTY_JSON_SCHEMA);
	const [uiSchema, setUiSchema] = useState<UiSchema>({});
	const [logic, setLogic] = useState(coerceLogicGraph(undefined));
	const [formData, setFormData] = useState<Record<string, unknown>>({});

	useEffect(() => {
		if (!draftVersion?.id) {
			return;
		}

		setJsonSchema(coerceJsonSchema(draftVersion.jsonSchema));
		setUiSchema(coerceUiSchema(draftVersion.uiSchema));
		setLogic(coerceLogicGraph(draftVersion.logic));
		setFormData({});
	}, [draftVersion?.id]);

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
		versionId: draftVersion?.id,
		formData,
		rulesOverride: logic,
		enabled: Boolean(draftVersion?.id),
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
	const logicExtraErrors = logicPreviewPack.extraErrors;
	const logicValidationIssueCount = logicPreviewPack.logicValidationIssues.length;
	const displayFormData = mappedCalculation?.liveFormData ?? formData;
	const summary = readSummaryFromFormData(displayFormData);

	if (versionsLoading) {
		return (
			<Flex
				justifyContent="center"
				alignItems="center"
				flexGrow={1}
				data-test-id={V2_TEMPLATE_READ_TEST_IDS.loading}
			>
				<CircularProgress size={32} />
			</Flex>
		);
	}

	if (!draftVersion) {
		return (
			<Alert
				severity="warning"
				data-test-id={V2_TEMPLATE_READ_TEST_IDS.noDraft}
			>
				Нет черновика для предпросмотра. Сохраните схему в редакторе.
			</Alert>
		);
	}

	return (
		<>
			{dictionaryEnumsLoading ? (
				<Alert severity="info" sx={{ mb: 2 }}>
					Загрузка справочников…
				</Alert>
			) : null}

			{calculationError ? (
				<Alert severity="error" sx={{ mb: 2 }}>
					Ошибка калькуляции: {calculationError}
				</Alert>
			) : null}
			{logicValidationIssueCount > 0 ? (
				<Alert severity="warning" sx={{ mb: 2 }}>
					Логическая валидация: {logicValidationIssueCount}{" "}
					{logicValidationIssueCount === 1 ? "замечание" : "замечаний"}
				</Alert>
			) : null}

			<Box data-test-id={V2_TEMPLATE_READ_TEST_IDS.form}>
				<V2FormWithEvaluationLayout
					summary={summary}
					calculationLoading={calculationLoading}
				>
					<Form
						schema={previewSchema}
						uiSchema={previewUiSchema}
						formData={displayFormData}
						extraErrors={logicExtraErrors}
						templates={v2PreviewFormTemplates}
						validator={validatorRu}
						liveValidate
						noHtml5Validate
						showErrorList={false}
						onChange={(evt) =>
							setFormData((evt.formData as Record<string, unknown>) ?? {})
						}
					/>
				</V2FormWithEvaluationLayout>
			</Box>
		</>
	);
}
