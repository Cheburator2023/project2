import { describe, expect, it } from "vitest";
import {
	resolveArchCountLaborFromCatalog,
	splitCatalogLaborArchCounts,
	reconcileFormulaWithLaborArchCounts,
} from "./v2-labor-arch-count.util";

describe("v2-labor-arch-count.util", () => {
	it("splits model count from schema labor params", () => {
		const split = splitCatalogLaborArchCounts({
			laborParams: ["Кол-во моделей", "Сложность постановки"],
			laborCoefficients: [
				{
					paramName: "Кол-во моделей",
					values: [
						{ label: "1", coefficient: 1 },
						{ label: "2", coefficient: 1.75 },
					],
				},
			],
		});

		expect(split.laborParams).toEqual(["Сложность постановки"]);
		expect(split.laborArchCounts).toHaveLength(1);
		expect(split.laborArchCounts[0]?.kind).toBe("model");
		expect(split.laborArchCounts[0]?.steps[1]).toEqual({
			count: 2,
			coefficient: 1.75,
		});
	});

	it("resolves source system arch count from catalog label", () => {
		const arch = resolveArchCountLaborFromCatalog(
			"Кол-во источников для проработки",
			[{ label: "2", coefficient: 1.2 }],
		);
		expect(arch?.kind).toBe("sourceSystem");
		expect(arch?.steps).toEqual([{ count: 2, coefficient: 1.2 }]);
	});

	it("reconciles formula arch_count_coeff tokens from laborArchCounts", () => {
		const result = reconcileFormulaWithLaborArchCounts(
			{
				tokens: [
					{ kind: "norm" },
					{ kind: "operator", op: "*" },
					{ kind: "param_coeff", paramCode: "complexity" },
				],
				text: "N * коэф(complexity)",
			},
			[{ kind: "model", steps: [{ count: 1, coefficient: 1 }], paramName: null }],
		);
		expect(result.tokens).toEqual([
			{ kind: "norm" },
			{ kind: "operator", op: "*" },
			{
				kind: "arch_count_coeff",
				archComponentKind: "model",
				steps: [{ count: 1, coefficient: 1 }],
			},
			{ kind: "operator", op: "*" },
			{ kind: "param_coeff", paramCode: "complexity" },
		]);
	});

	it("preserves division and operand order when syncing arch steps", () => {
		const result = reconcileFormulaWithLaborArchCounts(
			{
				tokens: [
					{ kind: "norm" },
					{ kind: "operator", op: "*" },
					{ kind: "param_coeff", paramCode: "overallUncertainty" },
					{ kind: "operator", op: "*" },
					{
						kind: "arch_count_coeff",
						archComponentKind: "sourceSystem",
						steps: [{ count: 1, coefficient: 1 }],
					},
					{ kind: "operator", op: "/" },
					{ kind: "param_coeff", paramCode: "assessedInitiativesCount" },
				],
				text: "N * коэф(overallUncertainty) * архкоэф(Система-источник; 1=1) ÷ коэф(assessedInitiativesCount)",
			},
			[
				{
					kind: "sourceSystem",
					steps: [
						{ count: 1, coefficient: 1 },
						{ count: 2, coefficient: 1.2 },
					],
					paramName: null,
				},
			],
		);

		expect(result.tokens.map((token) => token.kind)).toEqual([
			"norm",
			"operator",
			"param_coeff",
			"operator",
			"arch_count_coeff",
			"operator",
			"param_coeff",
		]);
		expect(result.tokens[5]).toEqual({ kind: "operator", op: "/" });
		expect(result.tokens[4]).toMatchObject({
			kind: "arch_count_coeff",
			archComponentKind: "sourceSystem",
			steps: [
				{ count: 1, coefficient: 1 },
				{ count: 2, coefficient: 1.2 },
			],
		});
		expect(result.text).toContain("÷");
	});

	it("repairs legacy arch-insert corruption (adjacent operands + * /)", () => {
		const result = reconcileFormulaWithLaborArchCounts(
			{
				tokens: [
					{ kind: "norm" },
					{ kind: "operator", op: "*" },
					{
						kind: "arch_count_coeff",
						archComponentKind: "sourceSystem",
						steps: [{ count: 1, coefficient: 1 }],
					},
					{ kind: "param_coeff", paramCode: "overallUncertainty" },
					{ kind: "operator", op: "*" },
					{ kind: "operator", op: "/" },
					{ kind: "param_coeff", paramCode: "assessedInitiativesCount" },
				],
				text: "broken",
			},
			[
				{
					kind: "sourceSystem",
					steps: [{ count: 1, coefficient: 1 }],
					paramName: null,
				},
			],
		);

		expect(result.tokens.map((token) => token.kind)).toEqual([
			"norm",
			"operator",
			"arch_count_coeff",
			"operator",
			"param_coeff",
			"operator",
			"param_coeff",
		]);
		expect(result.tokens[3]).toEqual({ kind: "operator", op: "*" });
		expect(result.tokens[5]).toEqual({ kind: "operator", op: "/" });
		expect(result.text).toContain("÷");
	});

	it("inserts missing arch without creating adjacent operands", () => {
		const result = reconcileFormulaWithLaborArchCounts(
			{
				tokens: [
					{ kind: "norm" },
					{ kind: "operator", op: "*" },
					{ kind: "param_coeff", paramCode: "overallUncertainty" },
					{ kind: "operator", op: "/" },
					{ kind: "param_coeff", paramCode: "assessedInitiativesCount" },
				],
				text: "N * коэф(overallUncertainty) ÷ коэф(assessedInitiativesCount)",
			},
			[
				{
					kind: "sourceSystem",
					steps: [{ count: 1, coefficient: 1 }],
					paramName: null,
				},
			],
		);

		expect(result.tokens.map((token) => token.kind)).toEqual([
			"norm",
			"operator",
			"arch_count_coeff",
			"operator",
			"param_coeff",
			"operator",
			"param_coeff",
		]);
		expect(result.tokens[5]).toEqual({ kind: "operator", op: "/" });
	});
});
