import { ConflictException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
	V2_QUESTIONNAIRE_EDIT_LOCK_TTL_MS,
	type V2QuestionnaireEditLockDto,
} from "@smart-anketa/api-contract";
import { In, QueryFailedError, Repository } from "typeorm";
import { V2QuestionnaireEditLockEntity } from "../entities/v2-questionnaire-edit-lock.entity";
import { V2QuestionnaireEntity } from "../entities/v2-questionnaire.entity";

function isPostgresForeignKeyViolation(error: unknown): boolean {
	if (error instanceof QueryFailedError) {
		const driver = error.driverError as { code?: string } | undefined;
		return driver?.code === "23503";
	}
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: string }).code === "23503"
	);
}

export type V2QuestionnaireEditLockHolder = {
	label: string;
	userId?: string | null;
};

type LockHolderRow = {
	lockedByLabel: string;
	lockedByUserId: string | null;
};

@Injectable()
export class V2QuestionnaireEditLockService {
	private readonly logger = new Logger(V2QuestionnaireEditLockService.name);
	/** socketId → questionnaireIds, которые этот сокет держит. */
	private readonly holdsBySocket = new Map<string, Set<string>>();
	/**
	 * Occupancy, если INSERT в БД падает по FK (контур: FK смотрит в другую
	 * схему, чем TypeORM-таблица анкет). Snapshot/changed всё равно работают.
	 */
	private readonly fallbackLocks = new Map<string, V2QuestionnaireEditLockDto>();

	constructor(
		@InjectRepository(V2QuestionnaireEditLockEntity)
		private readonly lockRepository: Repository<V2QuestionnaireEditLockEntity>,
		@InjectRepository(V2QuestionnaireEntity)
		private readonly questionnaireRepository: Repository<V2QuestionnaireEntity>,
	) {}

	async listActive(): Promise<V2QuestionnaireEditLockDto[]> {
		await this.purgeExpired();
		const rows = await this.lockRepository
			.createQueryBuilder("lock")
			.where("lock.expires_at > :now", { now: new Date() })
			.getMany();
		const byId = new Map(
			rows.map((row) => [row.questionnaireId, this.toDto(row)]),
		);
		for (const [id, dto] of this.fallbackLocks) {
			if (!byId.has(id)) byId.set(id, dto);
		}
		return [...byId.values()];
	}

	async getLock(
		questionnaireId: string,
	): Promise<V2QuestionnaireEditLockDto | null> {
		await this.purgeExpired();
		const row = await this.lockRepository.findOne({
			where: { questionnaireId },
		});
		if (row && row.expiresAt.getTime() > Date.now()) return this.toDto(row);
		return this.fallbackLocks.get(questionnaireId) ?? null;
	}

	async acquire(
		questionnaireId: string,
		holder: V2QuestionnaireEditLockHolder,
		socketId?: string,
	): Promise<V2QuestionnaireEditLockDto> {
		const label = holder.label.trim();
		if (!label) {
			throw new ConflictException("Укажите, кто редактирует анкету");
		}
		await this.purgeExpired();
		const existing = await this.findActiveLock(questionnaireId);
		if (existing && !this.isSameHolder(existing, holder)) {
			throw new ConflictException({
				message: "Анкета сейчас редактируется другим пользователем",
				reason: "lock",
				lock: existing,
			});
		}
		const expiresAt = new Date(Date.now() + V2_QUESTIONNAIRE_EDIT_LOCK_TTL_MS);
		const entity = this.lockRepository.create({
			questionnaireId,
			lockedByLabel: label,
			lockedByUserId: holder.userId ?? null,
			expiresAt,
		});
		const dto = await this.persistLock(entity);
		if (socketId) this.trackSocket(socketId, questionnaireId);
		return dto;
	}

	async renew(
		questionnaireId: string,
		holder: V2QuestionnaireEditLockHolder,
	): Promise<V2QuestionnaireEditLockDto> {
		return this.acquire(questionnaireId, holder);
	}

	async release(
		questionnaireId: string,
		holder: V2QuestionnaireEditLockHolder,
		socketId?: string,
	): Promise<boolean> {
		if (socketId) this.untrackSocket(socketId, questionnaireId);
		if (this.socketCountFor(questionnaireId) > 0) return false;
		await this.purgeExpired();
		const existing = await this.findActiveLock(questionnaireId);
		if (!existing) return false;
		if (!this.isSameHolder(existing, holder)) return false;
		await this.deleteLock(questionnaireId);
		return true;
	}

	/**
	 * Снимает lock'и, которые держал сокет (закрытие вкладки / logout / обрыв WS).
	 * Если ту же анкету держит другой сокет того же пользователя — запись остаётся.
	 */
	async releaseAllForSocket(socketId: string): Promise<string[]> {
		const held = [...(this.holdsBySocket.get(socketId) ?? [])];
		this.holdsBySocket.delete(socketId);
		const released: string[] = [];
		for (const questionnaireId of held) {
			if (this.socketCountFor(questionnaireId) > 0) continue;
			await this.deleteLock(questionnaireId);
			released.push(questionnaireId);
		}
		return released;
	}

	/** Пока сокет жив, TTL не должен сработать из‑за отсутствия HTTP-heartbeat. */
	async bumpExpiryForTracked(): Promise<void> {
		const ids = new Set<string>();
		for (const held of this.holdsBySocket.values()) {
			for (const id of held) ids.add(id);
		}
		if (ids.size === 0) return;
		const expiresAt = new Date(Date.now() + V2_QUESTIONNAIRE_EDIT_LOCK_TTL_MS);
		const iso = expiresAt.toISOString();
		for (const id of ids) {
			const current = this.fallbackLocks.get(id);
			if (current) this.fallbackLocks.set(id, { ...current, expiresAt: iso });
		}
		await this.lockRepository.update(
			{ questionnaireId: In([...ids]) },
			{ expiresAt },
		);
	}

	private async findActiveLock(
		questionnaireId: string,
	): Promise<V2QuestionnaireEditLockDto | null> {
		const row = await this.lockRepository.findOne({
			where: { questionnaireId },
		});
		if (row && row.expiresAt.getTime() > Date.now()) return this.toDto(row);
		const fallback = this.fallbackLocks.get(questionnaireId);
		if (fallback && Date.parse(fallback.expiresAt) > Date.now()) return fallback;
		return null;
	}

	private async persistLock(
		entity: V2QuestionnaireEditLockEntity,
	): Promise<V2QuestionnaireEditLockDto> {
		const dto = this.toDto(entity);
		try {
			await this.lockRepository.save(entity);
			this.fallbackLocks.delete(entity.questionnaireId);
			return dto;
		} catch (error) {
			if (!isPostgresForeignKeyViolation(error)) throw error;
			const seen = await this.questionnaireRepository.findOne({
				where: { id: entity.questionnaireId },
				select: ["id"],
			});
			this.logger.warn(
				`edit-lock INSERT FK miss questionnaireId=${entity.questionnaireId} typeormSeesRow=${Boolean(seen)} — occupancy in-memory`,
			);
			this.fallbackLocks.set(entity.questionnaireId, dto);
			return dto;
		}
	}

	private async deleteLock(questionnaireId: string): Promise<void> {
		this.fallbackLocks.delete(questionnaireId);
		await this.lockRepository.delete({ questionnaireId });
	}

	private trackSocket(socketId: string, questionnaireId: string): void {
		const held = this.holdsBySocket.get(socketId) ?? new Set<string>();
		held.add(questionnaireId);
		this.holdsBySocket.set(socketId, held);
	}

	private untrackSocket(socketId: string, questionnaireId: string): void {
		const held = this.holdsBySocket.get(socketId);
		if (!held) return;
		held.delete(questionnaireId);
		if (held.size === 0) this.holdsBySocket.delete(socketId);
	}

	private socketCountFor(questionnaireId: string): number {
		let count = 0;
		for (const held of this.holdsBySocket.values()) {
			if (held.has(questionnaireId)) count += 1;
		}
		return count;
	}

	private isSameHolder(
		row: LockHolderRow,
		holder: V2QuestionnaireEditLockHolder,
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
		const now = Date.now();
		for (const [id, dto] of this.fallbackLocks) {
			if (Date.parse(dto.expiresAt) <= now) this.fallbackLocks.delete(id);
		}
		await this.lockRepository
			.createQueryBuilder()
			.delete()
			.where("expires_at <= :now", { now: new Date() })
			.execute();
	}

	private toDto(row: V2QuestionnaireEditLockEntity): V2QuestionnaireEditLockDto {
		return {
			questionnaireId: row.questionnaireId,
			lockedByLabel: row.lockedByLabel,
			lockedByUserId: row.lockedByUserId,
			expiresAt: row.expiresAt.toISOString(),
		};
	}
}
