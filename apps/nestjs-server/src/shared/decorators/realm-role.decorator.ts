import { Roles } from "nest-keycloak-connect";
import { Permission } from "src/shared/types/permissions";

export function RealmRole(role: Permission) {
	return Roles(`realm:${role}`);
}
