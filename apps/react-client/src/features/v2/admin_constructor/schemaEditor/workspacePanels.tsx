import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import type { IDockviewPanelProps } from "dockview-react";
import type { V2LogicWorkspaceTab } from "@smart-anketa/api-contract";
import { useCallback } from "react";
import { useSearchParams } from "react-router";
import {
	CALCULATION_PANEL_ID,
	DOCK_PANEL_HEADINGS,
	RELATIONS_PANEL_ID,
} from "./constants";
import { SchemaDesignerLayout } from "./components/SchemaDesignerLayout";
import { useSchemaEditor } from "./SchemaEditorContext";
import { SchemaCalculationPanel } from "./panels/SchemaCalculationPanel";
import { SchemaRelationsPanel } from "./panels/SchemaRelationsPanel";
import { SchemaJsonPanel } from "./panels/SchemaJsonPanel";
import { SchemaLogicPanel } from "./panels/SchemaLogicPanel";
import { LogicWorkspaceShell } from "./panels/typicalWorksPanel/TypicalWorksPanel";
import { LOGIC_TAB_QUERY } from "./panels/typicalWorksPanel/typicalWorksUi";
import { SchemaPreviewPanel } from "./panels/SchemaPreviewPanel";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../testIds";

export const WORKSPACE_PANEL_IDS = DOCK_PANEL_HEADINGS.map(([id]) => id);

export {
	CALCULATION_PANEL_ID,
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
	const [searchParams, setSearchParams] = useSearchParams();
	const tab = parseLogicTab(searchParams.get(LOGIC_TAB_QUERY));

	const onTabChange = useCallback(
		(next: V2LogicWorkspaceTab) => {
			setSearchParams(
				(prev) => {
					const params = new URLSearchParams(prev);
					params.set(LOGIC_TAB_QUERY, next);
					return params;
				},
				{ replace: true },
			);
		},
		[setSearchParams],
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

function parseLogicTab(raw: string | null): V2LogicWorkspaceTab {
	if (raw === "dependencies" || raw === "jsonlogic" || raw === "works") {
		return raw;
	}
	return "works";
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

export function CalculationDockPanel(_props: IDockviewPanelProps) {
	return (
		<PanelHost dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.panelCalculation}>
			<SchemaCalculationPanel embedded />
		</PanelHost>
	);
}

export function RelationsDockPanel(_props: IDockviewPanelProps) {
	return (
		<PanelHost dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.panelRelations}>
			<SchemaRelationsPanel embedded />
		</PanelHost>
	);
}

export const workspacePanelComponents = {
	designer: DesignerWorkspacePanel,
	json: JsonWorkspacePanel,
	logic: LogicWorkspacePanel,
	preview: PreviewWorkspacePanel,
	[CALCULATION_PANEL_ID]: CalculationDockPanel,
	[RELATIONS_PANEL_ID]: RelationsDockPanel,
} as const;
