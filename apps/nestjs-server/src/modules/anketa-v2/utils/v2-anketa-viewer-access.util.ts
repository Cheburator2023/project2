import {
	isV2StreamBlockRoleCode,
	normalizeStreamBlockRole,
	normalizeV2UserGroups,
	resolveV2UserImplementationStreamsFromGroups,
	type V2AnketaViewerAccessContext,
} from "@smart-anketa/api-contract";

type UserWithGroups = {
	groups?: string[];
};

export function buildV2AnketaViewerAccessFromUser(
	user: UserWithGroups | undefined,
): V2AnketaViewerAccessContext | undefined {
	const groups = user?.groups;
	if (!Array.isArray(groups) || groups.length === 0) {
		return undefined;
	}
	const normalized = normalizeV2UserGroups(groups);
	const roles = normalized
		.map((group) => normalizeStreamBlockRole(group))
		.filter(
			(code): code is NonNullable<typeof code> =>
				code != null && isV2StreamBlockRoleCode(code),
		);
	return {
		roles,
		streams: resolveV2UserImplementationStreamsFromGroups(groups),
	};
}
