import { describe, expect, it } from "vitest";
import type { V2EditLockJoinAck } from "@smart-anketa/api-contract";
import { isForeignV2EditLockJoinDenial } from "./isOwnV2QuestionnaireEditLock";

describe("isForeignV2EditLockJoinDenial", () => {
	it("does not treat a missing questionnaire as another editor", () => {
		const ack: V2EditLockJoinAck = {
			ok: false,
			message: "Анкета не найдена",
			reason: "not_found",
		};
		expect(isForeignV2EditLockJoinDenial(ack)).toBe(false);
	});

	it("treats a lock payload as another editor so the registry can show occupancy", () => {
		const ack: V2EditLockJoinAck = {
			ok: false,
			message: "Анкета сейчас редактируется другим пользователем",
			reason: "lock",
			lock: {
				questionnaireId: "53ddf337-565b-4904-bff4-25331ce1716a",
				lockedByLabel: "test_ds",
				lockedByUserId: null,
				expiresAt: new Date().toISOString(),
			},
		};
		expect(isForeignV2EditLockJoinDenial(ack)).toBe(true);
	});
});
