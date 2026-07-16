import { create } from "zustand";
import type { V2LogicWorkspaceTab } from "@smart-anketa/api-contract";
import type { TypicalWorkNavFocus } from "./schemaEditorIssueNavigation";
import {
	readStoredSchemaEditorMainTab,
	writeStoredSchemaEditorMainTab,
} from "./schemaEditorMainTabStorage";
import type { SchemaEditorMainTab } from "./types";

type DockActivateFn = (tab: SchemaEditorMainTab) => void;

type SchemaEditorUiState = {
	templateId: string | null;
	mainTab: SchemaEditorMainTab;
	logicWorkspaceTab: V2LogicWorkspaceTab;
	typicalWorkNavFocus: TypicalWorkNavFocus | null;
	selectedTypicalWorkId: string | null;
	dockActivateMainTab: DockActivateFn | null;

	initForTemplate: (templateId: string) => void;
	setMainTab: (tab: SchemaEditorMainTab) => void;
	syncMainTabFromDock: (tab: SchemaEditorMainTab) => void;
	setLogicWorkspaceTab: (tab: V2LogicWorkspaceTab) => void;
	setTypicalWorkNavFocus: (focus: TypicalWorkNavFocus | null) => void;
	setSelectedTypicalWorkId: (workId: string | null) => void;
	clearTypicalWorkNavFocus: () => void;
	prepareTypicalWorkNavigation: (
		workId?: string,
		focus?: Omit<TypicalWorkNavFocus, "workId">,
	) => void;
	registerDockActivateMainTab: (fn: DockActivateFn | null) => void;
	activateMainTab: (tab: SchemaEditorMainTab) => void;
};

export const useSchemaEditorUiStore = create<SchemaEditorUiState>((set, get) => ({
	templateId: null,
	mainTab: "designer",
	logicWorkspaceTab: "works",
	typicalWorkNavFocus: null,
	selectedTypicalWorkId: null,
	dockActivateMainTab: null,

	initForTemplate: (templateId) => {
		const state = get();
		if (state.templateId === templateId) {
			return;
		}
		const stored = readStoredSchemaEditorMainTab(templateId);
		set({
			templateId,
			mainTab: stored ?? "designer",
			logicWorkspaceTab: "works",
			typicalWorkNavFocus: null,
			selectedTypicalWorkId: null,
		});
	},

	setMainTab: (tab) => {
		const { templateId, mainTab } = get();
		if (mainTab === tab) return;
		if (templateId) writeStoredSchemaEditorMainTab(templateId, tab);
		set({ mainTab: tab });
	},

	syncMainTabFromDock: (tab) => {
		get().setMainTab(tab);
	},

	setLogicWorkspaceTab: (tab) => set({ logicWorkspaceTab: tab }),

	setTypicalWorkNavFocus: (focus) => set({ typicalWorkNavFocus: focus }),

	setSelectedTypicalWorkId: (workId) => set({ selectedTypicalWorkId: workId }),

	clearTypicalWorkNavFocus: () => set({ typicalWorkNavFocus: null }),

	prepareTypicalWorkNavigation: (workId, focus) => {
		if (workId) {
			set({
				logicWorkspaceTab: "works",
				typicalWorkNavFocus: {
					workId,
					paramCode: focus?.paramCode,
				},
				selectedTypicalWorkId: workId,
			});
		} else {
			set({
				logicWorkspaceTab: "works",
				typicalWorkNavFocus: null,
			});
		}
	},

	registerDockActivateMainTab: (fn) => set({ dockActivateMainTab: fn }),

	activateMainTab: (tab) => {
		const dockFn = get().dockActivateMainTab;
		if (dockFn) {
			dockFn(tab);
			return;
		}
		get().setMainTab(tab);
	},
}));
