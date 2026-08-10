import { describe, expect, it } from "vitest";
import {
	canUserDeleteV2Questionnaire,
	resolveV2QuestionnaireDeleteAction,
	userCanCreateV2Questionnaire,
	userHasV2QuestionnaireCreateRole,
	userHasV2QuestionnaireDeleteRole,
} from "./v2-questionnaire-delete.util";

const formWithStream = (stream: string) => ({
	generalInfo: { implementationStream: stream },
});

describe("userHasV2QuestionnaireDeleteRole", () => {
	it("allows ds_lead, modelops_lead, sacfg — not sarep (1-я итерация)", () => {
		expect(userHasV2QuestionnaireDeleteRole(["/ds/ds_lead"])).toBe(true);
		expect(userHasV2QuestionnaireDeleteRole(["/modelops/modelops_lead"])).toBe(
			true,
		);
		expect(userHasV2QuestionnaireDeleteRole(["/sacfg"])).toBe(true);
		expect(userHasV2QuestionnaireDeleteRole(["/sarep"])).toBe(false);
		expect(
			userHasV2QuestionnaireDeleteRole(["/sarep", "sum_sarep_dadm"]),
		).toBe(false);
	});

	it("denies de, modelops executor and plain ds", () => {
		expect(userHasV2QuestionnaireDeleteRole(["/de"])).toBe(false);
		expect(userHasV2QuestionnaireDeleteRole(["/de/de_lead"])).toBe(false);
		expect(userHasV2QuestionnaireDeleteRole(["/modelops"])).toBe(false);
		expect(userHasV2QuestionnaireDeleteRole(["/ds"])).toBe(false);
	});
});

/** Все 6 AD-листов «Представитель стрима — не участника ЖЦМ». */
const SAREP_NON_LCM_GROUP_SHAPES = [
	"/sarep/test_sum_sarep_dadm",
	"/sarep/test_sum_sarep_digagt",
	"/sarep/test_sum_sarep_idsrc",
	"/sarep/test_sum_sarep_mdlctl",
	"/sarep/test_sum_sarep_pirm",
	"/sarep/test_sum_sarep_strdat",
	"test_sum_sarep_digagt",
	"test_sum_sarep_mdlctl",
	"test_sum_sarep_strdat",
	"sum_sarep_digagt",
	"sum_sarep_mdlctl",
	"sum_sarep_strdat",
] as const;

describe("userCanCreateV2Questionnaire", () => {
	it("denies all non-LCM sarep reps even with KK create permission", () => {
		expect(userCanCreateV2Questionnaire(["/sarep"], true)).toBe(false);
		for (const groups of SAREP_NON_LCM_GROUP_SHAPES) {
			expect(userCanCreateV2Questionnaire([groups], true)).toBe(false);
		}
		expect(userHasV2QuestionnaireCreateRole(["/sarep"])).toBe(false);
	});

	it("denies executors/architect with KK create (allow-list only)", () => {
		expect(userCanCreateV2Questionnaire(["/ds"], true)).toBe(false);
		expect(userCanCreateV2Questionnaire(["sum_ds_rb"], true)).toBe(false);
		expect(userCanCreateV2Questionnaire(["/architect"], true)).toBe(false);
		expect(userCanCreateV2Questionnaire(["/de_lead"], true)).toBe(false);
	});

	it("allows lead/sacfg and empty groups with permission", () => {
		expect(userCanCreateV2Questionnaire(["/ds_lead"], true)).toBe(true);
		expect(userCanCreateV2Questionnaire(["/modelops_lead"], true)).toBe(true);
		expect(userCanCreateV2Questionnaire(["/sacfg"], true)).toBe(true);
		expect(userCanCreateV2Questionnaire([], true)).toBe(true);
		expect(userCanCreateV2Questionnaire(["/sarep"], false)).toBe(false);
	});
});

describe("non-LCM sarep create/delete (digagt / mdlctl / strdat + peers)", () => {
	it("denies create and delete for every sarep stream leaf", () => {
		for (const group of SAREP_NON_LCM_GROUP_SHAPES) {
			expect(userHasV2QuestionnaireDeleteRole([group])).toBe(false);
			expect(userCanCreateV2Questionnaire([group], true)).toBe(false);
			expect(
				canUserDeleteV2Questionnaire([group], formWithStream("DIGAGT")),
			).toEqual({ ok: false, reason: "forbidden" });
		}
	});
});

describe("canUserDeleteV2Questionnaire", () => {
	it("sacfg can delete any stream", () => {
		expect(
			canUserDeleteV2Questionnaire(["/sacfg"], formWithStream("RB")),
		).toEqual({ ok: true });
	});

	it("ds_lead limited to own stream when scope is known", () => {
		const groups = ["/ds/ds_lead", "sum_Lds_rb"];
		expect(
			canUserDeleteV2Questionnaire(groups, formWithStream("RB")),
		).toEqual({ ok: true });
		expect(
			canUserDeleteV2Questionnaire(groups, formWithStream("KMBKCB")),
		).toEqual({ ok: false, reason: "wrong_stream" });
	});

	it("ds_lead can delete when anketa has no implementationStream yet", () => {
		const groups = ["/ds_lead", "sum_Lds_rb"];
		expect(canUserDeleteV2Questionnaire(groups, {})).toEqual({ ok: true });
		expect(
			canUserDeleteV2Questionnaire(groups, { generalInfo: {} }),
		).toEqual({ ok: true });
	});

	it("forbidden without delete role", () => {
		expect(
			canUserDeleteV2Questionnaire(["/saprg"], formWithStream("RB")),
		).toEqual({ ok: false, reason: "forbidden" });
	});
});

describe("resolveV2QuestionnaireDeleteAction", () => {
	it("hard deletes draft active questionnaires", () => {
		expect(resolveV2QuestionnaireDeleteAction("Черновик", "active")).toEqual({
			action: "hard_delete",
		});
		expect(resolveV2QuestionnaireDeleteAction(null, "active")).toEqual({
			action: "hard_delete",
		});
	});

	it("deactivates filled and approved questionnaires", () => {
		expect(resolveV2QuestionnaireDeleteAction("Заполнено", "active")).toEqual({
			action: "deactivate",
		});
		expect(resolveV2QuestionnaireDeleteAction("Утверждена", "active")).toEqual({
			action: "deactivate",
		});
	});

	it("denies already inactive or archived", () => {
		expect(resolveV2QuestionnaireDeleteAction("Черновик", "inactive")).toEqual({
			action: "deny",
			reason: "already_inactive",
		});
		expect(resolveV2QuestionnaireDeleteAction("Заполнено", "archived")).toEqual(
			{
				action: "deny",
				reason: "already_inactive",
			},
		);
	});
});
