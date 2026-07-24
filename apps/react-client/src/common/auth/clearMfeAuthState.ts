import { useAuthStore } from "@react-client/common/store/authStore";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { useUserStore } from "@react-client/common/store/userStore";

/** Сбрасывает локальное auth-состояние MFE (zustand + window). */
export function clearMfeAuthState(): void {
	useAuthStore.getState().setAccessToken(null);
	useGlobalSettingsStore.getState().setUser(undefined);

	const { setUsername, setGroups, setRoles, setPermissions } =
		useUserStore.getState();
	setUsername("");
	setGroups([]);
	setRoles([]);
	setPermissions([]);
	useUserStore.getState().setProfileHydrated(false);

	if (typeof window === "undefined") {
		return;
	}

	window.token = undefined;
	window.user = undefined;

	if (typeof document !== "undefined") {
		document.cookie = "token=; Max-Age=0; path=/";
	}
}
