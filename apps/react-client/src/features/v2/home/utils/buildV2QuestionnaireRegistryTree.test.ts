import { describe, expect, it } from "vitest";
import {
	buildV2QuestionnaireRegistryTree,
	flattenV2QuestionnaireRegistryTree,
} from "./buildV2QuestionnaireRegistryTree";
import type { V2QuestionnaireVersionRow } from "../types/v2QuestionnaireGrid.types";

function version(
	partial: Partial<V2QuestionnaireVersionRow> & {
		id: string;
		seriesId: string;
		version: string;
		calcName: string;
	},
): V2QuestionnaireVersionRow {
	return {
		rowKind: "version",
		displayLabel: partial.calcName,
		status: "active",
		workflowGlobalStatus: "Черновик",
		...partial,
	} as V2QuestionnaireVersionRow;
}

describe("buildV2QuestionnaireRegistryTree", () => {
	it("actual mode: one active version per series, group named by first version", () => {
		const rows = [
			version({
				id: "a2",
				seriesId: "s1",
				version: "2",
				calcName: "Инициатива A v2",
				status: "active",
				createdAt: "2026-01-02T00:00:00.000Z",
			}),
			version({
				id: "a1",
				seriesId: "s1",
				version: "1",
				calcName: "Инициатива A",
				status: "inactive",
				workflowGlobalStatus: "Утверждена",
				createdAt: "2026-01-01T00:00:00.000Z",
			}),
			version({
				id: "b1",
				seriesId: "s2",
				version: "1",
				calcName: "Инициатива B",
				workflowGlobalStatus: "Утверждена",
				createdAt: "2026-02-01T00:00:00.000Z",
			}),
		];
		const tree = buildV2QuestionnaireRegistryTree(rows, "actual");
		expect(tree.map((g) => g.seriesId)).toEqual(["s2", "s1"]);
		const groupA = tree.find((g) => g.seriesId === "s1");
		expect(groupA?.displayLabel).toBe("Инициатива A");
		expect(groupA?.children.map((c) => c.id)).toEqual(["a2"]);
		expect(flattenV2QuestionnaireRegistryTree(tree).map((r) => r.id)).toEqual([
			"b1",
			"a2",
		]);
	});

	it("actual mode keeps a series that only has an inactive approved version", () => {
		const rows = [
			version({
				id: "d1",
				seriesId: "s4",
				version: "1",
				calcName: "Деактивированная",
				status: "inactive",
				workflowGlobalStatus: "Утверждена",
				createdAt: "2026-04-01T00:00:00.000Z",
			}),
		];
		const tree = buildV2QuestionnaireRegistryTree(rows, "actual");
		expect(tree).toHaveLength(1);
		expect(tree[0]?.children.map((c) => c.id)).toEqual(["d1"]);
		expect(tree[0]?.children[0]?.status).toBe("inactive");
	});

	it("approved mode: latest approved per series (incl. inactive)", () => {
		const rows = [
			version({
				id: "a1",
				seriesId: "s1",
				version: "1",
				calcName: "A",
				status: "inactive",
				workflowGlobalStatus: "Утверждена",
			}),
			version({
				id: "a2",
				seriesId: "s1",
				version: "2",
				calcName: "A v2",
				status: "active",
				workflowGlobalStatus: "Черновик",
			}),
			version({
				id: "b1",
				seriesId: "s2",
				version: "1",
				calcName: "B",
				workflowGlobalStatus: "Черновик",
			}),
		];
		const tree = buildV2QuestionnaireRegistryTree(rows, "approved");
		expect(tree.map((g) => g.seriesId)).toEqual(["s1"]);
		expect(tree[0]?.children.map((c) => c.id)).toEqual(["a1"]);
	});

	it("includeAllVersions: все версии серии (копия + последующие версии)", () => {
		const rows = [
			version({
				id: "a1",
				seriesId: "s1",
				version: "1",
				calcName: "A",
				status: "inactive",
				workflowGlobalStatus: "Утверждена",
				createdAt: "2026-01-01T00:00:00.000Z",
			}),
			version({
				id: "a2",
				seriesId: "s1",
				version: "2",
				calcName: "A v2",
				status: "active",
				createdAt: "2026-01-02T00:00:00.000Z",
			}),
		];
		const tree = buildV2QuestionnaireRegistryTree(rows, "actual", {
			includeAllVersions: true,
		});
		expect(tree).toHaveLength(1);
		expect(tree[0]?.children.map((c) => c.id)).toEqual(["a1", "a2"]);
		expect(tree[0]?.children.map((c) => c.displayLabel)).toEqual(["v1", "v2"]);
	});

	it("includeAllVersions: копия и две последующие версии — три ребёнка в одной группе", () => {
		const rows = [
			version({
				id: "c1",
				seriesId: "copy-series",
				version: "1",
				calcName: "Копия",
				status: "inactive",
				createdAt: "2026-03-01T00:00:00.000Z",
			}),
			version({
				id: "c2",
				seriesId: "copy-series",
				version: "2",
				calcName: "Копия",
				status: "inactive",
				createdAt: "2026-03-02T00:00:00.000Z",
			}),
			version({
				id: "c3",
				seriesId: "copy-series",
				version: "3",
				calcName: "Копия",
				status: "active",
				createdAt: "2026-03-03T00:00:00.000Z",
			}),
		];
		const tree = buildV2QuestionnaireRegistryTree(rows, "actual", {
			includeAllVersions: true,
		});
		expect(tree).toHaveLength(1);
		expect(tree[0]?.children.map((c) => c.displayLabel)).toEqual([
			"v1",
			"v2",
			"v3",
		]);
	});
});
