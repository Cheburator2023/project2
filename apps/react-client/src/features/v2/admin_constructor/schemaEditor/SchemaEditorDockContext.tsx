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
import { WORKSPACE_PANEL_IDS } from "./workspacePanels";

type SchemaEditorDockContextValue = {
	registerDockApi: (api: DockviewApi | null) => void;
	registerResetDockLayout: (reset: (() => void) | null) => void;
	resetDockLayout: () => void;
	activateMainTab: (tab: SchemaEditorMainTab) => void;
	updatePanelTitle: (panelId: string, title: string) => void;
};

const SchemaEditorDockContext = createContext<SchemaEditorDockContextValue | null>(
	null,
);

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

export function SchemaEditorDockProvider({
	mainTab,
	onMainTabChange,
	children,
}: {
	mainTab: SchemaEditorMainTab;
	onMainTabChange: (tab: SchemaEditorMainTab) => void;
	children: ReactNode;
}) {
	const apiRef = useRef<DockviewApi | null>(null);
	const resetDockLayoutRef = useRef<(() => void) | null>(null);
	const activePanelDisposableRef = useRef<DockviewIDisposable | null>(null);
	const dragDisposableRef = useRef<DockviewIDisposable[]>([]);
	const syncingFromDockRef = useRef(false);
	const syncingFromStateRef = useRef(false);
	const dockDraggingRef = useRef(false);
	const mainTabRef = useRef(mainTab);
	mainTabRef.current = mainTab;
	const onMainTabChangeRef = useRef(onMainTabChange);
	onMainTabChangeRef.current = onMainTabChange;

	const endDockDrag = useCallback(() => {
		if (!dockDraggingRef.current) return;

		dockDraggingRef.current = false;
		window.removeEventListener("pointerup", endDockDrag, true);
		window.removeEventListener("dragend", endDockDrag, true);

		const api = apiRef.current;
		if (!api) return;

		syncingFromDockRef.current = true;
		syncMainTabFromActivePanel(api, onMainTabChangeRef.current);
		syncingFromDockRef.current = false;
	}, []);

	const beginDockDrag = useCallback(() => {
		if (dockDraggingRef.current) return;

		dockDraggingRef.current = true;
		window.addEventListener("pointerup", endDockDrag, true);
		window.addEventListener("dragend", endDockDrag, true);
	}, [endDockDrag]);

	const activateMainTab = useCallback((tab: SchemaEditorMainTab) => {
		const panel = apiRef.current?.getPanel(tab);
		if (!panel) return;
		syncingFromStateRef.current = true;
		panel.api.setActive();
		onMainTabChangeRef.current(tab);
		syncingFromStateRef.current = false;
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

			const panel = api.getPanel(mainTabRef.current);
			if (panel && !panel.api.isActive) {
				syncingFromStateRef.current = true;
				panel.api.setActive();
				syncingFromStateRef.current = false;
			}

			activePanelDisposableRef.current = api.onDidActivePanelChange((panel) => {
				if (syncingFromStateRef.current || dockDraggingRef.current) return;

				const id = panel?.id;
				if (!id || !isWorkspacePanelId(id)) {
					return;
				}

				syncingFromDockRef.current = true;
				onMainTabChangeRef.current(id);
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
		[beginDockDrag, endDockDrag],
	);

	useEffect(() => {
		const api = apiRef.current;
		if (!api || syncingFromDockRef.current || dockDraggingRef.current) return;

		const panel = api.getPanel(mainTab);
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
