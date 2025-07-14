import {
	Permission,
	Role,
	UserPermissions,
	UserRoles,
} from "@react-client/types/roles";
import { create, StoreApi, UseBoundStore } from "zustand";

const NO_ROLES_FOR_DEV = process?.env?.NO_ROLES;

interface UserStoreState {
	username: string | null;
	groups: string[];
	roles: UserRoles;
	permissions: UserPermissions;
	setUsername: (username: string) => void;
	setGroups: (roles: string[]) => void;
	setRoles: (role: UserRoles) => void;
	setPermissions: (permissions: UserPermissions) => void;
	hasRole: (role: Role) => boolean;
	hasPermission: (permission: Permission) => boolean;
}

export const useUserStore: UseBoundStore<StoreApi<UserStoreState>> =
	create<UserStoreState>((set) => ({
		username: null,
		groups: [],
		roles: [],
		permissions: [],
		setUsername: (username: string) => set({ username }),
		setGroups: (groups: string[]) => set({ groups }),
		setRoles: (roles: UserRoles) => set({ roles }),
		setPermissions: (permissions: UserPermissions) => set({ permissions }),
		hasRole: (role: Role) => {
			const { roles } = useUserStore.getState();
			return NO_ROLES_FOR_DEV ? true : roles.includes(role);
		},
		hasPermission: (permission: Permission) => {
			const { permissions } = useUserStore.getState();
			return NO_ROLES_FOR_DEV ? true : permissions.includes(permission);
		},
	}));
