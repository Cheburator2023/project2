import { ConflictException } from "@nestjs/common";
import { KanbanBoardTaskLockEntity } from "../../../../src/modules/kanban-board/entities/kanban-board-task-lock.entity";
import { KanbanBoardTaskLockService } from "../../../../src/modules/kanban-board/services/kanban-board-task-lock.service";

const TASK_A = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const TASK_B = "01ARZ3NDEKTSV4RRFFQ69G5FBW";

const LEAD = { label: "test_ds_lead", userId: "lead-1" };
const DS = { label: "test_ds", userId: "ds-1" };

function createService() {
	const rows = new Map<string, KanbanBoardTaskLockEntity>();
	const deleteQb = {
		delete: jest.fn().mockReturnThis(),
		where: jest.fn().mockReturnThis(),
		execute: jest.fn(async () => {
			const now = Date.now();
			for (const [id, row] of [...rows.entries()]) {
				if (row.expiresAt.getTime() <= now) rows.delete(id);
			}
			return { affected: 0 };
		}),
	};
	const lockRepository = {
		findOne: jest.fn(
			async ({ where }: { where: { taskId: string } }) =>
				rows.get(where.taskId) ?? null,
		),
		create: jest.fn((data: Partial<KanbanBoardTaskLockEntity>) => {
			const entity = new KanbanBoardTaskLockEntity();
			Object.assign(entity, data);
			return entity;
		}),
		save: jest.fn(async (entity: KanbanBoardTaskLockEntity) => {
			rows.set(entity.taskId, entity);
			return entity;
		}),
		delete: jest.fn(async ({ taskId }: { taskId: string }) => {
			rows.delete(taskId);
			return { affected: 1 };
		}),
		update: jest.fn(async () => ({ affected: 1 })),
		createQueryBuilder: jest.fn(() => deleteQb),
	};
	const taskRepository = {
		findOne: jest.fn(async ({ where }: { where: { id: string } }) =>
			where.id === TASK_A || where.id === TASK_B ? { id: where.id } : null,
		),
	};
	const service = new KanbanBoardTaskLockService(
		lockRepository as never,
		taskRepository as never,
	);
	return { service, rows, lockRepository };
}

describe("KanbanBoardTaskLockService socket occupancy", () => {
	it("releases the lock when the last socket disconnects so the next user can edit", async () => {
		const { service, rows } = createService();
		await service.acquire(TASK_A, LEAD, "socket-lead");

		expect(rows.has(TASK_A)).toBe(true);

		const released = await service.releaseAllForSocket("socket-lead");

		expect(released).toEqual([TASK_A]);
		expect(rows.has(TASK_A)).toBe(false);
		await expect(
			service.acquire(TASK_A, DS, "socket-ds"),
		).resolves.toMatchObject({
			lockedByLabel: "test_ds",
		});
	});

	it("keeps the lock when another tab of the same user is still connected", async () => {
		const { service, rows } = createService();
		await service.acquire(TASK_A, LEAD, "tab-a");
		await service.acquire(TASK_A, LEAD, "tab-b");

		const released = await service.releaseAllForSocket("tab-a");

		expect(released).toEqual([]);
		expect(rows.has(TASK_A)).toBe(true);

		const last = await service.releaseAllForSocket("tab-b");
		expect(last).toEqual([TASK_A]);
		expect(rows.has(TASK_A)).toBe(false);
	});

	it("rejects a second user while the first socket still holds the task", async () => {
		const { service } = createService();
		await service.acquire(TASK_A, LEAD, "socket-lead");

		await expect(service.acquire(TASK_A, DS, "socket-ds")).rejects.toBeInstanceOf(
			ConflictException,
		);
	});

	it("explicit leave does not delete the row while another socket still holds it", async () => {
		const { service, rows } = createService();
		await service.acquire(TASK_A, LEAD, "tab-a");
		await service.acquire(TASK_A, LEAD, "tab-b");

		const didRelease = await service.release(TASK_A, LEAD, "tab-a");

		expect(didRelease).toBe(false);
		expect(rows.has(TASK_A)).toBe(true);
	});

	it("extends TTL for tasks that still have a live socket", async () => {
		const { service, lockRepository } = createService();
		await service.acquire(TASK_A, LEAD, "socket-lead");

		await service.bumpExpiryForTracked();

		expect(lockRepository.update).toHaveBeenCalledTimes(1);
	});
});
