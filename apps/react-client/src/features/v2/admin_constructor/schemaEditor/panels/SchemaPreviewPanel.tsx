import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { V2AnketaFormWithModals } from "@react-client/features/v2/anketaCRUD/organisms/V2AnketaFormWithModals";
import { useSchemaEditorAnketaEngine } from "../../hooks/useSchemaEditorAnketaEngine";
import { V2FormWithEvaluationLayout } from "../../organisms/V2FormWithEvaluationLayout";
import { useSchemaEditor } from "../SchemaEditorContext";
import { PanelChrome } from "../components/PanelChrome";

const PREVIEW_HIDDEN_TOP_LEVEL = ["workflow", "uncertaintyCalculation"];

export function SchemaPreviewPanel({ embedded = false }: { embedded?: boolean }) {
	const engine = useSchemaEditorAnketaEngine();
	const {
		dictionaryEnumsLoading,
		calculationLoading,
		calculationError,
		logicValidationIssueCount,
	} = useSchemaEditor();

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
			{logicValidationIssueCount > 0 ? (
				<Alert severity="warning" sx={{ mb: 1 }}>
					Логическая валидация: {logicValidationIssueCount}{" "}
					{logicValidationIssueCount === 1 ? "замечание" : "замечаний"} — см.
					поля формы.
				</Alert>
			) : null}

			<V2FormWithEvaluationLayout
				summary={engine.summary}
				calculationLoading={calculationLoading}
			>
				<V2AnketaFormWithModals
					engine={engine}
					hiddenTopLevelFields={PREVIEW_HIDDEN_TOP_LEVEL}
					data-test-id="schema-editor-anketa-preview"
				/>
			</V2FormWithEvaluationLayout>

			<Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
				Учитываются правила видимости, обязательности, подсказок и валидации (JsonLogic)
				по текущим данным формы.
			</Typography>
		</PanelChrome>
	);
}
