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
	activateMainTab: (tab: SchemaEditorMainTab) => void;
};

const SchemaEditorDockContext = createContext<SchemaEditorDockContextValue | null>(
	null,
);

function isWorkspacePanelId(id: string): id is SchemaEditorMainTab {
	return (WORKSPACE_PANEL_IDS as readonly string[]).includes(id);
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
	const activePanelDisposableRef = useRef<DockviewIDisposable | null>(null);
	const syncingFromDockRef = useRef(false);
	const syncingFromStateRef = useRef(false);
	const mainTabRef = useRef(mainTab);
	mainTabRef.current = mainTab;
	const onMainTabChangeRef = useRef(onMainTabChange);
	onMainTabChangeRef.current = onMainTabChange;

	const activateMainTab = useCallback((tab: SchemaEditorMainTab) => {
		const panel = apiRef.current?.getPanel(tab);
		if (!panel) return;
		syncingFromStateRef.current = true;
		panel.api.setActive();
		onMainTabChangeRef.current(tab);
		syncingFromStateRef.current = false;
	}, []);

	const registerDockApi = useCallback((api: DockviewApi | null) => {
		activePanelDisposableRef.current?.dispose();
		activePanelDisposableRef.current = null;
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
			if (syncingFromStateRef.current) return;

			const id = panel?.id;
			if (!id || !isWorkspacePanelId(id)) {
				return;
			}

			syncingFromDockRef.current = true;
			onMainTabChangeRef.current(id);
			syncingFromDockRef.current = false;
		});
	}, []);

	useEffect(() => {
		const api = apiRef.current;
		if (!api || syncingFromDockRef.current) return;

		const panel = api.getPanel(mainTab);
		if (!panel || panel.api.isActive) return;

		syncingFromStateRef.current = true;
		panel.api.setActive();
		syncingFromStateRef.current = false;
	}, [mainTab]);

	useEffect(() => {
		return () => {
			activePanelDisposableRef.current?.dispose();
		};
	}, []);

	const value: SchemaEditorDockContextValue = {
		registerDockApi,
		activateMainTab,
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
