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
import { derivePreviewSchemas } from "../utils/logicPreview";

type V2TemplateFormPreviewProps = {
	templateId: string;
};

export function V2TemplateFormPreview({ templateId }: V2TemplateFormPreviewProps) {
	const { data: versions, isLoading: versionsLoading } = useV2TemplateVersions(
		templateId,
	);

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

	const logicPreviewPack = useMemo(
		() => derivePreviewSchemas(jsonSchema, uiSchema, logic.rules, formData),
		[jsonSchema, uiSchema, logic.rules, formData],
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

	const previewUiSchema = logicPreviewPack.previewUiSchema;

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
			<Alert severity="warning" data-test-id={V2_TEMPLATE_READ_TEST_IDS.noDraft}>
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

			<Box data-test-id={V2_TEMPLATE_READ_TEST_IDS.form}>
				<Form
					schema={previewSchema}
					uiSchema={previewUiSchema}
					formData={formData}
					templates={v2PreviewFormTemplates}
					validator={validatorRu}
				liveValidate
				noHtml5Validate
				showErrorList={false}
				onChange={(evt) =>
					setFormData((evt.formData as Record<string, unknown>) ?? {})
				}
				/>
			</Box>

			<Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
				Черновик v{draftVersion.versionNumber}. Учитываются правила видимости,
				обязательности и подсказок по текущим данным формы.
			</Typography>
		</>
	);
}
