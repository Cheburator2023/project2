import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	type ReactNode,
} from "react";
import type { DockviewApi, DockviewIDisposable } from "dockview-react";
import type { SchemaEditorMainTab } from "./types";
import { ensureDockPanel } from "./schemaEditorDockLayout.util";
import { useSchemaEditorUiStore } from "./schemaEditorUiStore";
import { WORKSPACE_PANEL_IDS } from "./workspacePanels";

type SchemaEditorDockContextValue = {
	registerDockApi: (api: DockviewApi | null) => void;
	registerResetDockLayout: (reset: (() => void) | null) => void;
	resetDockLayout: () => void;
	activateMainTab: (tab: SchemaEditorMainTab) => void;
	getOpenPanelIds: () => SchemaEditorMainTab[];
	updatePanelTitle: (panelId: string, title: string) => void;
};

const SchemaEditorDockContext = createContext<SchemaEditorDockContextValue | null>(
	null,
);

const SUPPRESS_DOCK_SYNC_MS = 400;

function isWorkspacePanelId(id: string): id is SchemaEditorMainTab {
	return (WORKSPACE_PANEL_IDS as readonly string[]).includes(id);
}

function syncMainTabFromActivePanel(
	api: DockviewApi,
	onMainTabChange: (tab: SchemaEditorMainTab) => void,
) {
	const id = api.activePanel?.id;
	if (!id || !isWorkspacePanelId(id)) {
		return;
	}
	onMainTabChange(id);
}

export function SchemaEditorDockProvider({ children }: { children: ReactNode }) {
	const mainTab = useSchemaEditorUiStore((s) => s.mainTab);
	const setMainTab = useSchemaEditorUiStore((s) => s.setMainTab);
	const syncMainTabFromDock = useSchemaEditorUiStore((s) => s.syncMainTabFromDock);
	const registerDockActivateMainTab = useSchemaEditorUiStore(
		(s) => s.registerDockActivateMainTab,
	);

	const apiRef = useRef<DockviewApi | null>(null);
	const resetDockLayoutRef = useRef<(() => void) | null>(null);
	const activePanelDisposableRef = useRef<DockviewIDisposable | null>(null);
	const dragDisposableRef = useRef<DockviewIDisposable[]>([]);
	const syncingFromDockRef = useRef(false);
	const syncingFromStateRef = useRef(false);
	const dockDraggingRef = useRef(false);
	const suppressDockSyncUntilRef = useRef(0);
	const mainTabRef = useRef(mainTab);
	mainTabRef.current = mainTab;

	const activateMainTab = useCallback(
		(tab: SchemaEditorMainTab) => {
			suppressDockSyncUntilRef.current = Date.now() + SUPPRESS_DOCK_SYNC_MS;

			const api = apiRef.current;
			if (!api) {
				setMainTab(tab);
				return;
			}

			const panel = ensureDockPanel(api, tab) ?? api.getPanel(tab);
			if (!panel) {
				setMainTab(tab);
				return;
			}

			if (panel.api.isActive && mainTabRef.current === tab) {
				return;
			}

			syncingFromStateRef.current = true;
			panel.api.setActive();
			setMainTab(tab);
			syncingFromStateRef.current = false;
		},
		[setMainTab],
	);

	useEffect(() => {
		registerDockActivateMainTab(activateMainTab);
		return () => registerDockActivateMainTab(null);
	}, [activateMainTab, registerDockActivateMainTab]);

	const endDockDrag = useCallback(() => {
		if (!dockDraggingRef.current) return;

		dockDraggingRef.current = false;
		window.removeEventListener("pointerup", endDockDrag, true);
		window.removeEventListener("dragend", endDockDrag, true);

		const api = apiRef.current;
		if (!api) return;

		syncingFromDockRef.current = true;
		syncMainTabFromActivePanel(api, syncMainTabFromDock);
		syncingFromDockRef.current = false;
	}, [syncMainTabFromDock]);

	const beginDockDrag = useCallback(() => {
		if (dockDraggingRef.current) return;

		dockDraggingRef.current = true;
		window.addEventListener("pointerup", endDockDrag, true);
		window.addEventListener("dragend", endDockDrag, true);
	}, [endDockDrag]);

	const getOpenPanelIds = useCallback((): SchemaEditorMainTab[] => {
		const api = apiRef.current;
		if (!api) return [];

		return api.panels
			.map((panel) => panel.id)
			.filter((id): id is SchemaEditorMainTab => isWorkspacePanelId(id));
	}, []);

	const registerResetDockLayout = useCallback((reset: (() => void) | null) => {
		resetDockLayoutRef.current = reset;
	}, []);

	const resetDockLayout = useCallback(() => {
		resetDockLayoutRef.current?.();
	}, []);

	const updatePanelTitle = useCallback((panelId: string, title: string) => {
		apiRef.current?.getPanel(panelId)?.api.setTitle(title);
	}, []);

	const registerDockApi = useCallback(
		(api: DockviewApi | null) => {
			activePanelDisposableRef.current?.dispose();
			activePanelDisposableRef.current = null;
			for (const disposable of dragDisposableRef.current) {
				disposable.dispose();
			}
			dragDisposableRef.current = [];
			window.removeEventListener("pointerup", endDockDrag, true);
			window.removeEventListener("dragend", endDockDrag, true);
			dockDraggingRef.current = false;
			apiRef.current = api;

			if (!api) {
				return;
			}

			const panel =
				ensureDockPanel(api, mainTabRef.current) ??
				api.getPanel(mainTabRef.current);
			if (panel && !panel.api.isActive) {
				syncingFromStateRef.current = true;
				panel.api.setActive();
				syncingFromStateRef.current = false;
			}

			activePanelDisposableRef.current = api.onDidActivePanelChange((panel) => {
				if (syncingFromStateRef.current || dockDraggingRef.current) return;
				if (Date.now() < suppressDockSyncUntilRef.current) return;

				const id = panel?.id;
				if (!id || !isWorkspacePanelId(id)) {
					return;
				}

				syncingFromDockRef.current = true;
				syncMainTabFromDock(id);
				syncingFromDockRef.current = false;
			});

			dragDisposableRef.current = [
				api.onWillDragPanel(() => {
					beginDockDrag();
				}),
				api.onWillDragGroup(() => {
					beginDockDrag();
				}),
			];
		},
		[beginDockDrag, endDockDrag, syncMainTabFromDock],
	);

	useEffect(() => {
		const api = apiRef.current;
		if (!api || syncingFromDockRef.current || dockDraggingRef.current) return;

		const panel = ensureDockPanel(api, mainTab) ?? api.getPanel(mainTab);
		if (!panel || panel.api.isActive) return;

		syncingFromStateRef.current = true;
		panel.api.setActive();
		syncingFromStateRef.current = false;
	}, [mainTab]);

	useEffect(() => {
		return () => {
			activePanelDisposableRef.current?.dispose();
			for (const disposable of dragDisposableRef.current) {
				disposable.dispose();
			}
			window.removeEventListener("pointerup", endDockDrag, true);
			window.removeEventListener("dragend", endDockDrag, true);
		};
	}, [endDockDrag]);

	const value: SchemaEditorDockContextValue = {
		registerDockApi,
		registerResetDockLayout,
		resetDockLayout,
		activateMainTab,
		getOpenPanelIds,
		updatePanelTitle,
	};

	return (
		<SchemaEditorDockContext.Provider value={value}>
			{children}
		</SchemaEditorDockContext.Provider>
	);
}

export function useSchemaEditorDock(): SchemaEditorDockContextValue {
	const ctx = useContext(SchemaEditorDockContext);
	if (!ctx) {
		throw new Error("useSchemaEditorDock must be used within SchemaEditorDockProvider");
	}
	return ctx;
}
