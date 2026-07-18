import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Editor from "@monaco-editor/react";
import { useCallback, useState } from "react";
import { useSchemaEditor } from "../SchemaEditorContext";
import { downloadSchemaEditorSnapshotJson } from "../schemaEditorSnapshotJson";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import { PanelChrome } from "../components/PanelChrome";

export function SchemaJsonPanel({ embedded = false }: { embedded?: boolean }) {
	const {
		templateId,
		snapshotMonacoText,
		setSnapshotMonacoText,
		monacoError,
		syncMonacoApply,
		reloadMonacoFromState,
	} = useSchemaEditor();
	const [copyNote, setCopyNote] = useState<string | null>(null);

	const fillHeight = embedded;

	const handleDownload = useCallback(() => {
		const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
		const idPart = templateId?.slice(0, 8) || "draft";
		downloadSchemaEditorSnapshotJson(
			snapshotMonacoText,
			`anketa-snapshot-${idPart}-${stamp}.json`,
		);
	}, [snapshotMonacoText, templateId]);

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(snapshotMonacoText);
			setCopyNote("JSON скопирован в буфер обмена");
			window.setTimeout(() => setCopyNote(null), 2500);
		} catch {
			setCopyNote("Не удалось скопировать — скачайте файл");
			window.setTimeout(() => setCopyNote(null), 2500);
		}
	}, [snapshotMonacoText]);

	return (
		<PanelChrome
			embedded={embedded}
			fillHeight={fillHeight}
			dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.jsonEditor}
			title="Редактор JSON (снепшот)"
			description="Один файл как factory-снепшот: jsonSchema + uiSchema + logic. «Применить» подставляет в конструктор; «Скачать» — выгрузка для переноса в хардкод."
			actions={
				<Box sx={{ display: "flex", gap: 0.5, flexShrink: 0, flexWrap: "wrap" }}>
					<Button size="small" variant="contained" onClick={syncMonacoApply}>
						Применить
					</Button>
					<Button size="small" onClick={reloadMonacoFromState}>
						Сбросить
					</Button>
					<Button
						size="small"
						variant="outlined"
						startIcon={<FileDownloadOutlinedIcon />}
						onClick={handleDownload}
						title="Скачать целый JSON для переноса в v2-default-anketa.snapshot.json"
						data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.jsonDownload}
					>
						Скачать
					</Button>
					<Button size="small" variant="outlined" onClick={handleCopy}>
						Копировать
					</Button>
				</Box>
			}
		>
			<Box
				sx={{
					flex: fillHeight ? 1 : undefined,
					minHeight: fillHeight ? 0 : undefined,
					height: fillHeight ? "100%" : undefined,
					display: "flex",
					flexDirection: "column",
					gap: 1,
					overflow: "hidden",
				}}
			>
				{monacoError ? (
					<Alert severity="error" sx={{ flexShrink: 0 }}>
						{monacoError}
					</Alert>
				) : null}
				{copyNote ? (
					<Alert severity="success" sx={{ flexShrink: 0 }}>
						{copyNote}
					</Alert>
				) : null}
				<Typography
					variant="caption"
					color="text.secondary"
					display="block"
					sx={{ flexShrink: 0 }}
					title="Подсказка по JSON-редактору"
				>
					Формат:{" "}
					<code>{`{ "jsonSchema": {…}, "uiSchema": {…}, "logic": { "rules": […] } }`}</code>
					. Лишние ключи (например dictionariesSnapshot) при «Применить»
					игнорируются. Чтобы убрать поле — удалите его из jsonSchema и uiSchema,
					затем «Применить».
				</Typography>
				<Box
					data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.jsonEditors}
					sx={{
						flex: fillHeight ? 1 : undefined,
						minHeight: fillHeight ? 0 : 360,
						overflow: "hidden",
						"& .monaco-editor": { height: "100% !important" },
					}}
				>
					<Editor
						height="100%"
						defaultLanguage="json"
						options={{
							minimap: { enabled: false },
							wordWrap: "on",
							scrollBeyondLastLine: false,
						}}
						value={snapshotMonacoText}
						onChange={(v) => setSnapshotMonacoText(v ?? "")}
					/>
				</Box>
			</Box>
		</PanelChrome>
	);
}
