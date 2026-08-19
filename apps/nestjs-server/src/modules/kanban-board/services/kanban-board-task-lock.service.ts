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
import { In, Repository } from "typeorm";
import { KanbanBoardTaskLockEntity } from "../entities/kanban-board-task-lock.entity";
import { KanbanBoardTaskEntity } from "../entities/kanban-board-task.entity";

export type KanbanBoardTaskLockHolder = {
	label: string;
	userId?: string | null;
};

@Injectable()
export class KanbanBoardTaskLockService {
	private readonly holdsBySocket = new Map<string, Set<string>>();

	constructor(
		@InjectRepository(KanbanBoardTaskLockEntity)
		private readonly lockRepository: Repository<KanbanBoardTaskLockEntity>,
		@InjectRepository(KanbanBoardTaskEntity)
		private readonly taskRepository: Repository<KanbanBoardTaskEntity>,
	) {}

	async listActive(): Promise<KanbanBoardTaskLockDto[]> {
		await this.purgeExpired();
		const rows = await this.lockRepository
			.createQueryBuilder("lock")
			.where("lock.expires_at > :now", { now: new Date() })
			.getMany();
		return rows.map((row) => this.toDto(row));
	}

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
		socketId?: string,
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
		if (socketId) this.trackSocket(socketId, taskId);
		return this.toDto(entity);
	}

	async renew(
		taskId: string,
		holder: KanbanBoardTaskLockHolder,
	): Promise<KanbanBoardTaskLockDto> {
		return this.acquire(taskId, holder);
	}

	async release(
		taskId: string,
		holder: KanbanBoardTaskLockHolder,
		socketId?: string,
	): Promise<boolean> {
		if (socketId) this.untrackSocket(socketId, taskId);
		if (this.socketCountFor(taskId) > 0) return false;
		await this.purgeExpired();
		const existing = await this.lockRepository.findOne({ where: { taskId } });
		if (!existing) return false;
		if (!this.isSameHolder(existing, holder)) return false;
		await this.lockRepository.delete({ taskId });
		return true;
	}

	async releaseAllForSocket(socketId: string): Promise<string[]> {
		const held = [...(this.holdsBySocket.get(socketId) ?? [])];
		this.holdsBySocket.delete(socketId);
		const released: string[] = [];
		for (const taskId of held) {
			if (this.socketCountFor(taskId) > 0) continue;
			await this.lockRepository.delete({ taskId });
			released.push(taskId);
		}
		return released;
	}

	async bumpExpiryForTracked(): Promise<void> {
		const ids = new Set<string>();
		for (const held of this.holdsBySocket.values()) {
			for (const id of held) ids.add(id);
		}
		if (ids.size === 0) return;
		const expiresAt = new Date(Date.now() + KANBAN_BOARD_TASK_LOCK_TTL_MS);
		await this.lockRepository.update(
			{ taskId: In([...ids]) },
			{ expiresAt },
		);
	}

	private trackSocket(socketId: string, taskId: string): void {
		const held = this.holdsBySocket.get(socketId) ?? new Set<string>();
		held.add(taskId);
		this.holdsBySocket.set(socketId, held);
	}

	private untrackSocket(socketId: string, taskId: string): void {
		const held = this.holdsBySocket.get(socketId);
		if (!held) return;
		held.delete(taskId);
		if (held.size === 0) this.holdsBySocket.delete(socketId);
	}

	private socketCountFor(taskId: string): number {
		let count = 0;
		for (const held of this.holdsBySocket.values()) {
			if (held.has(taskId)) count += 1;
		}
		return count;
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
