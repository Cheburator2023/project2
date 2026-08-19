import {
	ConflictException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
	V2_QUESTIONNAIRE_EDIT_LOCK_TTL_MS,
	type V2QuestionnaireEditLockDto,
} from "@smart-anketa/api-contract";
import { In, Repository } from "typeorm";
import { V2QuestionnaireEditLockEntity } from "../entities/v2-questionnaire-edit-lock.entity";
import { V2QuestionnaireEntity } from "../entities/v2-questionnaire.entity";

export type V2QuestionnaireEditLockHolder = {
	label: string;
	userId?: string | null;
};

@Injectable()
export class V2QuestionnaireEditLockService {
	/** socketId → questionnaireIds, которые этот сокет держит. */
	private readonly holdsBySocket = new Map<string, Set<string>>();

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
		return rows.map((row) => this.toDto(row));
	}

	async getLock(
		questionnaireId: string,
	): Promise<V2QuestionnaireEditLockDto | null> {
		await this.ensureQuestionnaireExists(questionnaireId);
		await this.purgeExpired();
		const row = await this.lockRepository.findOne({
			where: { questionnaireId },
		});
		if (!row || row.expiresAt.getTime() <= Date.now()) return null;
		return this.toDto(row);
	}

	async acquire(
		questionnaireId: string,
		holder: V2QuestionnaireEditLockHolder,
		socketId?: string,
	): Promise<V2QuestionnaireEditLockDto> {
		await this.ensureQuestionnaireExists(questionnaireId);
		const label = holder.label.trim();
		if (!label) {
			throw new ConflictException("Укажите, кто редактирует анкету");
		}
		await this.purgeExpired();
		const existing = await this.lockRepository.findOne({
			where: { questionnaireId },
		});
		if (
			existing &&
			existing.expiresAt.getTime() > Date.now() &&
			!this.isSameHolder(existing, holder)
		) {
			throw new ConflictException({
				message: "Анкета сейчас редактируется другим пользователем",
				reason: "lock",
				lock: this.toDto(existing),
			});
		}
		const expiresAt = new Date(Date.now() + V2_QUESTIONNAIRE_EDIT_LOCK_TTL_MS);
		const entity =
			existing ??
			this.lockRepository.create({
				questionnaireId,
				lockedByLabel: label,
				lockedByUserId: holder.userId ?? null,
			});
		entity.lockedByLabel = label;
		entity.lockedByUserId = holder.userId ?? null;
		entity.expiresAt = expiresAt;
		await this.lockRepository.save(entity);
		if (socketId) this.trackSocket(socketId, questionnaireId);
		return this.toDto(entity);
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
		const existing = await this.lockRepository.findOne({
			where: { questionnaireId },
		});
		if (!existing) return false;
		if (!this.isSameHolder(existing, holder)) return false;
		await this.lockRepository.delete({ questionnaireId });
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
			await this.lockRepository.delete({ questionnaireId });
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
		await this.lockRepository.update(
			{ questionnaireId: In([...ids]) },
			{ expiresAt },
		);
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
		row: V2QuestionnaireEditLockEntity,
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
		await this.lockRepository
			.createQueryBuilder()
			.delete()
			.where("expires_at <= :now", { now: new Date() })
			.execute();
	}

	private async ensureQuestionnaireExists(questionnaireId: string) {
		const row = await this.questionnaireRepository.findOne({
			where: { id: questionnaireId },
		});
		if (!row) throw new NotFoundException("Анкета не найдена");
		return row;
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
