import {
	applyV2RegistryAgGridFilters,
	applyV2RegistryAgGridSort,
	resolveV2RegistryColumnExpr,
	sortV2RegistryLeanRows,
} from "../../../../src/modules/anketa-v2/utils/v2-questionnaire-registry-ag-grid-sql";
import type { V2QuestionnaireEntity } from "../../../../src/modules/anketa-v2/entities/v2-questionnaire.entity";
import type { SelectQueryBuilder } from "typeorm";
import {
	expandV2RegistrySetFilterValues,
	parseV2AgGridFilterModel,
} from "@smart-anketa/api-contract";

const buildQb = () => {
	const calls: { method: string; args: unknown[] }[] = [];
	const qb: any = {
		calls,
		andWhere: jest.fn((sql: string, params?: unknown) => {
			calls.push({ method: "andWhere", args: [sql, params] });
			return qb;
		}),
		addSelect: jest.fn((sql: string, alias?: string) => {
			calls.push({ method: "addSelect", args: [sql, alias] });
			return qb;
		}),
		orderBy: jest.fn((field: string, dir?: string) => {
			calls.push({ method: "orderBy", args: [field, dir] });
			return qb;
		}),
		addOrderBy: jest.fn((field: string, dir?: string) => {
			calls.push({ method: "addOrderBy", args: [field, dir] });
			return qb;
		}),
		expressionMap: { joinAttributes: [] },
	};
	return qb as typeof qb & SelectQueryBuilder<V2QuestionnaireEntity>;
};

describe("v2 registry ag-grid SQL", () => {
	it("maps meta, form and array paths to JSON expressions", () => {
		expect(resolveV2RegistryColumnExpr("calcName")?.textSql).toBe(
			"q.calc_name",
		);
		expect(
			resolveV2RegistryColumnExpr("form.generalInfo.businessCustomer")?.textSql,
		).toBe("q.form_data->'generalInfo'->>'businessCustomer'");
		expect(
			resolveV2RegistryColumnExpr("form.detailInfo.sourceSystems[0].name")
				?.textSql,
		).toBe("q.form_data->'detailInfo'->'sourceSystems'->0->>'name'");
		expect(resolveV2RegistryColumnExpr("form.a';drop")).toBeNull();
	});

	it("applies set filter across all matching values, not the current page", () => {
		const qb = buildQb();
		applyV2RegistryAgGridFilters(
			qb,
			parseV2AgGridFilterModel({
				status: { filterType: "set", values: ["Активная"] },
			}),
		);
		const call = qb.calls.find((item) => item.method === "andWhere");
		expect(call?.args[0]).toContain("CAST(q.status AS text) IN");
		expect((call?.args[1] as { agf_0: string[] }).agf_0).toEqual(
			expect.arrayContaining(["Активная", "active"]),
		);
	});

	it("sorts versionMode representatives by the requested column", () => {
		const rows = [
			{ id: "b", createdAt: "2026-01-01", sort_0: "Beta" },
			{ id: "a", createdAt: "2026-02-01", sort_0: "Alpha" },
		];
		expect(
			sortV2RegistryLeanRows(rows, [{ colId: "calcName", sort: "asc" }]).map(
				(row) => row.id,
			),
		).toEqual(["a", "b"]);
	});

	it("orders SQL by sort aliases, not raw JSON paths", () => {
		const qb = buildQb();
		applyV2RegistryAgGridSort(qb, [
			{ colId: "form.generalInfo.businessCustomer", sort: "asc" },
		]);
		expect(qb.calls.some((item) => item.method === "addSelect")).toBe(true);
		expect(qb.calls.find((item) => item.method === "orderBy")?.args[0]).toBe(
			"sort_0",
		);
	});

	it("matches date set-filter by calendar day, including ISO timestamps", () => {
		const qb = buildQb();
		applyV2RegistryAgGridFilters(qb, {
			createdAt: { filterType: "set", values: ["2026-08-26"] },
		});
		const call = qb.calls.find((item) => item.method === "andWhere");
		expect(String(call?.args[0])).toContain("LEFT(");
		expect((call?.args[1] as { agf_0: string[] }).agf_0).toEqual([
			"2026-08-26",
		]);
	});

	it("combines OR text conditions into one WHERE", () => {
		const qb = buildQb();
		applyV2RegistryAgGridFilters(qb, {
			calcName: {
				filterType: "text",
				operator: "OR",
				conditions: [
					{ filterType: "text", type: "contains", filter: "alpha" },
					{ filterType: "text", type: "contains", filter: "beta" },
				],
			},
		});
		const call = qb.calls.find((item) => item.method === "andWhere");
		expect(String(call?.args[0])).toContain(" OR ");
		expect(qb.calls.filter((item) => item.method === "andWhere")).toHaveLength(
			1,
		);
	});

	it("expands stream labels so set-filter matches stored codes", () => {
		expect(
			expandV2RegistrySetFilterValues(
				"form.generalInfo.implementationStream",
				"ДАДМ",
			),
		).toEqual(expect.arrayContaining(["dadm", "ДАДМ"]));
	});
});
