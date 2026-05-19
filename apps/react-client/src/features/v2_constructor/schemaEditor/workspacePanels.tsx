import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import type { IDockviewPanelProps } from "dockview-react";
import { TAB_HEADINGS } from "./constants";
import { SchemaCanvasPanel } from "./components/SchemaCanvasDnd";
import { SchemaFieldTreePanel } from "./components/SchemaFieldTree";
import { useSchemaEditor } from "./SchemaEditorContext";
import { SchemaJsonPanel } from "./panels/SchemaJsonPanel";
import { SchemaLogicPanel } from "./panels/SchemaLogicPanel";
import { SchemaPreviewPanel } from "./panels/SchemaPreviewPanel";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../testIds";

export const WORKSPACE_PANEL_IDS = TAB_HEADINGS.map(([id]) => id);

function PanelHost({
	children,
	dataTestId,
}: {
	children: React.ReactNode;
	dataTestId?: string;
}) {
	return (
		<Box
			data-test-id={dataTestId}
			sx={{
				height: "100%",
				width: "100%",
				minHeight: 0,
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				bgcolor: "background.default",
			}}
		>
			{children}
		</Box>
	);
}

function CyclesWarning() {
	const { mainTab, cycles } = useSchemaEditor();
	if (mainTab === "logic" || cycles.length === 0) {
		return null;
	}
	return (
		<Alert
			severity="warning"
			sx={{ flexShrink: 0, m: 1, mb: 0 }}
			data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.cyclesWarning}
		>
			Циклические зависимости в правилах ({cycles.length}). См. вкладку «Логика».
		</Alert>
	);
}

export const SCHEMA_TREE_PANEL_ID = "schema-tree";

export function DesignerWorkspacePanel(_props: IDockviewPanelProps) {
	return (
		<PanelHost dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.panelDesigner}>
			<CyclesWarning />
			<Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
				<SchemaCanvasPanel embedded />
			</Box>
		</PanelHost>
	);
}

export function SchemaTreeDockPanel(_props: IDockviewPanelProps) {
	return (
		<PanelHost dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.panelSchemaTree}>
			<SchemaFieldTreePanel embedded />
		</PanelHost>
	);
}

export function JsonWorkspacePanel(_props: IDockviewPanelProps) {
	return (
		<PanelHost dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.panelJson}>
			<CyclesWarning />
			<Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
				<SchemaJsonPanel embedded />
			</Box>
		</PanelHost>
	);
}

export function LogicWorkspacePanel(_props: IDockviewPanelProps) {
	return (
		<PanelHost dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.panelLogic}>
			<Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
				<SchemaLogicPanel embedded />
			</Box>
		</PanelHost>
	);
}

export function PreviewWorkspacePanel(_props: IDockviewPanelProps) {
	return (
		<PanelHost dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.panelPreview}>
			<CyclesWarning />
			<Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
				<SchemaPreviewPanel embedded />
			</Box>
		</PanelHost>
	);
}

export const workspacePanelComponents = {
	designer: DesignerWorkspacePanel,
	json: JsonWorkspacePanel,
	logic: LogicWorkspacePanel,
	preview: PreviewWorkspacePanel,
	[SCHEMA_TREE_PANEL_ID]: SchemaTreeDockPanel,
} as const;
