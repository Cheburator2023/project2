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

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
	DOCK_PANEL_HEADINGS,
	MAIN_DOCK_PANEL_ID,
} from "./constants";
import { SchemaEditorDockHeaderRightActions } from "./SchemaEditorDockHeaderActions";
import { SchemaEditorDndProvider } from "./components/SchemaEditorDndProvider";
import { useSchemaEditorDock } from "./SchemaEditorDockContext";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../testIds";
import { workspacePanelComponents } from "./workspacePanels";
import {
	layoutDockviewToContainer,
	useDockviewStableLayout,
} from "./useDockviewStableLayout";

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

	for (const [id, panelTitle] of otherPanels) {
		api.addPanel({
			id,
			component: id,
			title: panelTitle,
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
	const containerRef = useRef<HTMLDivElement | null>(null);
	const dockApiRef = useRef<DockviewApi | null>(null);

	const dockTheme = useMemo(
		() => (mode === "dark" ? themeDark : themeLight),
		[mode],
	);

	useDockviewStableLayout(containerRef, dockApiRef);

	const onReady = useCallback(
		(event: DockviewReadyEvent) => {
			dockApiRef.current = event.api;
			registerDockApi(event.api);

			if (!layoutInitializedRef.current && event.api.totalPanels === 0) {
				layoutInitializedRef.current = true;
				buildDefaultLayout(event.api);
			}

			const el = containerRef.current;
			if (el) {
				requestAnimationFrame(() => {
					layoutDockviewToContainer(event.api, el);
				});
			}
		},
		[registerDockApi],
	);

	useEffect(() => {
		return () => {
			layoutInitializedRef.current = false;
			dockApiRef.current = null;
			registerDockApi(null);
		};
	}, [registerDockApi]);

	return (
		<SchemaEditorDndProvider>
			<Box
				ref={containerRef}
				data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.dockLayout}
				sx={{
					height: "100%",
					width: "100%",
					minHeight: 0,
					overflow: "hidden",
					"& .dv-root": { height: "100%", width: "100%" },
					"& .dv-grid-view": { height: "100%" },
					"& .dv-groupview > .dv-content-container": {
						minHeight: 0,
						overflow: "hidden",
					},
					"& .dv-pane-container.dv-animated .dv-view": {
						transition: "none",
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
					disableAutoResizing
					onReady={onReady}
				/>
			</Box>
		</SchemaEditorDndProvider>
	);
}
