import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import Form from "@rjsf/mui";
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { useSchemaEditor } from "../SchemaEditorContext";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import { PanelChrome } from "../components/PanelChrome";

export function SchemaPreviewPanel({ embedded = false }: { embedded?: boolean }) {
	const {
		previewSchema,
		previewUiSchema,
		formData,
		setFormData,
		dictionaryEnumsLoading,
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

			<Form
				schema={previewSchema}
				uiSchema={previewUiSchema}
				formData={formData}
				validator={validatorRu}
				liveValidate
				noHtml5Validate
				showErrorList={false}
				onChange={(evt) =>
					setFormData((evt.formData as Record<string, unknown>) ?? {})
				}
			/>

			<Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
				Учитываются правила видимости, обязательности и подсказок по текущим данным формы.
			</Typography>
		</PanelChrome>
	);
}
