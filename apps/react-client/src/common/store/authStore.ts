import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
	accessToken: string | null;
	setAccessToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set) => ({
			accessToken: null,
			setAccessToken: (token) => set({ accessToken: token }),
		}),
		{
			name: "auth-storage",
		},
	),
);
