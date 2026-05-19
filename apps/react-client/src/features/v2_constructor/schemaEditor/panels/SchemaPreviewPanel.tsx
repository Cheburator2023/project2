import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import Form from "@rjsf/mui";
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { V2FormWithEvaluationLayout } from "../../organisms/V2FormWithEvaluationLayout";
import { hideSummaryInPreviewUi } from "../../utils/hideSummaryInPreviewUi";
import { readSummaryFromFormData } from "../../utils/readSummaryFromFormData";
import { useMemo } from "react";
import { useSchemaEditor } from "../SchemaEditorContext";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import { PanelChrome } from "../components/PanelChrome";

export function SchemaPreviewPanel({ embedded = false }: { embedded?: boolean }) {
	const {
		previewSchema,
		previewUiSchema,
		formData,
		liveFormData,
		setFormData,
		dictionaryEnumsLoading,
		calculationLoading,
		calculationError,
	} = useSchemaEditor();

	const summary = readSummaryFromFormData(liveFormData);
	const previewUiWithoutSummary = useMemo(
		() => hideSummaryInPreviewUi(previewUiSchema),
		[previewUiSchema],
	);

	return (
		<PanelChrome
			embedded={embedded}
			title="Превью анкеты"
			description="Тестовые значения для проверки логики и справочников."
		>
			{dictionaryEnumsLoading ? (
				<Alert severity="info" sx={{ mb: 1 }}>
					Загрузка справочников…
				</Alert>
			) : null}
			{calculationError ? (
				<Alert severity="error" sx={{ mb: 1 }}>
					Ошибка калькуляции: {calculationError}
				</Alert>
			) : null}
			{calculationLoading ? (
				<Alert severity="info" sx={{ mb: 1 }}>
					Обновление расчёта…
				</Alert>
			) : null}

			<V2FormWithEvaluationLayout
				summary={summary}
				calculationLoading={calculationLoading}
			>
				<Form
					schema={previewSchema}
					uiSchema={previewUiWithoutSummary}
					formData={liveFormData}
					validator={validatorRu}
					liveValidate
					noHtml5Validate
					showErrorList={false}
					onChange={(evt) =>
						setFormData((evt.formData as Record<string, unknown>) ?? {})
					}
				/>
			</V2FormWithEvaluationLayout>

			<Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
				Учитываются правила видимости, обязательности и подсказок по текущим данным формы.
			</Typography>
		</PanelChrome>
	);
}
