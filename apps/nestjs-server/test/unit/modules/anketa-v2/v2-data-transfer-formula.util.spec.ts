import {
	remapAssignmentIdsInStoredFormula,
	remapAssignmentIdsInVersionConfigRow,
} from "../../../../src/modules/anketa-v2/utils/v2-data-transfer-formula.util";

describe("v2-data-transfer-formula.util", () => {
	const assignmentIdMap = new Map([
		["asg-old", "asg-new"],
		["asg-transitive-old", "asg-transitive-new"],
	]);

	it("remaps work_ref tokens in token-array formula", () => {
		const formula = [
			{ kind: "norm" },
			{ kind: "operator", op: "+" },
			{ kind: "work_ref", assignmentId: "asg-old", workName: "Child" },
		];
		expect(remapAssignmentIdsInStoredFormula(formula, assignmentIdMap)).toEqual([
			{ kind: "norm" },
			{ kind: "operator", op: "+" },
			{ kind: "work_ref", assignmentId: "asg-new", workName: "Child" },
		]);
	});

	it("remaps transitive sourceAssignmentId in terms formula", () => {
		const formula = {
			version: 2,
			text: "работа(Child)",
			terms: [
				{
					kind: "transitive",
					order: 0,
					sourceAssignmentId: "asg-transitive-old",
					sourceWorkName: "Child",
				},
			],
		};
		expect(remapAssignmentIdsInStoredFormula(formula, assignmentIdMap)).toEqual({
			version: 2,
			text: "работа(Child)",
			terms: [
				{
					kind: "transitive",
					order: 0,
					sourceAssignmentId: "asg-transitive-new",
					sourceWorkName: "Child",
				},
			],
		});
	});

	it("remaps formula field on version config row", () => {
		expect(
			remapAssignmentIdsInVersionConfigRow(
				{
					formula: [{ kind: "work_ref", assignmentId: "asg-old" }],
					formulaText: "работа(X)",
				},
				assignmentIdMap,
			),
		).toEqual({
			formula: [{ kind: "work_ref", assignmentId: "asg-new" }],
			formulaText: "работа(X)",
		});
	});
});
