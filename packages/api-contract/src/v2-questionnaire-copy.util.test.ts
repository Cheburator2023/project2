import { describe, expect, it } from "vitest";
import { V2_IMPLEMENTATION_STREAM } from "./v2-implementation-streams.util";
import {
	canUserCopyV2Questionnaire,
	isV2ModelQuestionnaireFormData,
	userIsV2StreamRepresentative,
} from "./v2-questionnaire-copy.util";

function formWithStream(stream: string) {
	return { generalInfo: { implementationStream: stream } };
}

describe("isV2ModelQuestionnaireFormData", () => {
	it("treats five model streams (code + label) as model", () => {
		expect(
			isV2ModelQuestionnaireFormData(
				formWithStream(V2_IMPLEMENTATION_STREAM.RB),
			),
		).toBe(true);
		expect(
			isV2ModelQuestionnaireFormData(formWithStream("Моделирование РБ")),
		).toBe(true);
		expect(
			isV2ModelQuestionnaireFormData(
				formWithStream(V2_IMPLEMENTATION_STREAM.KMBKCB),
			),
		).toBe(true);
	});

	it("treats non-model streams as non-model", () => {
		expect(
			isV2ModelQuestionnaireFormData(
				formWithStream(V2_IMPLEMENTATION_STREAM.DADM),
			),
		).toBe(false);
		expect(
			isV2ModelQuestionnaireFormData(
				formWithStream(V2_IMPLEMENTATION_STREAM.DIGAGT),
			),
		).toBe(false);
		expect(
			isV2ModelQuestionnaireFormData(formWithStream("Источники данных")),
		).toBe(false);
	});

	it("treats missing stream as model (deny sarep copy)", () => {
		expect(isV2ModelQuestionnaireFormData({})).toBe(true);
		expect(isV2ModelQuestionnaireFormData(null)).toBe(true);
	});
});

describe("canUserCopyV2Questionnaire", () => {
	const createOpts = {
		hasCreatePermission: true,
		hasEditPermission: true,
	};

	it("allows create-allowlist roles for any anketa", () => {
		expect(
			canUserCopyV2Questionnaire(
				["/ds_lead"],
				formWithStream(V2_IMPLEMENTATION_STREAM.RB),
				createOpts,
			),
		).toEqual({ ok: true });
		expect(
			canUserCopyV2Questionnaire(
				["/sacfg"],
				formWithStream(V2_IMPLEMENTATION_STREAM.DADM),
				createOpts,
			),
		).toEqual({ ok: true });
	});

	it("allows sarep only for non-model anketas (edit is enough)", () => {
		const sarepEdit = {
			hasCreatePermission: false,
			hasEditPermission: true,
		};
		expect(
			canUserCopyV2Questionnaire(
				["/sarep/test_sum_sarep_dadm"],
				formWithStream(V2_IMPLEMENTATION_STREAM.DADM),
				sarepEdit,
			),
		).toEqual({ ok: true });
		expect(
			canUserCopyV2Questionnaire(
				["/sarep/test_sum_sarep_digagt"],
				formWithStream(V2_IMPLEMENTATION_STREAM.RB),
				sarepEdit,
			),
		).toEqual({ ok: false, reason: "model_anketa_for_sarep" });
	});

	it("denies sarep without edit/create", () => {
		expect(
			canUserCopyV2Questionnaire(
				["/sarep"],
				formWithStream(V2_IMPLEMENTATION_STREAM.DADM),
				{ hasCreatePermission: false, hasEditPermission: false },
			),
		).toEqual({ ok: false, reason: "forbidden" });
	});

	it("denies other roles even with edit", () => {
		expect(
			canUserCopyV2Questionnaire(
				["/de"],
				formWithStream(V2_IMPLEMENTATION_STREAM.DADM),
				{ hasCreatePermission: false, hasEditPermission: true },
			),
		).toEqual({ ok: false, reason: "forbidden" });
	});

	it("detects sarep role", () => {
		expect(userIsV2StreamRepresentative(["/sarep"])).toBe(true);
		expect(userIsV2StreamRepresentative(["sum_sarep_mdlctl"])).toBe(true);
		expect(userIsV2StreamRepresentative(["/ds_lead"])).toBe(false);
	});
});
