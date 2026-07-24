import type { V2AnketaViewerAccessContext } from "@smart-anketa/api-contract";
import {
	normalizeStreamBlockRole,
	normalizeV2UserGroups,
	resolveV2UserImplementationStreamsFromGroups,
	V2_ANKETA_VIEWER_ROLE_CODES,
} from "@smart-anketa/api-contract";
import { useUserStore } from "@react-client/common/store/userStore";
import { useMemo } from "react";

export type AnketaViewerAccess = V2AnketaViewerAccessContext & {
	applyAccessRules: boolean;
};

function resolveViewerRoles(
	groups: readonly string[],
	storeRoles: readonly string[],
): string[] {
	const known = new Set<string>(V2_ANKETA_VIEWER_ROLE_CODES as readonly string[]);
	const fromGroups = normalizeV2UserGroups(groups)
		.map((group) => normalizeStreamBlockRole(group) ?? group.trim())
		.filter((code) => known.has(code));
	return [...new Set([...storeRoles, ...fromGroups])];
}

export function buildAnketaViewerAccessFromStore(
	groups: readonly string[],
	roles: readonly string[],
	applyAccessRules: boolean,
): AnketaViewerAccess {
	return {
		roles: resolveViewerRoles(groups, roles),
		streams: resolveV2UserImplementationStreamsFromGroups(groups),
		applyAccessRules,
	};
}

export function useAnketaViewerAccess(
	applyAccessRules = true,
): AnketaViewerAccess {
	const groups = useUserStore((state) => state.groups);
	const roles = useUserStore((state) => state.roles);
	return useMemo(
		() => buildAnketaViewerAccessFromStore(groups, roles, applyAccessRules),
		[applyAccessRules, groups, roles],
	);
}
