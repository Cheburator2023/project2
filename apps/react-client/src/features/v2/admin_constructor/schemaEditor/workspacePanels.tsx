import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import type { IDockviewPanelProps } from "dockview-react";
import type { V2LogicWorkspaceTab } from "@smart-anketa/api-contract";
import { useCallback, useEffect } from "react";
import {
	DOCK_PANEL_HEADINGS,
	ISSUES_PANEL_ID,
	PREVIEW_PANEL_ID,
	RELATIONS_PANEL_ID,
} from "./constants";
import { SchemaDesignerLayout } from "./components/SchemaDesignerLayout";
import { useSchemaEditor } from "./SchemaEditorContext";
import { SchemaCalculationPanel } from "./panels/SchemaCalculationPanel";
import { SchemaRelationsPanel } from "./panels/SchemaRelationsPanel";
import { SchemaJsonPanel } from "./panels/SchemaJsonPanel";
import { SchemaLogicPanel } from "./panels/SchemaLogicPanel";
import { LogicWorkspaceShell } from "./panels/typicalWorksPanel/LogicWorkspaceShell";
import { useSchemaEditorUiStore } from "./schemaEditorUiStore";
import { logSchemaEditorNav } from "./schemaEditorNavDebug";
import { SchemaPreviewPanel } from "./panels/SchemaPreviewPanel";
import { SchemaIssuesPanel } from "./panels/SchemaIssuesPanel";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../testIds";

export const WORKSPACE_PANEL_IDS = DOCK_PANEL_HEADINGS.map(([id]) => id);

export {
	CALCULATION_PANEL_ID,
	PREVIEW_PANEL_ID,
	RELATIONS_PANEL_ID,
} from "./constants";

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
			Циклические зависимости в правилах ({cycles.length}). См. вкладку
			«Логика».
		</Alert>
	);
}

export function DesignerWorkspacePanel(_props: IDockviewPanelProps) {
	return (
		<PanelHost dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.panelDesigner}>
			<CyclesWarning />
			<SchemaDesignerLayout />
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
	const tab = useSchemaEditorUiStore((s) => s.logicWorkspaceTab);
	const setLogicWorkspaceTab = useSchemaEditorUiStore((s) => s.setLogicWorkspaceTab);
	const selectedWorkId = useSchemaEditorUiStore((s) => s.selectedTypicalWorkId);

	useEffect(() => {
		logSchemaEditorNav("logicWorkspace.tab", {
			tab,
			workId: selectedWorkId,
		});
	}, [selectedWorkId, tab]);

	const onTabChange = useCallback(
		(next: V2LogicWorkspaceTab) => {
			setLogicWorkspaceTab(next);
		},
		[setLogicWorkspaceTab],
	);

	return (
		<PanelHost dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.panelLogic}>
			<Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
				<LogicWorkspaceShell
					tab={tab}
					onTabChange={onTabChange}
					jsonLogicPanel={<SchemaLogicPanel embedded />}
				/>
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
				<Divider sx={{ my: 2 }} />
				<Box data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.panelCalculation}>
					<SchemaCalculationPanel embedded />
				</Box>
			</Box>
		</PanelHost>
	);
}

export function IssuesWorkspacePanel(_props: IDockviewPanelProps) {
	return (
		<PanelHost dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.panelIssues}>
			<Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
				<SchemaIssuesPanel embedded />
			</Box>
		</PanelHost>
	);
}

export function RelationsDockPanel(_props: IDockviewPanelProps) {
	return (
		<PanelHost dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.panelRelations}>
			<Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex" }}>
				<SchemaRelationsPanel embedded />
			</Box>
		</PanelHost>
	);
}

export const workspacePanelComponents = {
	designer: DesignerWorkspacePanel,
	json: JsonWorkspacePanel,
	logic: LogicWorkspacePanel,
	[ISSUES_PANEL_ID]: IssuesWorkspacePanel,
	[PREVIEW_PANEL_ID]: PreviewWorkspacePanel,
	[RELATIONS_PANEL_ID]: RelationsDockPanel,
} as const;
