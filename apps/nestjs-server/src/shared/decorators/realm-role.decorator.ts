import { Roles } from "nest-keycloak-connect";
import { Permission } from "src/shared/types/permissions";

export function RealmRole(...roles: Permission[]) {
	return Roles(...roles.map((role) => `realm:${role}`));
}
