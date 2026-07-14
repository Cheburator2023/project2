import { describe, expect, it } from "vitest";
import { validateNormInputs } from "@smart-anketa/api-contract";
import {
	closeOpenNormPeriodsBefore,
	reconcileStreamNormPeriods,
} from "./typicalWorkNormPeriods";
import type { V2TypicalWorkNormDto } from "@smart-anketa/api-contract";

function norm(
	overrides: Partial<V2TypicalWorkNormDto> & Pick<V2TypicalWorkNormDto, "id">,
): V2TypicalWorkNormDto {
	return {
		streamExecutor: "Источники данных",
		normValue: 1,
		validFrom: "2025-01-01",
		validTo: null,
		...overrides,
	};
}

describe("typicalWorkNormPeriods", () => {
	it("reconcileStreamNormPeriods closes seed norm before newer open norm", () => {
		const norms = [
			norm({ id: "seed", validFrom: "2025-01-01", normValue: 1 }),
			norm({ id: "user", validFrom: "2026-07-10", normValue: 20 }),
		];
		const reconciled = reconcileStreamNormPeriods(norms);
		expect(reconciled[0]?.validTo).toBe("2026-07-09");
		expect(reconciled[1]?.validTo).toBeNull();
	});

	it("reconcileStreamNormPeriods leaves single norm unchanged", () => {
		const norms = [norm({ id: "only", validFrom: "2026-07-10", normValue: 20 })];
		const reconciled = reconcileStreamNormPeriods(norms);
		expect(reconciled).toEqual(norms);
	});

	it("closeOpenNormPeriodsBefore skips exceptNormId", () => {
		const norms = [
			norm({ id: "a", validFrom: "2025-01-01" }),
			norm({ id: "b", validFrom: "2026-07-10" }),
		];
		const closed = closeOpenNormPeriodsBefore(
			norms,
			"Источники данных",
			"2026-07-10",
			{ exceptNormId: "a" },
		);
		expect(closed[0]?.validTo).toBeNull();
		expect(closed[1]?.validTo).toBeNull();
	});

	it("reconcile clears overlap validation for seed + user open norms", () => {
		const stream = "Источники данных";
		const norms = [
			norm({ id: "seed", validFrom: "2025-01-01", normValue: 1 }),
			norm({ id: "user", validFrom: "2026-07-10", normValue: 20 }),
		];
		const before = validateNormInputs(
			norms.map((n) => ({
				normValue: n.normValue,
				validFrom: n.validFrom,
				validTo: n.validTo,
			})),
			stream,
			{ coverageDate: "2026-07-10" },
		);
		expect(before.some((i) => i.message.includes("пересекается"))).toBe(true);

		const reconciled = reconcileStreamNormPeriods(norms);
		const after = validateNormInputs(
			reconciled.map((n) => ({
				normValue: n.normValue,
				validFrom: n.validFrom,
				validTo: n.validTo,
			})),
			stream,
			{ coverageDate: "2026-07-10" },
		);
		expect(after).toEqual([]);
	});
});
