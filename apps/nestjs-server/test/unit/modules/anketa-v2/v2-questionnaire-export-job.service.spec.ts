import { BadRequestException, ConflictException } from "@nestjs/common";
import {
	V2_EXPORT_IN_FLIGHT_MESSAGE,
	V2QuestionnaireExportJobService,
} from "../../../../src/modules/anketa-v2/services/v2-questionnaire-export-job.service";

function createService(
	jobRepository: object,
	fileRepository: object = { findOne: jest.fn() },
	chunkRepository: object = { find: jest.fn(), findOne: jest.fn() },
) {
	return new V2QuestionnaireExportJobService(
		jobRepository as never,
		fileRepository as never,
		chunkRepository as never,
	);
}

describe("V2QuestionnaireExportJobService", () => {
	it("enqueues a pending job and returns jobId without generating xlsx", async () => {
		const saved = { id: "job-1" };
		const jobRepository = {
			create: jest.fn((row) => row),
			save: jest.fn(async () => saved),
			find: jest.fn(async () => []),
			findOne: jest.fn(),
			update: jest.fn(),
		};
		const service = createService(jobRepository);

		const result = await service.enqueue(undefined, {
			preferred_username: "ivan",
			groups: ["/DE/ModelOps"],
		});

		expect(result).toEqual({ jobId: "job-1" });
		expect(jobRepository.save).toHaveBeenCalledTimes(1);
		expect(jobRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				status: "pending",
				requestedIds: null,
				createdBy: "ivan",
			}),
		);
	});

	it("reuses an in-flight all-export for the same user instead of stacking jobs", async () => {
		const jobRepository = {
			create: jest.fn(),
			save: jest.fn(),
			find: jest.fn(async () => [
				{
					id: "open-1",
					requestedIds: null,
					status: "processing",
					total: 2500,
					createdBy: "ivan",
					updatedAt: new Date(),
				},
			]),
			findOne: jest.fn(),
		};
		const service = createService(jobRepository);

		const result = await service.enqueue(undefined, {
			preferred_username: "ivan",
		});
		expect(result.jobId).toBe("open-1");
		expect(jobRepository.save).not.toHaveBeenCalled();
	});

	it("does not reuse a processing all-export that never received total", async () => {
		const saved = { id: "job-new" };
		const jobRepository = {
			create: jest.fn((row) => row),
			save: jest.fn(async () => saved),
			update: jest.fn(),
			find: jest.fn(async () => [
				{
					id: "stuck-1",
					requestedIds: null,
					status: "processing",
					total: null,
					updatedAt: new Date(Date.now() - 5 * 60 * 1000),
				},
			]),
			findOne: jest.fn(),
		};
		const service = createService(jobRepository);

		const result = await service.enqueue(undefined, {
			preferred_username: "ivan",
		});
		expect(result.jobId).toBe("job-new");
		expect(jobRepository.update).toHaveBeenCalled();
		expect(jobRepository.save).toHaveBeenCalledTimes(1);
	});

	it("rejects a second export while another client already has one in flight", async () => {
		const service = createService({
			create: jest.fn(),
			save: jest.fn(),
			find: jest.fn(async () => [
				{
					id: "other-1",
					requestedIds: null,
					status: "processing",
					total: 100,
					createdBy: "olga",
					updatedAt: new Date(),
				},
			]),
		});
		await expect(
			service.enqueue(undefined, { preferred_username: "ivan" }),
		).rejects.toMatchObject({
			message: V2_EXPORT_IN_FLIGHT_MESSAGE,
		});
		await expect(
			service.enqueue(undefined, { preferred_username: "ivan" }),
		).rejects.toBeInstanceOf(ConflictException);
	});

	it("reports the global lock as busy when a live export exists", async () => {
		const service = createService({
			find: jest.fn(async () => [
				{
					id: "open-1",
					status: "pending",
					total: null,
					updatedAt: new Date(),
				},
			]),
		});
		await expect(service.getLock()).resolves.toEqual({ busy: true });
	});

	it("refuses download until the job is done", async () => {
		const service = createService({
			findOne: jest.fn(async () => ({
				id: "job-1",
				status: "processing",
			})),
		});
		await expect(service.getDownloadMeta("job-1")).rejects.toBeInstanceOf(
			BadRequestException,
		);
	});

	it("yields download chunks one at a time without concatenating", async () => {
		const chunks = new Map([
			[0, Buffer.from("aaa")],
			[1, Buffer.from("bbb")],
		]);
		const service = createService(
			{
				findOne: jest.fn(async () => ({ id: "job-1", status: "done" })),
			},
			{ findOne: jest.fn() },
			{
				find: jest.fn(async () => [{ chunkIndex: 0 }, { chunkIndex: 1 }]),
				findOne: jest.fn(async ({ where }: { where: { chunkIndex: number } }) => ({
					content: chunks.get(where.chunkIndex),
				})),
			},
		);
		const received: string[] = [];
		for await (const chunk of service.iterateDownloadChunks("job-1")) {
			received.push(chunk.toString());
		}
		expect(received).toEqual(["aaa", "bbb"]);
	});
});
