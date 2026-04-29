import {
	normalizeUserGroups,
	extractUserRoles,
	extractDepartmentsAndStreams,
} from "../../../../src/shared/utils/user-groups.util";
import {
	DEPARTMENTS,
	STREAMS,
	STREAM_FILTERED_ROLES,
} from "../../../../src/shared/constants";

/**
 * Unit-тесты user-groups.util.
 * Проверяем нормализацию групп, извлечение ролей и департаментов/стримов из Keycloak-групп.
 */
describe("user-groups util", () => {
	/**
	 * normalizeUserGroups() — нормализация массива групп.
	 * Убирает ведущий слеш, разбивает многосегментные пути, сохраняет нестроковые значения.
	 */
	describe("normalizeUserGroups", () => {
		it("preserves non-string values as-is", () => {
			expect(normalizeUserGroups([1 as any])).toEqual([1]);
		});

		it("strips leading slash", () => {
			expect(normalizeUserGroups(["/abc"])).toEqual(["abc"]);
		});

		it("splits multi-segment groups; departament prefix joins remainder", () => {
			expect(normalizeUserGroups(["departament/x/y"])).toEqual(["x/y"]);
			expect(normalizeUserGroups(["foo/bar"])).toEqual(["foo", "bar"]);
		});
	});

	/**
	 * extractUserRoles() — фильтрует только роли из STREAM_FILTERED_ROLES.
	 */
	describe("extractUserRoles", () => {
		it("returns only stream-filtered roles", () => {
			const role = STREAM_FILTERED_ROLES[0];
			const result = extractUserRoles([role, "random-role"]);
			expect(result).toEqual([role]);
		});
	});

	/**
	 * extractDepartmentsAndStreams() — фильтрует только известные департаменты и стримы.
	 */
	describe("extractDepartmentsAndStreams", () => {
		it("returns only known departments and streams", () => {
			const dept = Object.values(DEPARTMENTS)[0];
			const stream = Object.values(STREAMS)[0];
			expect(extractDepartmentsAndStreams([dept, stream, "random"])).toEqual(
				expect.arrayContaining([dept, stream]),
			);
		});
	});
});
