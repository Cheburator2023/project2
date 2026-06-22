import type { GridApi } from "ag-grid-community";
import type { T_CONFIG_MAP, T_KEYCLOAK_USER } from "types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GlobalSettingsState {
	isSideMenuVisible: boolean;
	gridApi: GridApi | null;
	user: T_KEYCLOAK_USER | undefined;
	configMap?: T_CONFIG_MAP;
	toggleSideMenu: () => void;
	setGridApi: (api: GridApi | null) => void;
	setUser: (user?: T_KEYCLOAK_USER) => void;
	setConfigMap: (configMap?: T_CONFIG_MAP) => void;
}

export const useGlobalSettingsStore = create<GlobalSettingsState>()(
	persist(
		(set) => ({
			isSideMenuVisible: true,
			gridApi: null,
			user: undefined,
			configMap: undefined,
			toggleSideMenu: () =>
				set((state) => ({ isSideMenuVisible: !state.isSideMenuVisible })),
			setGridApi: (api: GridApi | null) => set({ gridApi: api }),
			setUser: (user?: T_KEYCLOAK_USER) => set({ user }),
			setConfigMap: (configMap?: T_CONFIG_MAP) => set({ configMap }),
		}),
		{
			name: "useGlobalSettings-storage",
			partialize: (state) => ({
				isSideMenuVisible: state.isSideMenuVisible,
			}),
		},
	),
);
