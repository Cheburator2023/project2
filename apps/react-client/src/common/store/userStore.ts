import { create } from "zustand";
import {
	Permission,
	Role,
	UserPermissions,
	UserRoles,
} from "../../types/roles";

interface UserStoreState {
	username: string | null;
	roles: UserRoles;
	permissions: UserPermissions;
	setUsername: (username: string) => void;
	setRoles: (roles: UserRoles) => void;
	setPermissions: (permissions: UserPermissions) => void;
	hasRole: (role: Role) => boolean;
	hasPermission: (permission: Permission) => boolean;
}

export const useUserStore = create<UserStoreState>((set, get) => ({
	username: null,
	roles: [],
	permissions: [],
	setUsername: (username) => set({ username }),
	setRoles: (roles) => set({ roles }),
	setPermissions: (permissions) => set({ permissions }),
	hasRole: (role) => get().roles.includes(role),
	hasPermission: (permission) => get().permissions.includes(permission),
}));
