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
import { Repository } from "typeorm";
import { V2QuestionnaireEditLockEntity } from "../entities/v2-questionnaire-edit-lock.entity";
import { V2QuestionnaireEntity } from "../entities/v2-questionnaire.entity";

export type V2QuestionnaireEditLockHolder = {
	label: string;
	userId?: string | null;
};

@Injectable()
export class V2QuestionnaireEditLockService {
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
	): Promise<void> {
		await this.purgeExpired();
		const existing = await this.lockRepository.findOne({
			where: { questionnaireId },
		});
		if (!existing) return;
		if (!this.isSameHolder(existing, holder)) return;
		await this.lockRepository.delete({ questionnaireId });
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
