import {
	normalizeStreamBlockRole,
	normalizeV2UserGroups,
	resolveV2AnketaViewerStreamsFromGroups,
	V2_ANKETA_VIEWER_ROLE_CODES,
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
	const known = new Set<string>(V2_ANKETA_VIEWER_ROLE_CODES as readonly string[]);
	const roles = [
		...new Set(
			normalized
				.map((group) => normalizeStreamBlockRole(group) ?? group.trim())
				.filter((code) => known.has(code)),
		),
	];
	return {
		roles,
		streams: resolveV2AnketaViewerStreamsFromGroups(groups),
	};
}
