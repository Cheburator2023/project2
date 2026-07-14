import {
	ConflictException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
	KANBAN_BOARD_TASK_LOCK_TTL_MS,
	type KanbanBoardTaskLockDto,
} from "@smart-anketa/api-contract";
import { Repository } from "typeorm";
import { KanbanBoardTaskLockEntity } from "../entities/kanban-board-task-lock.entity";
import { KanbanBoardTaskEntity } from "../entities/kanban-board-task.entity";

export type KanbanBoardTaskLockHolder = {
	label: string;
	userId?: string | null;
};

@Injectable()
export class KanbanBoardTaskLockService {
	constructor(
		@InjectRepository(KanbanBoardTaskLockEntity)
		private readonly lockRepository: Repository<KanbanBoardTaskLockEntity>,
		@InjectRepository(KanbanBoardTaskEntity)
		private readonly taskRepository: Repository<KanbanBoardTaskEntity>,
	) {}

	async getLock(taskId: string): Promise<KanbanBoardTaskLockDto | null> {
		await this.ensureTaskExists(taskId);
		await this.purgeExpired();
		const row = await this.lockRepository.findOne({ where: { taskId } });
		if (!row || row.expiresAt.getTime() <= Date.now()) {
			return null;
		}
		return this.toDto(row);
	}

	async acquire(
		taskId: string,
		holder: KanbanBoardTaskLockHolder,
	): Promise<KanbanBoardTaskLockDto> {
		await this.ensureTaskExists(taskId);
		const label = holder.label.trim();
		if (!label) {
			throw new ConflictException("Укажите, кто редактирует задачу");
		}
		await this.purgeExpired();
		const existing = await this.lockRepository.findOne({ where: { taskId } });
		if (
			existing &&
			existing.expiresAt.getTime() > Date.now() &&
			!this.isSameHolder(existing, holder)
		) {
			throw new ConflictException({
				message: `Задача редактируется: ${existing.lockedByLabel}`,
				reason: "lock",
				lock: this.toDto(existing),
			});
		}
		const expiresAt = new Date(Date.now() + KANBAN_BOARD_TASK_LOCK_TTL_MS);
		const entity =
			existing ??
			this.lockRepository.create({
				taskId,
				lockedByLabel: label,
				lockedByUserId: holder.userId ?? null,
			});
		entity.lockedByLabel = label;
		entity.lockedByUserId = holder.userId ?? null;
		entity.expiresAt = expiresAt;
		await this.lockRepository.save(entity);
		return this.toDto(entity);
	}

	async renew(
		taskId: string,
		holder: KanbanBoardTaskLockHolder,
	): Promise<KanbanBoardTaskLockDto> {
		return this.acquire(taskId, holder);
	}

	async release(taskId: string, holder: KanbanBoardTaskLockHolder): Promise<void> {
		await this.purgeExpired();
		const existing = await this.lockRepository.findOne({ where: { taskId } });
		if (!existing) return;
		if (!this.isSameHolder(existing, holder)) return;
		await this.lockRepository.delete({ taskId });
	}

	async assertEditable(
		taskId: string,
		holder: KanbanBoardTaskLockHolder | undefined,
		forceOverwrite?: boolean,
	): Promise<void> {
		if (forceOverwrite) return;
		await this.purgeExpired();
		const existing = await this.lockRepository.findOne({ where: { taskId } });
		if (!existing || existing.expiresAt.getTime() <= Date.now()) return;
		if (holder && this.isSameHolder(existing, holder)) return;
		throw new ConflictException({
			message: `Задача редактируется: ${existing.lockedByLabel}`,
			reason: "lock",
			lock: this.toDto(existing),
		});
	}

	private isSameHolder(
		row: KanbanBoardTaskLockEntity,
		holder: KanbanBoardTaskLockHolder,
	): boolean {
		const label = holder.label.trim();
		if (label && row.lockedByLabel === label) return true;
		if (
			holder.userId &&
			row.lockedByUserId &&
			row.lockedByUserId === holder.userId
		) {
			return true;
		}
		return false;
	}

	private async purgeExpired() {
		await this.lockRepository
			.createQueryBuilder()
			.delete()
			.where("expires_at <= :now", { now: new Date() })
			.execute();
	}

	private async ensureTaskExists(taskId: string) {
		const task = await this.taskRepository.findOne({ where: { id: taskId } });
		if (!task) throw new NotFoundException("Задача не найдена");
		return task;
	}

	private toDto(row: KanbanBoardTaskLockEntity): KanbanBoardTaskLockDto {
		return {
			taskId: row.taskId,
			lockedByLabel: row.lockedByLabel,
			lockedByUserId: row.lockedByUserId,
			expiresAt: row.expiresAt.toISOString(),
		};
	}
}
