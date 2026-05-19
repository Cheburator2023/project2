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
	type IDockviewPanelProps,
} from "dockview-react";
import "dockview/dist/styles/dockview.css";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";
import { TAB_HEADINGS } from "./constants";
import { SchemaPalettePanel } from "./components/SchemaCanvasDnd";
import { SchemaEditorDndProvider } from "./components/SchemaEditorDndProvider";
import { SchemaPropertiesPanel } from "./panels/SchemaPropertiesPanel";
import { useSchemaEditorDock } from "./SchemaEditorDockContext";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../testIds";
import {
	SCHEMA_TREE_PANEL_ID,
	workspacePanelComponents,
} from "./workspacePanels";

function PanelHost({
	children,
	dataTestId,
}: {
	children: ReactNode;
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
			}}
		>
			{children}
		</Box>
	);
}

function PalettePanel(_props: IDockviewPanelProps) {
	return (
		<PanelHost dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.panelPalette}>
			<SchemaPalettePanel />
		</PanelHost>
	);
}

function PropertiesPanel(_props: IDockviewPanelProps) {
	return (
		<PanelHost dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.panelProperties}>
			<SchemaPropertiesPanel />
		</PanelHost>
	);
}

const components = {
	...workspacePanelComponents,
	palette: PalettePanel,
	properties: PropertiesPanel,
};

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
		id: "palette",
		component: "palette",
		title: "Типы полей",
		position: { direction: "left", referencePanel: firstTab[0] },
		initialWidth: 220,
	});

	api.addPanel({
		id: "properties",
		component: "properties",
		title: "Свойства",
		position: { direction: "right", referencePanel: firstTab[0] },
		initialWidth: 300,
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
						components={components}
						defaultTabComponent={DockTabNoClose}
						onReady={onReady}
					/>
				</Box>
			</SchemaEditorDndProvider>
		</Box>
	);
}
