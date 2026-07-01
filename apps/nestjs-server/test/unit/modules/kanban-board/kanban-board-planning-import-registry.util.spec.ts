import { defaultKanbanBoardColumns } from "@smart-anketa/api-contract";
import {
	matchAssigneeByName,
	matchCustomerByText,
	resolveBestStatusColumnId,
} from "../../../../src/modules/kanban-board/utils/kanban-board-planning-import-registry.util";

const BOARD_ID = "01J000000000000000000015";
const COLUMNS = defaultKanbanBoardColumns(BOARD_ID).map((column) => ({
	id: column.id,
	title: column.title,
}));

describe("kanban board planning import registry util", () => {
	it("matches assignee by surname", () => {
		const matched = matchAssigneeByName("Якупова", [
			{ id: "1", code: "yakupova", name: "Якупова Мария" },
			{ id: "2", code: "ivanov", name: "Иванов Иван" },
		]);
		expect(matched?.name).toBe("Якупова Мария");
	});

	it("matches customer by code or name", () => {
		const matched = matchCustomerByText("ДАДМ", [
			{ id: "1", code: "dadm", name: "ДАДМ" },
			{ id: "2", code: "umrv", name: "УМРВ" },
		]);
		expect(matched?.name).toBe("ДАДМ");
	});

	it("maps manager status to closest board column", () => {
		expect(resolveBestStatusColumnId("В очереди", COLUMNS).columnId).toBe("todo");
		expect(resolveBestStatusColumnId("Готово", COLUMNS).columnId).toBe("done");
		expect(resolveBestStatusColumnId("На проверке", COLUMNS).columnId).toBe(
			"review",
		);
		expect(resolveBestStatusColumnId("Тестирование", COLUMNS).columnId).toBe(
			"qa",
		);
	});
});
