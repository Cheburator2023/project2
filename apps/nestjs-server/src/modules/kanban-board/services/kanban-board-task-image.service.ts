import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
	OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
	KANBAN_BOARD_TASK_IMAGE_MAX_FULL_BYTES,
	normalizeKanbanBoardTaskContent,
	type KanbanBoardTaskImageDto,
} from "@smart-anketa/api-contract";
import { access, mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { In, Repository } from "typeorm";
import { ulid } from "ulid";
import { KanbanBoardTaskImageEntity } from "../entities/kanban-board-task-image.entity";
import { KanbanBoardTaskEntity } from "../entities/kanban-board-task.entity";
import {
	kanbanBoardTaskImageExtension,
	kanbanBoardTaskImageReadCandidates,
	kanbanBoardTaskImageRefsEqual,
	kanbanBoardTaskImageStoragePaths,
} from "../utils/kanban-board-task-image.util";

const ALLOWED_MIME = new Set(["image/webp", "image/png"]);

@Injectable()
export class KanbanBoardTaskImageService implements OnModuleInit {
	private readonly logger = new Logger(KanbanBoardTaskImageService.name);
	private readonly uploadRoot = resolve(
		process.env.KANBAN_TASK_IMAGES_DIR ??
			join(process.cwd(), "data", "kanban-task-images"),
	);

	constructor(
		@InjectRepository(KanbanBoardTaskImageEntity)
		private readonly imageRepository: Repository<KanbanBoardTaskImageEntity>,
		@InjectRepository(KanbanBoardTaskEntity)
		private readonly taskRepository: Repository<KanbanBoardTaskEntity>,
	) {}

	onModuleInit(): void {
		if (process.env.KANBAN_TASK_IMAGES_BACKFILL_BLOBS === "false") {
			return;
		}
		void this.backfillMissingBlobsFromDisk();
	}

	async listForTask(taskId: string): Promise<KanbanBoardTaskImageDto[]> {
		await this.ensureTaskExists(taskId);
		const rows = await this.imageRepository.find({
			where: { taskId },
			order: { createdAt: "ASC" },
		});
		const readable: KanbanBoardTaskImageDto[] = [];
		for (const row of rows) {
			if (await this.canServeImage(row)) {
				readable.push(this.toDto(row));
			}
		}
		return readable;
	}

	async syncTaskContentImages(task: KanbanBoardTaskEntity): Promise<boolean> {
		const images = await this.listForTask(task.id);
		const current = task.content.images ?? [];
		if (kanbanBoardTaskImageRefsEqual(current, images)) {
			return false;
		}
		task.content = normalizeKanbanBoardTaskContent({
			...task.content,
			images: images.length ? images : undefined,
		});
		await this.taskRepository.save(task);
		return true;
	}

	async syncTasksContentImages(tasks: KanbanBoardTaskEntity[]): Promise<void> {
		if (!tasks.length) return;

		const taskIds = tasks.map((task) => task.id);
		const rows = await this.imageRepository.find({
			where: { taskId: In(taskIds) },
			order: { createdAt: "ASC" },
		});
		const imagesByTaskId = new Map<string, KanbanBoardTaskImageDto[]>();
		for (const row of rows) {
			const dto = this.toDto(row);
			const bucket = imagesByTaskId.get(row.taskId) ?? [];
			bucket.push(dto);
			imagesByTaskId.set(row.taskId, bucket);
		}

		const toSave: KanbanBoardTaskEntity[] = [];
		for (const task of tasks) {
			const images = imagesByTaskId.get(task.id) ?? [];
			const current = task.content.images ?? [];
			if (kanbanBoardTaskImageRefsEqual(current, images)) continue;
			task.content = normalizeKanbanBoardTaskContent({
				...task.content,
				images: images.length ? images : undefined,
			});
			toSave.push(task);
		}

		if (toSave.length) {
			await this.taskRepository.save(toSave);
		}
	}

	async upload(
		taskId: string,
		payload: {
			originalName: string;
			mimeType: string;
			width: number;
			height: number;
			full: Buffer;
			thumb: Buffer;
		},
	): Promise<KanbanBoardTaskImageDto> {
		await this.ensureTaskExists(taskId);
		this.validateUpload(payload);

		const id = ulid();
		const ext = kanbanBoardTaskImageExtension(payload.mimeType);
		// Относительные пути в БД — всегда posix (портативно между ОС/подами).
		const relativeFullPath = `${taskId}/${id}-full.${ext}`;
		const relativeThumbPath = `${taskId}/${id}-thumb.${ext}`;

		const createdAt = new Date().toISOString();
		const fullBuffer = Buffer.isBuffer(payload.full)
			? payload.full
			: Buffer.from(payload.full);
		const thumbBuffer = Buffer.isBuffer(payload.thumb)
			? payload.thumb
			: Buffer.from(payload.thumb);

		const entity = this.imageRepository.create({
			id,
			taskId,
			originalName: payload.originalName.slice(0, 255),
			mimeType: payload.mimeType,
			width: payload.width,
			height: payload.height,
			fullByteSize: fullBuffer.length,
			thumbByteSize: thumbBuffer.length,
			fullPath: relativeFullPath,
			thumbPath: relativeThumbPath,
			fullData: fullBuffer,
			thumbData: thumbBuffer,
			createdAt,
		});
		// Blob в БД — источник истины: в k8s часто нет writable volume под data/.
		await this.imageRepository.save(entity);
		await this.appendImageRef(taskId, this.toDto(entity));

		await this.tryWriteDiskFiles(
			taskId,
			relativeFullPath,
			relativeThumbPath,
			fullBuffer,
			thumbBuffer,
		);

		return this.toDto(entity);
	}

	/** Кэш на диск опционален: ошибка FS не должна валить загрузку. */
	private async tryWriteDiskFiles(
		taskId: string,
		relativeFullPath: string,
		relativeThumbPath: string,
		full: Buffer,
		thumb: Buffer,
	): Promise<void> {
		try {
			await mkdir(join(this.uploadRoot, taskId), { recursive: true });
			await writeFile(join(this.uploadRoot, relativeFullPath), full);
			await writeFile(join(this.uploadRoot, relativeThumbPath), thumb);
		} catch (error) {
			this.logger.warn(
				`Не удалось записать изображение задачи на диск (${this.uploadRoot}): ${
					error instanceof Error ? error.message : String(error)
				}. Файл сохранён в БД (bytea).`,
			);
		}
	}

	async readFile(
		taskId: string,
		imageId: string,
		variant: "full" | "thumb",
	): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
		const row = await this.findImageOrThrow(taskId, imageId);
		const buffer = await this.readImageVariant(row, variant);
		return {
			buffer,
			mimeType: row.mimeType,
			fileName: row.originalName,
		};
	}

	async delete(taskId: string, imageId: string): Promise<void> {
		const row = await this.findImageOrThrow(taskId, imageId);
		await this.removeImageFiles(row);
		await this.imageRepository.delete({ id: imageId, taskId });
		await this.removeImageRef(taskId, imageId);
	}

	/** Удаляет все изображения задачи (файлы, строки БД, content.images). */
	async deleteAllForTask(taskId: string): Promise<number> {
		const rows = await this.imageRepository.find({ where: { taskId } });
		if (!rows.length) return 0;

		await Promise.all(rows.map((row) => this.removeImageFiles(row)));
		await this.imageRepository.delete({ taskId });

		const task = await this.taskRepository.findOne({ where: { id: taskId } });
		if (task) {
			const content = normalizeKanbanBoardTaskContent({
				...task.content,
				images: [],
			});
			task.content = content;
			await this.taskRepository.save(task);
		}

		await rm(join(this.uploadRoot, taskId), {
			recursive: true,
			force: true,
		}).catch(() => undefined);

		return rows.length;
	}

	private validateUpload(payload: {
		mimeType: string;
		width: number;
		height: number;
		full: Buffer;
		thumb: Buffer;
	}) {
		if (!ALLOWED_MIME.has(payload.mimeType)) {
			throw new BadRequestException(
				"Допустимы только lossless WebP или PNG после сжатия на клиенте",
			);
		}
		if (payload.full.length > KANBAN_BOARD_TASK_IMAGE_MAX_FULL_BYTES) {
			throw new BadRequestException("Файл слишком большой (макс. 2 МБ)");
		}
		if (!payload.full.length || !payload.thumb.length) {
			throw new BadRequestException("Пустой файл изображения");
		}
		if (
			!Number.isFinite(payload.width) ||
			!Number.isFinite(payload.height) ||
			payload.width <= 0 ||
			payload.height <= 0
		) {
			throw new BadRequestException("Некорректные размеры изображения");
		}
	}

	private async ensureTaskExists(taskId: string) {
		const task = await this.taskRepository.findOne({ where: { id: taskId } });
		if (!task) throw new NotFoundException("Задача не найдена");
		return task;
	}

	private async findImageOrThrow(taskId: string, imageId: string) {
		const row = await this.imageRepository.findOne({
			where: { id: imageId, taskId },
		});
		if (!row) throw new NotFoundException("Изображение не найдено");
		return row;
	}

	private async readImageVariant(
		row: KanbanBoardTaskImageEntity,
		variant: "full" | "thumb",
	): Promise<Buffer> {
		const blob = variant === "thumb" ? row.thumbData : row.fullData;
		if (blob?.length) {
			return blob;
		}

		const candidates = kanbanBoardTaskImageReadCandidates(
			this.uploadRoot,
			row,
			variant,
		);
		for (const filePath of candidates) {
			try {
				const buffer = await readFile(filePath);
				void this.backfillBlobFromFile(row.id, variant, buffer);
				return buffer;
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
					throw error;
				}
			}
		}
		throw new NotFoundException("Файл изображения не найден на сервере");
	}

	private async backfillBlobFromFile(
		imageId: string,
		variant: "full" | "thumb",
		buffer: Buffer,
	): Promise<void> {
		const patch =
			variant === "thumb"
				? { thumbData: buffer }
				: { fullData: buffer };
		await this.imageRepository
			.update({ id: imageId }, patch)
			.catch(() => undefined);
	}

	private async backfillMissingBlobsFromDisk(): Promise<void> {
		try {
			const rows = await this.imageRepository.find();
			let updated = 0;
			for (const row of rows) {
				let rowUpdated = false;
				if (!row.fullData?.length) {
					const buffer = await this.readImageFromDiskOnly(row, "full");
					if (buffer) {
						await this.backfillBlobFromFile(row.id, "full", buffer);
						rowUpdated = true;
					}
				}
				if (!row.thumbData?.length) {
					const buffer = await this.readImageFromDiskOnly(row, "thumb");
					if (buffer) {
						await this.backfillBlobFromFile(row.id, "thumb", buffer);
						rowUpdated = true;
					}
				}
				if (rowUpdated) updated += 1;
			}
			if (updated > 0) {
				this.logger.log(
					`Backfill изображений задач: перенесено в БД записей ${updated}`,
				);
			}
		} catch (error) {
			this.logger.warn(
				"Backfill изображений задач не выполнен",
				error instanceof Error ? error.message : String(error),
			);
		}
	}

	private async readImageFromDiskOnly(
		row: KanbanBoardTaskImageEntity,
		variant: "full" | "thumb",
	): Promise<Buffer | null> {
		const candidates = kanbanBoardTaskImageReadCandidates(
			this.uploadRoot,
			row,
			variant,
		);
		for (const filePath of candidates) {
			try {
				return await readFile(filePath);
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
					throw error;
				}
			}
		}
		return null;
	}

	private async canServeImage(row: KanbanBoardTaskImageEntity): Promise<boolean> {
		if (row.fullData?.length && row.thumbData?.length) {
			return true;
		}
		if (row.fullData?.length || row.thumbData?.length) {
			return true;
		}
		const hasFull = await this.hasStoredFile(row, "full");
		if (!hasFull) return false;
		return this.hasStoredFile(row, "thumb");
	}

	private async hasStoredFile(
		row: KanbanBoardTaskImageEntity,
		variant: "full" | "thumb",
	): Promise<boolean> {
		const candidates = kanbanBoardTaskImageReadCandidates(
			this.uploadRoot,
			row,
			variant,
		);
		for (const filePath of candidates) {
			try {
				await access(filePath);
				return true;
			} catch {
				// try next candidate
			}
		}
		return false;
	}

	private toDto(row: KanbanBoardTaskImageEntity): KanbanBoardTaskImageDto {
		return {
			id: row.id,
			name: row.originalName,
			width: row.width,
			height: row.height,
			fullByteSize: row.fullByteSize,
			thumbByteSize: row.thumbByteSize,
			createdAt: row.createdAt,
		};
	}

	private async appendImageRef(
		taskId: string,
		image: KanbanBoardTaskImageDto,
	) {
		const task = await this.ensureTaskExists(taskId);
		const content = normalizeKanbanBoardTaskContent({ ...task.content });
		const images = [...(content.images ?? [])];
		if (!images.some((item) => item.id === image.id)) {
			images.push(image);
		}
		content.images = images.length ? images : undefined;
		task.content = content;
		await this.taskRepository.save(task);
	}

	private async removeImageFiles(row: KanbanBoardTaskImageEntity) {
		const canonical = kanbanBoardTaskImageStoragePaths(this.uploadRoot, row);
		const paths = [
			canonical.fullPath,
			canonical.thumbPath,
			row.fullPath,
			row.thumbPath,
			join(this.uploadRoot, row.fullPath),
			join(this.uploadRoot, row.thumbPath),
		];
		await Promise.all(
			[...new Set(paths.filter(Boolean))].map((filePath) =>
				unlink(filePath).catch(() => undefined),
			),
		);
	}

	private async removeImageRef(taskId: string, imageId: string) {
		const task = await this.ensureTaskExists(taskId);
		const content = normalizeKanbanBoardTaskContent({ ...task.content });
		const images = (content.images ?? []).filter((item) => item.id !== imageId);
		content.images = images.length ? images : undefined;
		task.content = content;
		await this.taskRepository.save(task);
	}
}
