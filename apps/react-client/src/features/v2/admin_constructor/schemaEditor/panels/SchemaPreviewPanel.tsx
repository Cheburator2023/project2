import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { V2AnketaFormWithModals } from "@react-client/features/v2/anketaCRUD/organisms/V2AnketaFormWithModals";
import { useCallback } from "react";
import { useSchemaEditorAnketaEngine } from "../../hooks/useSchemaEditorAnketaEngine";
import { V2FormWithEvaluationLayout } from "../../organisms/V2FormWithEvaluationLayout";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import { createResetSchemaEditorPreviewFormData } from "../../utils/previewFormReset";
import { SchemaEditorPanelErrorBoundary } from "../components/SchemaEditorPanelErrorBoundary";
import { useSchemaEditor } from "../SchemaEditorContext";
import { PanelChrome } from "../components/PanelChrome";

export function SchemaPreviewPanel({ embedded = false }: { embedded?: boolean }) {
	const engine = useSchemaEditorAnketaEngine();
	const {
		dictionaryEnumsLoading,
		calculationLoading,
		calculationError,
		logicValidationIssueCount,
		previewUiSchema,
		setFormData,
	} = useSchemaEditor();

	const handleResetPreview = useCallback(() => {
		setFormData(createResetSchemaEditorPreviewFormData(previewUiSchema));
	}, [previewUiSchema, setFormData]);

	const resetButton = (
		<Button
			size="small"
			variant="outlined"
			onClick={handleResetPreview}
			data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.previewReset}
			title="Очистить значения полей, статусы workflow и активацию групп"
		>
			Сброс
		</Button>
	);

	return (
		<PanelChrome
			embedded={embedded}
			title="Превью анкеты"
			description="Тестовые значения для проверки логики и справочников."
			actions={embedded ? undefined : resetButton}
		>
			{embedded ? (
				<Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
					{resetButton}
				</Box>
			) : null}
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
			{logicValidationIssueCount > 0 ? (
				<Alert severity="warning" sx={{ mb: 1 }}>
					Логическая валидация: {logicValidationIssueCount}{" "}
					{logicValidationIssueCount === 1 ? "замечание" : "замечаний"} — см.
					поля формы.
				</Alert>
			) : null}

			<SchemaEditorPanelErrorBoundary title="Ошибка превью анкеты">
				{embedded ? (
					<V2AnketaFormWithModals
						engine={engine}
						data-test-id="schema-editor-anketa-preview"
					/>
				) : (
					<V2FormWithEvaluationLayout
						summary={engine.summary}
						formData={engine.displayFormData}
						calculationLoading={calculationLoading}
					>
						<V2AnketaFormWithModals
							engine={engine}
							data-test-id="schema-editor-anketa-preview"
						/>
					</V2FormWithEvaluationLayout>
				)}
			</SchemaEditorPanelErrorBoundary>

			<Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
				Учитываются правила видимости, обязательности, подсказок и валидации (JsonLogic)
				по текущим данным формы.
			</Typography>
		</PanelChrome>
	);
}
