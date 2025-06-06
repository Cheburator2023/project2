import { GridApi } from "ag-grid-community";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GlobalSettingsState {
	isSideMenuVisible: boolean;
	toggleSideMenu: () => void;
	gridApi: GridApi | null;
	setGridApi: (api: GridApi | null) => void;
}

export const useGlobalSettingsStore = create<GlobalSettingsState>()(
	persist(
		(set) => ({
			isSideMenuVisible: true,
			toggleSideMenu: () =>
				set((state) => ({ isSideMenuVisible: !state.isSideMenuVisible })),
			gridApi: null,
			setGridApi: (api: GridApi | null) => set({ gridApi: api }),
		}),
		{
			name: "useGlobalSettings-storage",
		},
	),
);
