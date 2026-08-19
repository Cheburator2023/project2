import { ConflictException } from "@nestjs/common";
import { V2QuestionnaireEditLockEntity } from "../../../../src/modules/anketa-v2/entities/v2-questionnaire-edit-lock.entity";
import { V2QuestionnaireEditLockService } from "../../../../src/modules/anketa-v2/services/v2-questionnaire-edit-lock.service";

const Q_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const LEAD = { label: "test_ds_lead", userId: "lead-1" };
const DS = { label: "test_ds", userId: "ds-1" };

function createService() {
	const rows = new Map<string, V2QuestionnaireEditLockEntity>();
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
			async ({ where }: { where: { questionnaireId: string } }) =>
				rows.get(where.questionnaireId) ?? null,
		),
		create: jest.fn((data: Partial<V2QuestionnaireEditLockEntity>) => {
			const entity = new V2QuestionnaireEditLockEntity();
			Object.assign(entity, data);
			return entity;
		}),
		save: jest.fn(async (entity: V2QuestionnaireEditLockEntity) => {
			rows.set(entity.questionnaireId, entity);
			return entity;
		}),
		delete: jest.fn(async ({ questionnaireId }: { questionnaireId: string }) => {
			rows.delete(questionnaireId);
			return { affected: 1 };
		}),
		update: jest.fn(async () => ({ affected: 1 })),
		createQueryBuilder: jest.fn(() => deleteQb),
	};
	const questionnaireRepository = {
		findOne: jest.fn(async ({ where }: { where: { id: string } }) =>
			where.id === Q_ID || where.id === OTHER_ID ? { id: where.id } : null,
		),
	};
	const service = new V2QuestionnaireEditLockService(
		lockRepository as never,
		questionnaireRepository as never,
	);
	return { service, rows, lockRepository, questionnaireRepository };
}

describe("V2QuestionnaireEditLockService socket occupancy", () => {
	it("releases the lock when the last socket disconnects so the next user can edit", async () => {
		const { service, rows } = createService();
		await service.acquire(Q_ID, LEAD, "socket-lead");

		expect(rows.has(Q_ID)).toBe(true);

		const released = await service.releaseAllForSocket("socket-lead");

		expect(released).toEqual([Q_ID]);
		expect(rows.has(Q_ID)).toBe(false);
		await expect(service.acquire(Q_ID, DS, "socket-ds")).resolves.toMatchObject({
			lockedByLabel: "test_ds",
		});
	});

	it("keeps the lock when another tab of the same user is still connected", async () => {
		const { service, rows } = createService();
		await service.acquire(Q_ID, LEAD, "tab-a");
		await service.acquire(Q_ID, LEAD, "tab-b");

		const released = await service.releaseAllForSocket("tab-a");

		expect(released).toEqual([]);
		expect(rows.has(Q_ID)).toBe(true);

		const last = await service.releaseAllForSocket("tab-b");
		expect(last).toEqual([Q_ID]);
		expect(rows.has(Q_ID)).toBe(false);
	});

	it("does not free a lock acquired without a socket on disconnect — HTTP occupancy cannot see closed tabs", async () => {
		const { service, rows } = createService();
		await service.acquire(Q_ID, LEAD);

		const released = await service.releaseAllForSocket("unrelated-socket");

		expect(released).toEqual([]);
		expect(rows.has(Q_ID)).toBe(true);
	});

	it("rejects a second user while the first socket still holds the questionnaire", async () => {
		const { service } = createService();
		await service.acquire(Q_ID, LEAD, "socket-lead");

		await expect(service.acquire(Q_ID, DS, "socket-ds")).rejects.toBeInstanceOf(
			ConflictException,
		);
	});

	it("explicit leave does not delete the row while another socket still holds it", async () => {
		const { service, rows } = createService();
		await service.acquire(Q_ID, LEAD, "tab-a");
		await service.acquire(Q_ID, LEAD, "tab-b");

		const didRelease = await service.release(Q_ID, LEAD, "tab-a");

		expect(didRelease).toBe(false);
		expect(rows.has(Q_ID)).toBe(true);
	});

	it("extends TTL for questionnaires that still have a live socket", async () => {
		const { service, lockRepository } = createService();
		await service.acquire(Q_ID, LEAD, "socket-lead");

		await service.bumpExpiryForTracked();

		expect(lockRepository.update).toHaveBeenCalledTimes(1);
	});

	it("acquires occupancy even if a replica read would miss a freshly inserted questionnaire", async () => {
		const { service, questionnaireRepository } = createService();
		questionnaireRepository.findOne.mockResolvedValue(null);

		await expect(
			service.acquire(Q_ID, LEAD, "socket-lead"),
		).resolves.toMatchObject({
			questionnaireId: Q_ID,
			lockedByLabel: "test_ds_lead",
		});
	});
});
