import {
	V2_IMPLEMENTATION_STREAM_CODES,
	V2_IMPLEMENTATION_STREAM_LABELS,
} from "@smart-anketa/api-contract";
import { DEPARTMENTS, STREAM_FILTERED_ROLES, STREAMS } from "../constants";

const V2_IMPLEMENTATION_STREAM_LABEL_VALUES = Object.values(
	V2_IMPLEMENTATION_STREAM_LABELS,
);

export function normalizeUserGroups(userGroups: string[]): string[] {
	const result: string[] = [];

	for (const group of userGroups) {
		if (typeof group !== "string") {
			result.push(group);
			continue;
		}

		const normalized = group.replace(/^\//, "");

		if (normalized.includes("/")) {
			const parts = normalized.split("/");

			if (parts[0] === "departament") {
				result.push(parts.slice(1).join("/"));
			} else {
				result.push(...parts);
			}
		} else {
			result.push(normalized);
		}
	}

	return result;
}

export function extractUserRoles(userGroups: string[]): string[] {
	const normalizedGroups = normalizeUserGroups(userGroups);
	return normalizedGroups.filter((group) =>
		STREAM_FILTERED_ROLES.includes(group as any),
	);
}

export function extractDepartmentsAndStreams(userGroups: string[]): string[] {
	const normalizedGroups = normalizeUserGroups(userGroups);
	return normalizedGroups.filter(
		(group) =>
			Object.values(DEPARTMENTS).includes(group as any) ||
			Object.values(STREAMS).includes(group as any) ||
			(V2_IMPLEMENTATION_STREAM_CODES as readonly string[]).includes(group) ||
			V2_IMPLEMENTATION_STREAM_LABEL_VALUES.includes(group as any),
	);
}
