import { SetMetadata } from "@nestjs/common";

export const DOMAIN_ROLES_KEY = "domain_roles";

/**
 * Доступ по доменной группе AD/Keycloak
 * (sum_appadmin / test_sum_appadmin → appadmin, sum_sacfg → sacfg),
 * а не по выдуманным anketa_* permission.
 */
export const DomainRoles = (...roles: string[]) =>
	SetMetadata(DOMAIN_ROLES_KEY, roles);
