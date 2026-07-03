import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
	KANBAN_BOARD_TASK_IMAGE_MAX_FULL_BYTES,
	normalizeKanbanBoardTaskContent,
	type KanbanBoardTaskImageDto,
} from "@smart-anketa/api-contract";
import { mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Repository } from "typeorm";
import { ulid } from "ulid";
import { KanbanBoardTaskImageEntity } from "../entities/kanban-board-task-image.entity";
import { KanbanBoardTaskEntity } from "../entities/kanban-board-task.entity";

const ALLOWED_MIME = new Set(["image/webp", "image/png"]);

@Injectable()
export class KanbanBoardTaskImageService {
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

	async listForTask(taskId: string): Promise<KanbanBoardTaskImageDto[]> {
		await this.ensureTaskExists(taskId);
		const rows = await this.imageRepository.find({
			where: { taskId },
			order: { createdAt: "ASC" },
		});
		return rows.map((row) => this.toDto(row));
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
		const taskDir = join(this.uploadRoot, taskId);
		await mkdir(taskDir, { recursive: true });

		const ext = payload.mimeType === "image/png" ? "png" : "webp";
		const fullPath = join(taskDir, `${id}-full.${ext}`);
		const thumbPath = join(taskDir, `${id}-thumb.${ext}`);

		await writeFile(fullPath, payload.full);
		await writeFile(thumbPath, payload.thumb);

		const createdAt = new Date().toISOString();
		const entity = this.imageRepository.create({
			id,
			taskId,
			originalName: payload.originalName.slice(0, 255),
			mimeType: payload.mimeType,
			width: payload.width,
			height: payload.height,
			fullByteSize: payload.full.length,
			thumbByteSize: payload.thumb.length,
			fullPath,
			thumbPath,
			createdAt,
		});
		await this.imageRepository.save(entity);
		await this.appendImageRef(taskId, this.toDto(entity));

		return this.toDto(entity);
	}

	async readFile(
		taskId: string,
		imageId: string,
		variant: "full" | "thumb",
	): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
		const row = await this.findImageOrThrow(taskId, imageId);
		const filePath = variant === "thumb" ? row.thumbPath : row.fullPath;
		const buffer = await readFile(filePath);
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
		await Promise.all([
			unlink(row.fullPath).catch(() => undefined),
			unlink(row.thumbPath).catch(() => undefined),
		]);
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
