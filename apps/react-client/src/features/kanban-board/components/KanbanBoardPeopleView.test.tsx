import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { KanbanBoardPeopleView } from "./KanbanBoardPeopleView";

vi.mock("@react-client/common/api/queries/kanban-board", () => ({
	useKanbanBoardTasksRegistry: () => ({
		data: [
			{ id: "a", taskKey: "COMMON-1", title: "Первая" },
			{ id: "b", taskKey: "COMMON-2", title: "Вторая" },
		],
		isLoading: false,
	}),
}));

describe("KanbanBoardPeopleView links", () => {
	beforeEach(() => {
		Object.defineProperty(HTMLElement.prototype, "offsetParent", {
			configurable: true,
			get() {
				return document.body;
			},
		});
		Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
			configurable: true,
			get() {
				return 400;
			},
		});
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
			function mockRect(this: HTMLElement) {
				const taskId = this.getAttribute("data-task-id");
				if (taskId === "a") {
					return {
						top: 80,
						bottom: 120,
						height: 40,
						left: 40,
						right: 400,
						width: 360,
						x: 40,
						y: 80,
						toJSON() {
							return {};
						},
					};
				}
				if (taskId === "b") {
					return {
						top: 140,
						bottom: 180,
						height: 40,
						left: 40,
						right: 400,
						width: 360,
						x: 40,
						y: 140,
						toJSON() {
							return {};
						},
					};
				}
				return {
					top: 0,
					bottom: 400,
					height: 400,
					left: 0,
					right: 480,
					width: 480,
					x: 0,
					y: 0,
					toJSON() {
						return {};
					},
				};
			},
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("shows type chips, relation spoilers and left-side arrows", async () => {
		render(
			<KanbanBoardPeopleView
				groups={[
					{
						assignee: "Петров",
						title: "Петров",
						tasks: [
							{
								id: "a",
								parentId: "todo",
								title: "Первая",
								taskKey: "COMMON-1",
								statusTitle: "Сделать",
								statusColor: "#111",
								taskType: "bug",
								priority: "high",
								chips: [
									{ label: "Высокий", color: "#dc2626" },
									{ label: "Баг", color: "#ef4444" },
									{ label: "IFT", color: "#0ea5e9" },
								],
								meta: {
									createdLabel: "23 сент. 2026",
									ageDays: 6,
									dueLabel: null,
									estimatePd: 2,
									commentCount: 1,
									attachmentCount: 0,
								},
								relatedLinks: [{ taskId: "b", type: "blocks" }],
							},
							{
								id: "b",
								parentId: "doing",
								title: "Вторая",
								taskKey: "COMMON-2",
								statusTitle: "В работе",
								statusColor: "#222",
								taskType: "story",
								chips: [{ label: "История", color: "#22c55e" }],
								meta: {
									createdLabel: null,
									ageDays: null,
									dueLabel: null,
									commentCount: 0,
									attachmentCount: 0,
								},
								relatedLinks: [],
							},
						],
					},
				]}
				statuses={[
					{ id: "todo", title: "Сделать", color: "#111" },
					{ id: "doing", title: "В работе", color: "#222" },
				]}
				assigneeNames={["Петров"]}
				onOpenTask={vi.fn()}
				onMoveTask={vi.fn()}
				onAssignTask={vi.fn()}
				onTaskContextMenu={vi.fn()}
			/>,
		);

		expect(screen.getByTestId("kanban-board-people-view")).toBeTruthy();
		expect(screen.getByText("Высокий")).toBeTruthy();
		expect(screen.getByText("Баг")).toBeTruthy();
		expect(screen.getByText("IFT")).toBeTruthy();
		expect(screen.getByText("История")).toBeTruthy();
		expect(screen.getByText("23 сент. 2026")).toBeTruthy();
		expect(screen.getByText("6 д")).toBeTruthy();
		expect(screen.getByText("2 чд")).toBeTruthy();
		expect(screen.getByText("Связи · 1")).toBeTruthy();
		fireEvent.click(screen.getByText("Связи · 1"));
		expect(
			screen.getByTestId("kanban-board-people-task-relations").textContent,
		).toContain("Блокирует");
		await waitFor(() => {
			expect(screen.getByTestId("kanban-board-people-links")).toBeTruthy();
		});
	});
});
