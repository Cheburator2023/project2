import { describe, expect, it } from "vitest";
import {
	canUserDeleteV2Questionnaire,
	resolveV2QuestionnaireDeleteAction,
	userHasV2QuestionnaireDeleteRole,
} from "./v2-questionnaire-delete.util";

const formWithStream = (stream: string) => ({
	generalInfo: { implementationStream: stream },
});

describe("userHasV2QuestionnaireDeleteRole", () => {
	it("allows ds_lead, modelops_lead, sacfg, sarep", () => {
		expect(userHasV2QuestionnaireDeleteRole(["/ds/ds_lead"])).toBe(true);
		expect(userHasV2QuestionnaireDeleteRole(["/modelops/modelops_lead"])).toBe(
			true,
		);
		expect(userHasV2QuestionnaireDeleteRole(["/sacfg"])).toBe(true);
		expect(userHasV2QuestionnaireDeleteRole(["/sarep"])).toBe(true);
	});

	it("denies de, modelops executor and plain ds", () => {
		expect(userHasV2QuestionnaireDeleteRole(["/de"])).toBe(false);
		expect(userHasV2QuestionnaireDeleteRole(["/de/de_lead"])).toBe(false);
		expect(userHasV2QuestionnaireDeleteRole(["/modelops"])).toBe(false);
		expect(userHasV2QuestionnaireDeleteRole(["/ds"])).toBe(false);
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
