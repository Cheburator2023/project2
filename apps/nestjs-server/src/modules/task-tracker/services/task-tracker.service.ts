import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import type { TaskRecord } from "@smart-anketa/api-contract";
import { TaskEntity } from "../entities/task.entity";
import {
	assertSnapshotImportable,
	exportXlsx,
	importXlsx,
} from "../utils/task-snapshot.util";

export { SnapshotIntegrityError, SnapshotSchemaError } from "../utils/task-snapshot.util";

@Injectable()
export class TaskTrackerService {
	constructor(
		@InjectRepository(TaskEntity)
		private readonly taskRepository: Repository<TaskEntity>,
		private readonly dataSource: DataSource,
		private readonly configService: ConfigService,
	) {}

	getStandId(): string {
		return (
			this.configService.get<string>("TASK_TRACKER_STAND_ID") ??
			this.configService.get<string>("HOSTNAME") ??
			"local-dev"
		);
	}

	async findAll(): Promise<TaskRecord[]> {
		const rows = await this.taskRepository.find({
			order: { parentId: "ASC", position: "ASC" },
		});
		return rows.map((row) => this.toRecord(row));
	}

	async findByStand(standId: string): Promise<TaskRecord[]> {
		const rows = await this.taskRepository.find({
			where: { origin: standId },
			order: { parentId: "ASC", position: "ASC" },
		});
		return rows.map((row) => this.toRecord(row));
	}

	async saveLocalTasks(tasks: TaskRecord[]): Promise<TaskRecord[]> {
		const standId = this.getStandId();
		const now = new Date().toISOString();
		const normalized = tasks.map((task) => ({
			...task,
			origin: standId,
			updatedAt: now,
		}));

		await this.dataSource.transaction(async (manager) => {
			const repo = manager.getRepository(TaskEntity);
			const incoming = new Set(normalized.map((task) => task.id));
			const existing = await repo.find({ where: { origin: standId } });
			const stale = existing.filter((row) => !incoming.has(row.id));
			if (stale.length) {
				await repo.remove(stale);
			}

			for (const task of normalized) {
				await repo.upsert(this.fromRecord(task), ["id"]);
			}
		});

		return this.findAll();
	}

	async deleteLocalTask(taskId: string): Promise<void> {
		const standId = this.getStandId();
		const task = await this.taskRepository.findOne({ where: { id: taskId } });
		if (!task || task.origin !== standId) {
			throw new Error("Задача не найдена или принадлежит другому стенду");
		}
		await this.taskRepository.remove(task);
	}

	async exportSnapshot(): Promise<Buffer> {
		const standId = this.getStandId();
		const rows = await this.findByStand(standId);
		return exportXlsx(rows, standId);
	}

	async importSnapshot(buf: Buffer): Promise<{
		meta: Awaited<ReturnType<typeof importXlsx>>["meta"];
		tasks: TaskRecord[];
	}> {
		const { meta, payload } = await importXlsx(buf);
		assertSnapshotImportable(meta, payload);

		await this.dataSource.transaction(async (manager) => {
			const repo = manager.getRepository(TaskEntity);
			const incoming = new Set(payload.map((task) => task.id));
			const existing = await repo.find({ where: { origin: meta.sourceStand } });
			const stale = existing.filter((row) => !incoming.has(row.id));
			if (stale.length) {
				await repo.remove(stale);
			}

			for (const task of payload) {
				await repo.upsert(this.fromRecord(task), ["id"]);
			}
		});

		return { meta, tasks: await this.findAll() };
	}

	private toRecord(entity: TaskEntity): TaskRecord {
		return {
			id: entity.id,
			parentId: entity.parentId,
			position: entity.position,
			content: entity.content,
			origin: entity.origin,
			updatedAt: entity.updatedAt,
		};
	}

	private fromRecord(record: TaskRecord): TaskEntity {
		const entity = new TaskEntity();
		entity.id = record.id;
		entity.parentId = record.parentId;
		entity.position = record.position;
		entity.content = record.content;
		entity.origin = record.origin;
		entity.updatedAt = record.updatedAt;
		return entity;
	}
}
