import { describe, expect, it } from "vitest";
import {
	assignKanbanBoardPeopleLinkLanes,
	buildKanbanBoardPeopleLinkEdges,
	buildKanbanBoardPeopleLinkGeometry,
	kanbanBoardPeopleLinkPath,
} from "./kanbanBoardPeopleLinks";

describe("buildKanbanBoardPeopleLinkEdges", () => {
	it("keeps one edge for a bidirectional pair and flips inverse types", () => {
		const edges = buildKanbanBoardPeopleLinkEdges([
			{
				id: "a",
				relatedLinks: [{ taskId: "b", type: "blocks" }],
			},
			{
				id: "b",
				relatedLinks: [{ taskId: "a", type: "blocked_by" }],
			},
			{
				id: "c",
				relatedLinks: [{ taskId: "missing", type: "relates" }],
			},
		]);
		expect(edges).toEqual([
			expect.objectContaining({
				fromId: "a",
				toId: "b",
				type: "blocks",
				color: "#dc2626",
				title: "Блокирует",
			}),
		]);
	});

	it("assigns separate lanes to overlapping spans", () => {
		const lanes = assignKanbanBoardPeopleLinkLanes([
			{ y1: 10, y2: 100 },
			{ y1: 20, y2: 80 },
			{ y1: 120, y2: 160 },
		]);
		expect(lanes[0]).not.toBe(lanes[1]);
		expect(lanes[2]).toBe(0);
	});

	it("builds geometry only for visible row centers", () => {
		const edges = buildKanbanBoardPeopleLinkEdges([
			{ id: "a", relatedLinks: [{ taskId: "b", type: "relates" }] },
			{ id: "b", relatedLinks: [] },
		]);
		const geom = buildKanbanBoardPeopleLinkGeometry(
			edges,
			new Map([
				["a", 20],
				["b", 60],
			]),
		);
		expect(geom).toHaveLength(1);
		expect(geom[0]?.lane).toBe(0);
		expect(kanbanBoardPeopleLinkPath(geom[0]!, 28)).toContain("M 28 20");
	});
});
