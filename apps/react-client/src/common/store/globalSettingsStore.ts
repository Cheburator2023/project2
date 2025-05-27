import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GlobalSettingsState {
	isSideMenuVisible: boolean;
	toggleSideMenu: () => void;
}

export const useGlobalSettingsStore = create<GlobalSettingsState>()(
	persist(
		(set) => ({
			isSideMenuVisible: true,
			toggleSideMenu: () =>
				set((state) => ({ isSideMenuVisible: !state.isSideMenuVisible })),
		}),
		{
			name: "useGlobalSettings-storage",
		},
	),
);
