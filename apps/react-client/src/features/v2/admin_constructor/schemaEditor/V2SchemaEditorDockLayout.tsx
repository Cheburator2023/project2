import Box from "@mui/material/Box";
import { useColorScheme } from "@mui/material/styles";
import {
	DockviewDefaultTab,
	DockviewReact,
	themeDark,
	themeLight,
	type DockviewApi,
	type DockviewReadyEvent,
	type DockviewIDisposable,
	type IDockviewPanelHeaderProps,
} from "dockview-react";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { SchemaEditorDockHeaderRightActions } from "./SchemaEditorDockHeaderActions";
import { useSchemaEditorDock } from "./SchemaEditorDockContext";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../testIds";
import { workspacePanelComponents } from "./workspacePanels";
import {
	buildDefaultDockLayout,
	clearSchemaEditorDockLayoutStorage,
	restoreSchemaEditorDockLayout,
	writeSchemaEditorDockLayout,
} from "./schemaEditorDockLayout.util";
import {
	layoutDockviewToContainer,
	useDockviewStableLayout,
} from "./useDockviewStableLayout";

const LAYOUT_SAVE_DEBOUNCE_MS = 350;

function DockTabNoClose(props: IDockviewPanelHeaderProps) {
	return <DockviewDefaultTab {...props} hideClose />;
}

export function V2SchemaEditorDockLayout() {
	const { mode } = useColorScheme();
	const { registerDockApi, registerResetDockLayout } = useSchemaEditorDock();
	const containerRef = useRef<HTMLDivElement | null>(null);
	const dockApiRef = useRef<DockviewApi | null>(null);
	const layoutPersistenceReadyRef = useRef(false);
	const layoutSaveTimerRef = useRef<number | null>(null);
	const layoutChangeDisposableRef = useRef<DockviewIDisposable | null>(null);

	const dockTheme = useMemo(
		() => (mode === "dark" ? themeDark : themeLight),
		[mode],
	);

	useDockviewStableLayout(containerRef, dockApiRef);

	const schedulePersistLayout = useCallback((api: DockviewApi) => {
		if (!layoutPersistenceReadyRef.current) return;
		if (layoutSaveTimerRef.current != null) {
			window.clearTimeout(layoutSaveTimerRef.current);
		}
		layoutSaveTimerRef.current = window.setTimeout(() => {
			writeSchemaEditorDockLayout(api.toJSON());
		}, LAYOUT_SAVE_DEBOUNCE_MS);
	}, []);

	const applyInitialLayout = useCallback((api: DockviewApi) => {
		layoutPersistenceReadyRef.current = false;

		const restored = restoreSchemaEditorDockLayout(api);
		if (!restored) {
			buildDefaultDockLayout(api);
		}

		const el = containerRef.current;
		if (el) {
			requestAnimationFrame(() => {
				layoutDockviewToContainer(api, el);
				layoutPersistenceReadyRef.current = true;
			});
			return;
		}

		layoutPersistenceReadyRef.current = true;
	}, []);

	const resetDockLayout = useCallback(() => {
		const api = dockApiRef.current;
		const el = containerRef.current;
		if (!api) return;

		layoutPersistenceReadyRef.current = false;
		clearSchemaEditorDockLayoutStorage();
		buildDefaultDockLayout(api);
		if (el) {
			requestAnimationFrame(() => {
				layoutDockviewToContainer(api, el);
				layoutPersistenceReadyRef.current = true;
				writeSchemaEditorDockLayout(api.toJSON());
			});
			return;
		}

		layoutPersistenceReadyRef.current = true;
		writeSchemaEditorDockLayout(api.toJSON());
	}, []);

	const onReady = useCallback(
		(event: DockviewReadyEvent) => {
			dockApiRef.current = event.api;
			registerDockApi(event.api);

			layoutChangeDisposableRef.current?.dispose();
			layoutChangeDisposableRef.current = event.api.onDidLayoutChange(() => {
				schedulePersistLayout(event.api);
			});

			if (event.api.totalPanels === 0) {
				applyInitialLayout(event.api);
				return;
			}

			layoutPersistenceReadyRef.current = true;
			const el = containerRef.current;
			if (el) {
				requestAnimationFrame(() => {
					layoutDockviewToContainer(event.api, el);
				});
			}
		},
		[applyInitialLayout, registerDockApi, schedulePersistLayout],
	);

	useEffect(() => {
		registerResetDockLayout(resetDockLayout);
		return () => registerResetDockLayout(null);
	}, [registerResetDockLayout, resetDockLayout]);

	useEffect(() => {
		return () => {
			layoutPersistenceReadyRef.current = false;
			if (layoutSaveTimerRef.current != null) {
				window.clearTimeout(layoutSaveTimerRef.current);
			}
			layoutChangeDisposableRef.current?.dispose();
			layoutChangeDisposableRef.current = null;
			dockApiRef.current = null;
			registerDockApi(null);
		};
	}, [registerDockApi]);

	return (
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
	);
}
