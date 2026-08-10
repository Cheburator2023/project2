import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
	KANBAN_BOARD_TASK_FILE_MAX_BYTES,
	normalizeKanbanBoardTaskContent,
	type KanbanBoardTaskFileDto,
} from "@smart-anketa/api-contract";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { In, Repository } from "typeorm";
import { ulid } from "ulid";
import { KanbanBoardTaskFileEntity } from "../entities/kanban-board-task-file.entity";
import { KanbanBoardTaskEntity } from "../entities/kanban-board-task.entity";
import {
	isAllowedKanbanBoardTaskFile,
	kanbanBoardTaskFileExtension,
	kanbanBoardTaskFileRefsEqual,
	resolveKanbanBoardTaskFileMime,
} from "../utils/kanban-board-task-file.util";

@Injectable()
export class KanbanBoardTaskFileService {
	private readonly logger = new Logger(KanbanBoardTaskFileService.name);
	private readonly uploadRoot = resolve(
		process.env.KANBAN_TASK_FILES_DIR ??
			join(process.cwd(), "data", "kanban-task-files"),
	);

	constructor(
		@InjectRepository(KanbanBoardTaskFileEntity)
		private readonly fileRepository: Repository<KanbanBoardTaskFileEntity>,
		@InjectRepository(KanbanBoardTaskEntity)
		private readonly taskRepository: Repository<KanbanBoardTaskEntity>,
	) {}

	async listForTask(taskId: string): Promise<KanbanBoardTaskFileDto[]> {
		await this.ensureTaskExists(taskId);
		const rows = await this.fileRepository.find({
			where: { taskId },
			order: { createdAt: "ASC" },
		});
		return rows.map((row) => this.toDto(row));
	}

	async syncTaskContentFiles(task: KanbanBoardTaskEntity): Promise<boolean> {
		const files = await this.listForTask(task.id);
		const current = task.content.files ?? [];
		if (kanbanBoardTaskFileRefsEqual(current, files)) {
			return false;
		}
		task.content = normalizeKanbanBoardTaskContent({
			...task.content,
			files: files.length ? files : undefined,
		});
		await this.taskRepository.save(task);
		return true;
	}

	async syncTasksContentFiles(tasks: KanbanBoardTaskEntity[]): Promise<void> {
		if (!tasks.length) return;
		const taskIds = tasks.map((task) => task.id);
		const rows = await this.fileRepository.find({
			where: { taskId: In(taskIds) },
			order: { createdAt: "ASC" },
		});
		const filesByTaskId = new Map<string, KanbanBoardTaskFileDto[]>();
		for (const row of rows) {
			const bucket = filesByTaskId.get(row.taskId) ?? [];
			bucket.push(this.toDto(row));
			filesByTaskId.set(row.taskId, bucket);
		}

		const toSave: KanbanBoardTaskEntity[] = [];
		for (const task of tasks) {
			const files = filesByTaskId.get(task.id) ?? [];
			const current = task.content.files ?? [];
			if (kanbanBoardTaskFileRefsEqual(current, files)) continue;
			task.content = normalizeKanbanBoardTaskContent({
				...task.content,
				files: files.length ? files : undefined,
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
			data: Buffer;
		},
	): Promise<KanbanBoardTaskFileDto> {
		await this.ensureTaskExists(taskId);
		const mimeType = resolveKanbanBoardTaskFileMime(
			payload.mimeType,
			payload.originalName,
		);
		if (!isAllowedKanbanBoardTaskFile(mimeType, payload.originalName)) {
			throw new BadRequestException(
				"Допустимы PDF, Word, Excel, PowerPoint, OpenDocument, RTF, TXT, CSV",
			);
		}
		const data = Buffer.isBuffer(payload.data)
			? payload.data
			: Buffer.from(payload.data);
		if (!data.length) {
			throw new BadRequestException("Пустой файл");
		}
		if (data.length > KANBAN_BOARD_TASK_FILE_MAX_BYTES) {
			throw new BadRequestException("Файл слишком большой (макс. 15 МБ)");
		}

		const id = ulid();
		const ext = kanbanBoardTaskFileExtension(payload.originalName, mimeType);
		const storagePath = `${taskId}/${id}.${ext}`;
		const createdAt = new Date().toISOString();
		const entity = this.fileRepository.create({
			id,
			taskId,
			originalName: payload.originalName.slice(0, 255),
			mimeType,
			byteSize: data.length,
			storagePath,
			fileData: data,
			createdAt,
		});
		await this.fileRepository.save(entity);
		await this.appendFileRef(taskId, this.toDto(entity));
		await this.tryWriteDiskFile(storagePath, data);
		return this.toDto(entity);
	}

	async readFile(
		taskId: string,
		fileId: string,
	): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
		const row = await this.findFileOrThrow(taskId, fileId);
		if (row.fileData?.length) {
			return {
				buffer: row.fileData,
				mimeType: row.mimeType,
				fileName: row.originalName,
			};
		}
		try {
			const buffer = await readFile(join(this.uploadRoot, row.storagePath));
			return {
				buffer,
				mimeType: row.mimeType,
				fileName: row.originalName,
			};
		} catch {
			throw new NotFoundException("Файл не найден на сервере");
		}
	}

	async delete(taskId: string, fileId: string): Promise<void> {
		const row = await this.findFileOrThrow(taskId, fileId);
		await unlink(join(this.uploadRoot, row.storagePath)).catch(() => undefined);
		await this.fileRepository.delete({ id: fileId, taskId });
		await this.removeFileRef(taskId, fileId);
	}

	private async tryWriteDiskFile(
		storagePath: string,
		data: Buffer,
	): Promise<void> {
		try {
			await mkdir(join(this.uploadRoot, storagePath.split("/")[0]!), {
				recursive: true,
			});
			await writeFile(join(this.uploadRoot, storagePath), data);
		} catch (error) {
			this.logger.warn(
				`Не удалось записать файл задачи на диск (${this.uploadRoot}): ${
					error instanceof Error ? error.message : String(error)
				}. Файл сохранён в БД.`,
			);
		}
	}

	private async ensureTaskExists(taskId: string) {
		const task = await this.taskRepository.findOne({ where: { id: taskId } });
		if (!task) throw new NotFoundException("Задача не найдена");
		return task;
	}

	private async findFileOrThrow(taskId: string, fileId: string) {
		const row = await this.fileRepository.findOne({
			where: { id: fileId, taskId },
		});
		if (!row) throw new NotFoundException("Файл не найден");
		return row;
	}

	private toDto(row: KanbanBoardTaskFileEntity): KanbanBoardTaskFileDto {
		return {
			id: row.id,
			name: row.originalName,
			mimeType: row.mimeType,
			byteSize: row.byteSize,
			createdAt: row.createdAt,
		};
	}

	private async appendFileRef(
		taskId: string,
		ref: KanbanBoardTaskFileDto,
	): Promise<void> {
		const task = await this.ensureTaskExists(taskId);
		const files = [...(task.content.files ?? []), ref];
		task.content = normalizeKanbanBoardTaskContent({
			...task.content,
			files,
		});
		await this.taskRepository.save(task);
	}

	private async removeFileRef(taskId: string, fileId: string): Promise<void> {
		const task = await this.taskRepository.findOne({ where: { id: taskId } });
		if (!task) return;
		const files = (task.content.files ?? []).filter((item) => item.id !== fileId);
		task.content = normalizeKanbanBoardTaskContent({
			...task.content,
			files: files.length ? files : undefined,
		});
		await this.taskRepository.save(task);
	}
}
