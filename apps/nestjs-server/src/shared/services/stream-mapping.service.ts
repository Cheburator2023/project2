import { Injectable } from "@nestjs/common";
import { DEPARTMENTS, STREAM_FILTERED_ROLES, STREAMS } from "../constants";
import {
	extractDepartmentsAndStreams,
	extractUserRoles,
} from "../utils/user-groups.util";

const DEPARTMENT_TO_STREAM_MAPPING = {
	[DEPARTMENTS.KIB_SMB]: [STREAMS.KIB_SMB],
	[DEPARTMENTS.PARTNERSHIPS_IT]: [
		STREAMS.PARTNERSHIPS_IT_IT,
		STREAMS.PARTNERSHIPS_IT_RND,
	],
	[DEPARTMENTS.RB]: [STREAMS.RB],
	[DEPARTMENTS.ML_ALGORITHMS]: [STREAMS.ML_ALGORITHMS],
	[DEPARTMENTS.PROCESS_FINANCIAL]: [STREAMS.PROCESS_FINANCIAL],
};

/**
 * Сервис для определения доступных стримов пользователя
 */
@Injectable()
export class StreamMappingService {
	isStreamFilteredUser(userGroups: string[]): boolean {
		if (!Array.isArray(userGroups)) {
			return false;
		}

		const userRoles = extractUserRoles(userGroups);
		return STREAM_FILTERED_ROLES.some((role) => userRoles.includes(role));
	}

	getGroupsAfterMapping(userGroups: string[]): string[] {
		if (!Array.isArray(userGroups) || userGroups.length === 0) {
			return [];
		}

		if (this.isStreamFilteredUser(userGroups)) {
			const departmentsAndStreams = extractDepartmentsAndStreams(userGroups);
			return departmentsAndStreams.flatMap(
				(group) => DEPARTMENT_TO_STREAM_MAPPING[group] || group,
			);
		}

		return [];
	}
}
