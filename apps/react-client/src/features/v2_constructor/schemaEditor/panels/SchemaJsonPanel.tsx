import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Editor from "@monaco-editor/react";
import { useSchemaEditor } from "../SchemaEditorContext";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import { PanelChrome } from "../components/PanelChrome";

export function SchemaJsonPanel({ embedded = false }: { embedded?: boolean }) {
	const {
		schemaMonacoText,
		setSchemaMonacoText,
		uiMonacoText,
		setUiMonacoText,
		monacoError,
		syncMonacoApply,
		reloadMonacoFromState,
	} = useSchemaEditor();

	return (
		<PanelChrome
			embedded={embedded}
			dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.jsonEditor}
			title="Редактор JSON"
			description="Прямое редактирование JSON Schema и UI Schema черновика."
			actions={
				<Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
					<Button size="small" variant="contained" onClick={syncMonacoApply}>
						Применить
					</Button>
					<Button size="small" onClick={reloadMonacoFromState}>
						Сбросить
					</Button>
				</Box>
			}
		>
			{monacoError ? <Alert severity="error">{monacoError}</Alert> : null}
			<Box
				data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.jsonEditors}
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
					gap: 2,
					minHeight: 360,
				}}
			>
				<Box sx={{ minHeight: 320 }}>
					<Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
						JSON Schema
					</Typography>
					<Editor
						height="320px"
						defaultLanguage="json"
						options={{ minimap: { enabled: false }, wordWrap: "on" }}
						value={schemaMonacoText}
						onChange={(v) => setSchemaMonacoText(v ?? "")}
					/>
				</Box>
				<Box sx={{ minHeight: 320 }}>
					<Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
						UI Schema
					</Typography>
					<Editor
						height="320px"
						defaultLanguage="json"
						options={{ minimap: { enabled: false }, wordWrap: "on" }}
						value={uiMonacoText}
						onChange={(v) => setUiMonacoText(v ?? "")}
					/>
				</Box>
			</Box>
		</PanelChrome>
	);
}
