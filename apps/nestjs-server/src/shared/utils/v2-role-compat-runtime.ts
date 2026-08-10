import type { V2RoleCompatOptions } from "@smart-anketa/api-contract";

/**
 * Процессный кэш совместимости ролей (env ⊕ DB override).
 * DomainRolesGuard / sync читают sync; V2RuntimeSettingsService обновляет.
 */
let cached: V2RoleCompatOptions = {
	adminItAsAppadmin: process.env.ADMIN_IT_AS_APPADMIN !== "false",
	allowNestedLeadGroups: process.env.ALLOW_NESTED_LEAD_GROUPS !== "false",
};

export function getV2RoleCompatRuntime(): V2RoleCompatOptions {
	return cached;
}

export function setV2RoleCompatRuntime(next: V2RoleCompatOptions): void {
	cached = {
		adminItAsAppadmin: next.adminItAsAppadmin !== false,
		allowNestedLeadGroups: next.allowNestedLeadGroups !== false,
	};
}

export function resetV2RoleCompatRuntimeFromEnv(): void {
	cached = {
		adminItAsAppadmin: process.env.ADMIN_IT_AS_APPADMIN !== "false",
		allowNestedLeadGroups: process.env.ALLOW_NESTED_LEAD_GROUPS !== "false",
	};
}
