import {
	Permission,
	Role,
	UserPermissions,
	UserRoles,
} from "@react-client/types/roles";
import { isNoRolesGodMode } from "@react-client/common/auth/godMode";
import { create, StoreApi, UseBoundStore } from "zustand";

const NO_ROLES_FOR_DEV = isNoRolesGodMode();

interface UserStoreState {
	username: string | null;
	groups: string[];
	roles: UserRoles;
	permissions: UserPermissions;
	/**
	 * Профиль из Keycloak (groups/roles/permissions) уже применён в store.
	 * До этого редиректы с `/` и PermissionGuard не должны решать «первую страницу»
	 * — иначе в development `canAccessTracker` уводит в трекер раньше реестра.
	 */
	profileHydrated: boolean;
	setUsername: (username: string) => void;
	setGroups: (roles: string[]) => void;
	setRoles: (role: UserRoles) => void;
	setPermissions: (permissions: UserPermissions) => void;
	setProfileHydrated: (hydrated: boolean) => void;
	hasRole: (role: Role) => boolean;
	hasPermission: (permission: Permission) => boolean;
	hasPermissions: (permissionList: Permission[]) => boolean;
}

export const useUserStore: UseBoundStore<StoreApi<UserStoreState>> =
	create<UserStoreState>((set) => ({
		username: null,
		groups: [],
		roles: [],
		permissions: [],
		profileHydrated: NO_ROLES_FOR_DEV,
		setUsername: (username: string) => set({ username }),
		setGroups: (groups: string[]) => set({ groups }),
		setRoles: (roles: UserRoles) => set({ roles }),
		setPermissions: (permissions: UserPermissions) => set({ permissions }),
		setProfileHydrated: (profileHydrated: boolean) => set({ profileHydrated }),
		hasRole: (role: Role) => {
			const { roles } = useUserStore.getState();
			return NO_ROLES_FOR_DEV ? true : roles.includes(role);
		},
		hasPermission: (permission: Permission) => {
			const { permissions } = useUserStore.getState();
			return NO_ROLES_FOR_DEV ? true : permissions.includes(permission);
		},
		hasPermissions: (permissionList: Permission[]) => {
			const { permissions } = useUserStore.getState();
			return NO_ROLES_FOR_DEV
				? true
				: permissionList.some((permission) => permissions.includes(permission));
		},
	}));
