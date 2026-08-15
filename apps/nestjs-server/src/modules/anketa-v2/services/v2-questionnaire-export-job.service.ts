import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, QueryFailedError, Repository } from "typeorm";
import { V2QuestionnaireExportJobEntity } from "../entities/v2-questionnaire-export-job.entity";
import { V2QuestionnaireExportJobFileEntity } from "../entities/v2-questionnaire-export-job-file.entity";
import { V2QuestionnaireExportJobFileChunkEntity } from "../entities/v2-questionnaire-export-job-file-chunk.entity";

export type V2QuestionnaireExportJobStatusDto = {
	jobId: string;
	status: V2QuestionnaireExportJobEntity["status"];
	progress: number;
	total: number | null;
	error: string | null;
	filename: string | null;
};

export type V2QuestionnaireExportJobCreateResult = {
	jobId: string;
};

export const V2_EXPORT_IN_FLIGHT_MESSAGE =
	"Выгрузка уже выполняется. Дождитесь окончания и повторите.";

@Injectable()
export class V2QuestionnaireExportJobService {
	constructor(
		@InjectRepository(V2QuestionnaireExportJobEntity)
		private readonly jobRepository: Repository<V2QuestionnaireExportJobEntity>,
		@InjectRepository(V2QuestionnaireExportJobFileEntity)
		private readonly fileRepository: Repository<V2QuestionnaireExportJobFileEntity>,
		@InjectRepository(V2QuestionnaireExportJobFileChunkEntity)
		private readonly chunkRepository: Repository<V2QuestionnaireExportJobFileChunkEntity>,
	) {}

	async enqueue(
		ids: string[] | undefined,
		user?: Record<string, unknown>,
	): Promise<V2QuestionnaireExportJobCreateResult> {
		const requestedIds =
			ids && ids.length > 0 ? [...new Set(ids)] : null;
		const createdBy = exportJobUserId(user);
		const groups = Array.isArray(user?.groups)
			? user.groups.filter((group): group is string => typeof group === "string")
			: [];
		const date = new Date().toISOString().slice(0, 10);
		const filename = requestedIds
			? `v2-questionnaires-selected-${requestedIds.length}-${date}.xlsx`
			: `v2-questionnaires-all-${date}.xlsx`;

		const inFlight = await this.jobRepository.find({
			where: { status: In(["pending", "processing"]) },
			order: { createdAt: "ASC" },
			take: 16,
		});
		const live = inFlight.filter((job) => !isAbandonedExportJob(job));
		const abandoned = inFlight.filter((job) => isAbandonedExportJob(job));

		if (!requestedIds && createdBy) {
			const openAll = live.find(
				(job) => job.requestedIds == null && job.createdBy === createdBy,
			);
			if (openAll) return { jobId: openAll.id };
		}

		if (live.length > 0) {
			throw new ConflictException(V2_EXPORT_IN_FLIGHT_MESSAGE);
		}

		if (abandoned.length > 0) {
			await this.jobRepository.update(
				abandoned.map((job) => job.id),
				{
					status: "failed",
					error: "Прервано: воркер не завершил генерацию",
				},
			);
		}

		const job = this.jobRepository.create({
			status: "pending",
			progress: 0,
			total: requestedIds?.length ?? null,
			error: null,
			requestedIds,
			userGroups: groups,
			createdBy,
			filename,
		});
		try {
			const saved = await this.jobRepository.save(job);
			return { jobId: saved.id };
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				throw new ConflictException(V2_EXPORT_IN_FLIGHT_MESSAGE);
			}
			throw error;
		}
	}

	async getLock(): Promise<{ busy: boolean }> {
		const inFlight = await this.jobRepository.find({
			where: { status: In(["pending", "processing"]) },
			take: 16,
		});
		return {
			busy: inFlight.some((job) => !isAbandonedExportJob(job)),
		};
	}

	async getStatus(jobId: string): Promise<V2QuestionnaireExportJobStatusDto> {
		const job = await this.jobRepository.findOne({ where: { id: jobId } });
		if (!job) throw new NotFoundException(`Экспорт ${jobId} не найден`);
		return {
			jobId: job.id,
			status: job.status,
			progress: job.progress,
			total: job.total,
			error: job.error,
			filename: job.filename,
		};
	}

	async getDownloadMeta(jobId: string): Promise<{
		filename: string;
		sizeBytes: number;
	}> {
		await this.requireDoneJob(jobId);
		const file = await this.fileRepository.findOne({ where: { jobId } });
		if (!file) {
			throw new NotFoundException("Файл экспорта не найден");
		}
		return {
			filename: file.filename,
			sizeBytes: file.sizeBytes,
		};
	}

	async *iterateDownloadChunks(jobId: string): AsyncGenerator<Buffer> {
		await this.requireDoneJob(jobId);
		const indices = await this.chunkRepository.find({
			where: { jobId },
			select: ["chunkIndex"],
			order: { chunkIndex: "ASC" },
		});
		if (indices.length === 0) {
			throw new NotFoundException("Файл экспорта не найден");
		}
		for (const { chunkIndex } of indices) {
			const row = await this.chunkRepository.findOne({
				where: { jobId, chunkIndex },
			});
			if (!row) {
				throw new NotFoundException("Файл экспорта повреждён");
			}
			yield Buffer.isBuffer(row.content)
				? row.content
				: Buffer.from(row.content);
		}
	}

	private async requireDoneJob(jobId: string): Promise<V2QuestionnaireExportJobEntity> {
		const job = await this.jobRepository.findOne({ where: { id: jobId } });
		if (!job) throw new NotFoundException(`Экспорт ${jobId} не найден`);
		if (job.status !== "done") {
			throw new BadRequestException(
				job.status === "failed"
					? job.error || "Экспорт завершился с ошибкой"
					: "Файл ещё не готов",
			);
		}
		return job;
	}
}

export const EXPORT_JOB_ORPHAN_MS = 90_000;

export function isAbandonedExportJob(job: {
	status: string;
	total: number | null;
	updatedAt?: Date | string | null;
}): boolean {
	if (job.status !== "processing") return false;
	if (job.total != null) return false;
	if (!job.updatedAt) return true;
	const updated = new Date(job.updatedAt).getTime();
	if (!Number.isFinite(updated)) return true;
	return Date.now() - updated >= EXPORT_JOB_ORPHAN_MS;
}

export function exportJobUserId(
	user: Record<string, unknown> | undefined,
): string | null {
	if (!user) return null;
	const id = user.id ?? user.sub ?? user.preferred_username ?? user.login;
	return typeof id === "string" && id.trim() ? id.trim() : null;
}

function isPostgresUniqueViolation(error: unknown): boolean {
	if (error instanceof QueryFailedError) {
		const driver = error.driverError as { code?: string } | undefined;
		return driver?.code === "23505";
	}
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: string }).code === "23505"
	);
}
