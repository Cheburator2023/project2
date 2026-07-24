import type { T_KEYCLOAK_USER } from "types";
import {
	Permission,
	Role,
	type UserPermissions,
	type UserRoles,
} from "@react-client/types/roles";
import { normalizeV2UserGroups } from "@smart-anketa/api-contract";
import { useUserStore } from "@react-client/common/store/userStore";

/** Пишет groups/roles/permissions из Keycloak user в zustand (+ profileHydrated). */
export function applyKeycloakUserToStore(
	user: T_KEYCLOAK_USER | null | undefined,
): void {
	const {
		setUsername,
		setGroups,
		setRoles,
		setPermissions,
		setProfileHydrated,
	} = useUserStore.getState();

	if (!user) {
		setUsername("");
		setGroups([]);
		setRoles([]);
		setPermissions([]);
		setProfileHydrated(false);
		return;
	}

	setUsername(
		typeof user.preferred_username === "string" ? user.preferred_username : "",
	);

	const groups = Array.isArray(user.groups) ? user.groups : [];
	setGroups(groups);

	const roleValues = new Set(Object.values(Role) as string[]);
	const roles = [
		...new Set(
			normalizeV2UserGroups(groups).filter((group) => roleValues.has(group)),
		),
	] as UserRoles;
	setRoles(roles);

	const realmRoles = user.realm_access?.roles ?? [];
	const permissions = realmRoles.filter((permission) =>
		Object.values(Permission).includes(permission as Permission),
	) as UserPermissions;
	setPermissions(permissions);
	setProfileHydrated(true);
}
