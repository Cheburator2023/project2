import {
	readClaimedJobId,
	typeormAffected,
	unwrapTypeormRows,
	V2QuestionnaireExportWorkerService,
} from "../../../../src/modules/anketa-v2/services/v2-questionnaire-export-worker.service";

function dataSourceWithTransaction(query: jest.Mock) {
	return {
		query,
		transaction: jest.fn(async (fn: (manager: { query: jest.Mock }) => unknown) =>
			fn({ query }),
		),
	};
}

describe("V2QuestionnaireExportWorkerService.claimPendingJob", () => {
	it("claims exactly one pending job with SKIP LOCKED so replicas do not share it", async () => {
		const query = jest.fn(async (sql: string) => {
			if (sql.includes("FOR UPDATE SKIP LOCKED")) {
				expect(sql).toContain("status = 'pending'");
				return [{ id: "job-claimed" }];
			}
			expect(sql).toContain("status = 'processing'");
			return [[], 1];
		});
		const jobRepository = {
			metadata: { schema: undefined, tableName: "v2_questionnaire_export_job" },
			findOne: jest.fn(async ({ where }: { where: { id: string } }) => ({
				id: where.id,
				status: "processing",
			})),
		};
		const worker = new V2QuestionnaireExportWorkerService(
			dataSourceWithTransaction(query) as never,
			jobRepository as never,
			{} as never,
			{} as never,
			{} as never,
		);

		const claimed = await worker.claimPendingJob();
		expect(claimed?.id).toBe("job-claimed");
		expect(query).toHaveBeenCalledTimes(2);
	});

	it("does not treat TypeORM [rows, affected] as a claimed id", () => {
		expect(readClaimedJobId([[], 1])).toBeNull();
		expect(readClaimedJobId([{ id: "a" }])).toBe("a");
		expect(readClaimedJobId([{ ID: "b" }])).toBe("b");
		expect(unwrapTypeormRows([[], 2])).toEqual([]);
		expect(typeormAffected([[], 2])).toBe(2);
		expect(typeormAffected([{ id: "x" }])).toBe(0);
	});

	it("requeues processing jobs that never received total using affected count", async () => {
		const query = jest.fn(async (sql: string) => {
			expect(sql).toContain("status = 'processing'");
			expect(sql).toContain("total IS NULL");
			expect(sql).toContain("status = 'pending'");
			return [[], 2];
		});
		const worker = new V2QuestionnaireExportWorkerService(
			{ query } as never,
			{
				metadata: { schema: undefined, tableName: "v2_questionnaire_export_job" },
			} as never,
			{} as never,
			{} as never,
			{} as never,
		);
		await worker.requeueOrphanedProcessingJobs();
		expect(query).toHaveBeenCalledTimes(1);
	});

	it("returns null when the queue is empty", async () => {
		const query = jest.fn(async () => []);
		const worker = new V2QuestionnaireExportWorkerService(
			dataSourceWithTransaction(query) as never,
			{
				metadata: { schema: undefined, tableName: "v2_questionnaire_export_job" },
				findOne: jest.fn(),
			} as never,
			{} as never,
			{} as never,
			{} as never,
		);
		await expect(worker.claimPendingJob()).resolves.toBeNull();
	});
});

describe("V2QuestionnaireExportWorkerService.generate", () => {
	it("marks the job failed with error text instead of leaving it processing", async () => {
		const jobRepository = {
			metadata: { schema: undefined, tableName: "v2_questionnaire_export_job" },
			update: jest.fn(async () => undefined),
		};
		const worker = new V2QuestionnaireExportWorkerService(
			{ query: jest.fn() } as never,
			jobRepository as never,
			{ delete: jest.fn(), create: jest.fn(), save: jest.fn() } as never,
			{ delete: jest.fn(), insert: jest.fn() } as never,
			{
				exportRegistryXlsx: jest.fn(async () => {
					throw new Error("heap cap");
				}),
			} as never,
		);

		await (
			worker as unknown as {
				generate: (job: {
					id: string;
					requestedIds: string[] | null;
					userGroups: string[];
					filename: string;
				}) => Promise<void>;
			}
		).generate({
			id: "job-fail",
			requestedIds: null,
			userGroups: [],
			filename: "out.xlsx",
		});

		expect(jobRepository.update).toHaveBeenCalledWith("job-fail", {
			status: "failed",
			error: "heap cap",
		});
	});
});
