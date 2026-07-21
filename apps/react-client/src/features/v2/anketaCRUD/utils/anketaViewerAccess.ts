import type { V2AnketaViewerAccessContext } from "@smart-anketa/api-contract";
import {
	resolveV2UserImplementationStreamsFromGroups,
} from "@smart-anketa/api-contract";
import { useUserStore } from "@react-client/common/store/userStore";
import { useMemo } from "react";

export type AnketaViewerAccess = V2AnketaViewerAccessContext & {
	applyAccessRules: boolean;
};

export function buildAnketaViewerAccessFromStore(
	groups: readonly string[],
	roles: readonly string[],
	applyAccessRules: boolean,
): AnketaViewerAccess {
	return {
		roles,
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
