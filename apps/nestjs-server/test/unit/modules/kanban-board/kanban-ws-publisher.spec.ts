import { KanbanWsPublisher } from "../../../../src/modules/kanban-board/services/kanban-ws-publisher.service";

describe("KanbanWsPublisher", () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("batches task ids for the same board so clients refetch once", () => {
		const publisher = new KanbanWsPublisher();
		const emit = jest.fn();
		publisher.attachSync(emit);

		publisher.publishTaskChanged("board-1", "task-a");
		publisher.publishTaskChanged("board-1", "task-b");

		expect(emit).not.toHaveBeenCalled();
		jest.advanceTimersByTime(50);

		expect(emit).toHaveBeenCalledTimes(1);
		expect(emit.mock.calls[0]?.[0]).toEqual({
			boardId: "board-1",
			taskIds: ["task-a", "task-b"],
		});
	});
});
