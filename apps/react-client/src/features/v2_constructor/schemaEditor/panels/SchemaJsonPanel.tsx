import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Editor from "@monaco-editor/react";
import { useSchemaEditor } from "../SchemaEditorContext";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import { PanelChrome } from "../components/PanelChrome";

function JsonEditorColumn({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<Box
			sx={{
				minHeight: 0,
				minWidth: 0,
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
			}}
		>
			<Typography
				variant="caption"
				fontWeight={600}
				display="block"
				sx={{ mb: 0.5, flexShrink: 0 }}
			>
				{label}
			</Typography>
			<Box
				sx={{
					flex: 1,
					minHeight: 0,
					overflow: "hidden",
					"& .monaco-editor": { height: "100% !important" },
				}}
			>
				<Editor
					height="100%"
					defaultLanguage="json"
					options={{ minimap: { enabled: false }, wordWrap: "on" }}
					value={value}
					onChange={(v) => onChange(v ?? "")}
				/>
			</Box>
		</Box>
	);
}

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

	const fillHeight = embedded;

	return (
		<PanelChrome
			embedded={embedded}
			fillHeight={fillHeight}
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
				<Box
					data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.jsonEditors}
					sx={{
						flex: fillHeight ? 1 : undefined,
						minHeight: fillHeight ? 0 : 360,
						display: "grid",
						gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
						gridTemplateRows: fillHeight ? "1fr" : undefined,
						gap: 2,
						overflow: "hidden",
					}}
				>
					<JsonEditorColumn
						label="JSON Schema"
						value={schemaMonacoText}
						onChange={setSchemaMonacoText}
					/>
					<JsonEditorColumn
						label="UI Schema"
						value={uiMonacoText}
						onChange={setUiMonacoText}
					/>
				</Box>
			</Box>
		</PanelChrome>
	);
}
