import {
	Injectable,
	Logger,
	OnModuleDestroy,
	OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { V2QuestionnaireExportJobEntity } from "../entities/v2-questionnaire-export-job.entity";
import { V2QuestionnaireExportJobFileEntity } from "../entities/v2-questionnaire-export-job-file.entity";
import { V2QuestionnaireExportJobFileChunkEntity } from "../entities/v2-questionnaire-export-job-file-chunk.entity";
import { createExportChunkWritable } from "../utils/v2-questionnaire-export-chunk.util";
import { V2QuestionnaireService } from "./v2-questionnaire.service";
import { EXPORT_JOB_ORPHAN_MS } from "./v2-questionnaire-export-job.service";

const TICK_MS = 2000;
const CLEANUP_EVERY_MS = 6 * 60 * 60 * 1000;
const RETENTION_DAYS = 7;
const STALE_MINUTES = Number(process.env.V2_EXPORT_STALE_MINUTES ?? 30);
const ORPHAN_SECONDS = Math.max(15, Math.round(EXPORT_JOB_ORPHAN_MS / 1000));
const PROGRESS_EVERY_ROWS = 100;

@Injectable()
export class V2QuestionnaireExportWorkerService
	implements OnModuleInit, OnModuleDestroy
{
	private readonly logger = new Logger(V2QuestionnaireExportWorkerService.name);
	private tickTimer: NodeJS.Timeout | null = null;
	private generating = false;
	private lastCleanupAt = 0;

	constructor(
		private readonly dataSource: DataSource,
		@InjectRepository(V2QuestionnaireExportJobEntity)
		private readonly jobRepository: Repository<V2QuestionnaireExportJobEntity>,
		@InjectRepository(V2QuestionnaireExportJobFileEntity)
		private readonly fileRepository: Repository<V2QuestionnaireExportJobFileEntity>,
		@InjectRepository(V2QuestionnaireExportJobFileChunkEntity)
		private readonly chunkRepository: Repository<V2QuestionnaireExportJobFileChunkEntity>,
		private readonly questionnaireService: V2QuestionnaireService,
	) {}

	onModuleInit(): void {
		void this.tick();
		this.tickTimer = setInterval(() => {
			void this.tick();
		}, TICK_MS);
	}

	onModuleDestroy(): void {
		if (this.tickTimer) clearInterval(this.tickTimer);
		this.tickTimer = null;
	}

	async tick(): Promise<void> {
		if (this.generating) return;
		this.generating = true;
		try {
			await this.requeueOrphanedProcessingJobs();
			await this.failStaleProcessingJobs();
			if (Date.now() - this.lastCleanupAt >= CLEANUP_EVERY_MS) {
				this.lastCleanupAt = Date.now();
				await this.cleanupOldJobs();
			}
			const job = await this.claimPendingJob();
			if (job) await this.generate(job);
		} catch (error) {
			this.logger.error(
				`Export worker tick failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		} finally {
			this.generating = false;
		}
	}

	private quotedJobTable(): string {
		const schema = this.jobRepository.metadata.schema;
		const table = this.jobRepository.metadata.tableName;
		return schema ? `"${schema}"."${table}"` : `"${table}"`;
	}

	async claimPendingJob(): Promise<V2QuestionnaireExportJobEntity | null> {
		const table = this.quotedJobTable();
		const id = await this.dataSource.transaction(async (manager) => {
			const selected = unwrapTypeormRows(
				await manager.query(
					`
					SELECT id FROM ${table}
					WHERE status = 'pending'
					ORDER BY created_at ASC
					FOR UPDATE SKIP LOCKED
					LIMIT 1
					`,
				),
			);
			const claimedId = readClaimedJobId(selected);
			if (!claimedId) return null;
			await manager.query(
				`
				UPDATE ${table}
				SET status = 'processing', updated_at = NOW()
				WHERE id = $1
				`,
				[claimedId],
			);
			return claimedId;
		});
		if (!id) return null;
		const job = await this.jobRepository.findOne({ where: { id } });
		if (!job) {
			this.logger.error(`Claimed export job ${id} but findOne returned null`);
			return null;
		}
		this.logger.log(`Claimed export job ${id}`);
		return job;
	}

	async requeueOrphanedProcessingJobs(): Promise<void> {
		const table = this.quotedJobTable();
		const result = await this.dataSource.query(
			`
			UPDATE ${table}
			SET status = 'pending',
				error = NULL,
				updated_at = NOW()
			WHERE status = 'processing'
				AND total IS NULL
				AND progress = 0
				AND updated_at < NOW() - ($1::int * INTERVAL '1 second')
			`,
			[ORPHAN_SECONDS],
		);
		const affected = typeormAffected(result);
		if (affected > 0) {
			this.logger.warn(
				`Requeued ${affected} orphaned export job(s) stuck in processing without progress`,
			);
		}
	}

	private async failStaleProcessingJobs(): Promise<void> {
		const minutes = Number.isFinite(STALE_MINUTES) && STALE_MINUTES > 0
			? STALE_MINUTES
			: 30;
		const table = this.quotedJobTable();
		await this.dataSource.query(
			`
			UPDATE ${table}
			SET status = 'failed',
				error = 'Прервано: воркер не завершил генерацию',
				updated_at = NOW()
			WHERE status = 'processing'
				AND updated_at < NOW() - ($1::int * INTERVAL '1 minute')
			`,
			[minutes],
		);
	}

	private async cleanupOldJobs(): Promise<void> {
		const table = this.quotedJobTable();
		await this.dataSource.query(
			`
			DELETE FROM ${table}
			WHERE created_at < NOW() - ($1::int * INTERVAL '1 day')
			`,
			[RETENTION_DAYS],
		);
	}

	private async generate(job: V2QuestionnaireExportJobEntity): Promise<void> {
		this.logger.log(`Export job ${job.id}: generation started`);
		try {
			await this.chunkRepository.delete({ jobId: job.id });
			await this.fileRepository.delete({ jobId: job.id });
			const sink = createExportChunkWritable(async (chunkIndex, content) => {
				await this.chunkRepository.insert({
					jobId: job.id,
					chunkIndex,
					content,
				});
			});
			const result = await this.questionnaireService.exportRegistryXlsx(
				job.requestedIds ?? undefined,
				{ groups: job.userGroups ?? [] },
				async (done, total) => {
					if (done % PROGRESS_EVERY_ROWS !== 0 && done !== total) return;
					await this.jobRepository.update(job.id, {
						progress: done,
						total,
						updatedAt: new Date(),
					});
				},
				sink,
			);
			await this.fileRepository.save(
				this.fileRepository.create({
					jobId: job.id,
					filename: job.filename ?? `v2-questionnaires-${job.id}.xlsx`,
					sizeBytes: sink.sizeBytes,
				}),
			);
			await this.jobRepository.update(job.id, {
				status: "done",
				progress: result.rowCount,
				total: result.rowCount,
				error: null,
			});
			this.logger.log(
				`Export job ${job.id}: done, ${result.rowCount} rows, ${sink.sizeBytes} bytes, ${sink.chunkCount} chunks`,
			);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error(`Export job ${job.id} failed: ${message}`);
			await this.jobRepository.update(job.id, {
				status: "failed",
				error: message,
			});
		}
	}
}

/** TypeORM `query()` for UPDATE/DELETE often returns `[rawRows, affectedCount]`. */
export function unwrapTypeormRows(result: unknown): unknown[] {
	if (!Array.isArray(result)) return [];
	if (
		result.length === 2 &&
		Array.isArray(result[0]) &&
		typeof result[1] === "number"
	) {
		return result[0];
	}
	return result;
}

export function typeormAffected(result: unknown): number {
	if (
		Array.isArray(result) &&
		result.length === 2 &&
		typeof result[1] === "number"
	) {
		return result[1];
	}
	return 0;
}

export function readClaimedJobId(rows: unknown): string | null {
	const list = unwrapTypeormRows(rows);
	if (list.length === 0) return null;
	const row = list[0];
	if (typeof row === "string" && row.trim()) return row.trim();
	if (!row || typeof row !== "object") return null;
	const record = row as Record<string, unknown>;
	const value = record.id ?? record.ID ?? Object.values(record)[0];
	return typeof value === "string" && value.trim() ? value.trim() : null;
}
