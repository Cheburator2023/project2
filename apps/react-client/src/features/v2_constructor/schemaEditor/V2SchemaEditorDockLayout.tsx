import Box from "@mui/material/Box";
import { useColorScheme } from "@mui/material/styles";
import {
	DockviewDefaultTab,
	DockviewReact,
	themeDark,
	themeLight,
	type DockviewApi,
	type DockviewReadyEvent,
	type IDockviewPanelHeaderProps,
} from "dockview-react";
import "dockview/dist/styles/dockview.css";
import { useCallback, useEffect, useRef } from "react";
import { TAB_HEADINGS } from "./constants";
import { SchemaEditorDndProvider } from "./components/SchemaEditorDndProvider";
import { useSchemaEditorDock } from "./SchemaEditorDockContext";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../testIds";
import {
	CALCULATION_PANEL_ID,
	RELATIONS_PANEL_ID,
	SCHEMA_TREE_PANEL_ID,
	workspacePanelComponents,
} from "./workspacePanels";

function DockTabNoClose(props: IDockviewPanelHeaderProps) {
	return <DockviewDefaultTab {...props} hideClose />;
}

function buildDefaultLayout(api: DockviewApi) {
	if (api.totalPanels > 0) return;

	const [firstTab, ...restTabs] = TAB_HEADINGS;

	api.addPanel({
		id: firstTab[0],
		component: firstTab[0],
		title: firstTab[1],
	});

	for (const [id, title] of restTabs) {
		api.addPanel({
			id,
			component: id,
			title,
			position: { referencePanel: firstTab[0] },
		});
	}

	api.addPanel({
		id: SCHEMA_TREE_PANEL_ID,
		component: SCHEMA_TREE_PANEL_ID,
		title: "Дерево схемы",
		position: { direction: "below", referencePanel: firstTab[0] },
		initialHeight: 220,
	});

	api.addPanel({
		id: CALCULATION_PANEL_ID,
		component: CALCULATION_PANEL_ID,
		title: "Калькуляция",
		position: { direction: "right", referencePanel: firstTab[0] },
		initialWidth: 320,
	});

	api.addPanel({
		id: RELATIONS_PANEL_ID,
		component: RELATIONS_PANEL_ID,
		title: "Граф связей",
		position: { referencePanel: CALCULATION_PANEL_ID },
	});
}

export function V2SchemaEditorDockLayout() {
	const { mode } = useColorScheme();
	const { registerDockApi } = useSchemaEditorDock();
	const layoutInitializedRef = useRef(false);

	const dockTheme = mode === "dark" ? themeDark : themeLight;

	const onReady = useCallback(
		(event: DockviewReadyEvent) => {
			registerDockApi(event.api);

			if (layoutInitializedRef.current || event.api.totalPanels > 0) {
				return;
			}

			layoutInitializedRef.current = true;
			buildDefaultLayout(event.api);
		},
		[registerDockApi],
	);

	useEffect(() => {
		return () => {
			layoutInitializedRef.current = false;
			registerDockApi(null);
		};
	}, [registerDockApi]);

	return (
		<Box
			data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.dockLayout}
			sx={{
				height: "100%",
				width: "100%",
				minHeight: 0,
				position: "relative",
			}}
		>
			<SchemaEditorDndProvider>
				<Box
					sx={{
						position: "absolute",
						inset: 0,
						"& .dv-root": { height: "100%", width: "100%" },
						"& .dv-grid-view": { height: "100%" },
						"& .dv-content-container": {
							display: "flex",
							flexDirection: "column",
							overflow: "hidden",
						},
						"& .dv-content-container > *": {
							flex: 1,
							minHeight: 0,
							height: "100%",
							width: "100%",
						},
					}}
				>
					<DockviewReact
						theme={dockTheme}
						components={workspacePanelComponents}
						defaultTabComponent={DockTabNoClose}
						onReady={onReady}
					/>
				</Box>
			</SchemaEditorDndProvider>
		</Box>
	);
}
