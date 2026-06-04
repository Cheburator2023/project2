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

import { useCallback, useEffect, useRef } from "react";
import {
	DOCK_PANEL_HEADINGS,
	MAIN_DOCK_PANEL_ID,
} from "./constants";
import { SchemaEditorDockHeaderRightActions } from "./SchemaEditorDockHeaderActions";
import { useSchemaEditorDock } from "./SchemaEditorDockContext";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../testIds";
import { workspacePanelComponents } from "./workspacePanels";

function DockTabNoClose(props: IDockviewPanelHeaderProps) {
	return <DockviewDefaultTab {...props} hideClose />;
}

function buildDefaultLayout(api: DockviewApi) {
	if (api.totalPanels > 0) return;

	const [mainPanel, ...otherPanels] = DOCK_PANEL_HEADINGS;

	api.addPanel({
		id: mainPanel[0],
		component: mainPanel[0],
		title: mainPanel[1],
	});

	for (const [id, title] of otherPanels) {
		api.addPanel({
			id,
			component: id,
			title,
			position: { referencePanel: MAIN_DOCK_PANEL_ID },
		});
	}

	const designer = api.getPanel(MAIN_DOCK_PANEL_ID);
	designer?.api.setActive();
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
					"& .dv-right-actions-container": {
						display: "flex",
						alignItems: "center",
					},
				}}
			>
				<DockviewReact
					theme={dockTheme}
					components={workspacePanelComponents}
					defaultTabComponent={DockTabNoClose}
					rightHeaderActionsComponent={SchemaEditorDockHeaderRightActions}
					floatingGroupBounds="boundedWithinViewport"
					popoutUrl="/popout.html"
					onReady={onReady}
				/>
			</Box>
		</Box>
	);
}
