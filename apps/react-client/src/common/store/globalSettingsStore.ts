import type { GridApi } from "ag-grid-community";
import type { T_KEYCLOAK_USER } from "types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GlobalSettingsState {
	isSideMenuVisible: boolean;
	toggleSideMenu: () => void;
	gridApi: GridApi | null;
	setGridApi: (api: GridApi | null) => void;
	user: T_KEYCLOAK_USER | undefined;
	setUser: (user: any) => void;
	onLogout?: () => void;
}

export const useGlobalSettingsStore = create<GlobalSettingsState>()(
	persist(
		(set) => ({
			isSideMenuVisible: true,
			onLogout: () => {},
			toggleSideMenu: () =>
				set((state) => ({ isSideMenuVisible: !state.isSideMenuVisible })),
			gridApi: null,
			setGridApi: (api: GridApi | null) => set({ gridApi: api }),
			user: undefined,
			setUser: (user: T_KEYCLOAK_USER) => set({ user }),
		}),
		{
			name: "useGlobalSettings-storage",
		},
	),
);
