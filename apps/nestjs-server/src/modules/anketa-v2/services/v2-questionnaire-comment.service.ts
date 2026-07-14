import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
	CreateV2QuestionnaireCommentRequestDto,
	V2QuestionnaireCommentDto,
} from "@smart-anketa/api-contract";
import { Repository } from "typeorm";
import { ulid } from "ulid";
import { V2QuestionnaireCommentEntity } from "../entities/v2-questionnaire-comment.entity";
import { V2QuestionnaireEntity } from "../entities/v2-questionnaire.entity";

type TUserLike = {
	given_name?: string;
	family_name?: string;
	preferred_username?: string;
	email?: string;
};

@Injectable()
export class V2QuestionnaireCommentService {
	constructor(
		@InjectRepository(V2QuestionnaireCommentEntity)
		private readonly commentRepository: Repository<V2QuestionnaireCommentEntity>,
		@InjectRepository(V2QuestionnaireEntity)
		private readonly questionnaireRepository: Repository<V2QuestionnaireEntity>,
	) {}

	async listForQuestionnaire(
		questionnaireId: string,
	): Promise<V2QuestionnaireCommentDto[]> {
		const questionnaire = await this.ensureQuestionnaireExists(questionnaireId);
		const rows = await this.commentRepository.find({
			where: { questionnaireId },
			order: { createdAt: "ASC" },
		});
		return rows.map((row) => this.toDto(row, questionnaire.author));
	}

	async create(
		questionnaireId: string,
		dto: CreateV2QuestionnaireCommentRequestDto,
		user?: TUserLike | null,
	): Promise<V2QuestionnaireCommentDto> {
		const questionnaire = await this.ensureQuestionnaireExists(questionnaireId);
		const body = dto.body.trim();
		if (!body) {
			throw new BadRequestException("Текст комментария не может быть пустым");
		}

		const parentCommentId = dto.parentCommentId?.trim() || null;
		if (parentCommentId) {
			const parent = await this.commentRepository.findOne({
				where: { id: parentCommentId, questionnaireId },
			});
			if (!parent) {
				throw new BadRequestException("Родительский комментарий не найден");
			}
		}

		const authorName = this.authorName(user);
		const entity = this.commentRepository.create({
			id: ulid(),
			questionnaireId,
			parentCommentId,
			body,
			authorName,
			isAnketaAuthor: this.isAnketaAuthor(authorName, questionnaire.author),
		});
		await this.commentRepository.save(entity);
		return this.toDto(entity, questionnaire.author);
	}

	async delete(questionnaireId: string, commentId: string): Promise<void> {
		const row = await this.commentRepository.findOne({
			where: { id: commentId, questionnaireId },
		});
		if (!row) throw new NotFoundException("Комментарий не найден");
		await this.commentRepository.delete({ id: commentId, questionnaireId });
	}

	private async ensureQuestionnaireExists(questionnaireId: string) {
		const questionnaire = await this.questionnaireRepository.findOne({
			where: { id: questionnaireId },
		});
		if (!questionnaire) {
			throw new NotFoundException("Анкета не найдена");
		}
		return questionnaire;
	}

	private authorName(user?: TUserLike | null): string {
		if (!user) return "Система";
		const name =
			`${user.given_name ?? ""} ${user.family_name ?? ""}`.trim() ||
			user.preferred_username ||
			user.email;
		return name || "Система";
	}

	private isAnketaAuthor(
		commentAuthor: string,
		questionnaireAuthor: string | null,
	): boolean {
		if (!questionnaireAuthor?.trim()) return false;
		return commentAuthor.trim() === questionnaireAuthor.trim();
	}

	private toDto(
		row: V2QuestionnaireCommentEntity,
		questionnaireAuthor: string | null,
	): V2QuestionnaireCommentDto {
		return {
			id: row.id,
			questionnaireId: row.questionnaireId,
			parentCommentId: row.parentCommentId,
			body: row.body,
			authorName: row.authorName,
			isAnketaAuthor: this.isAnketaAuthor(row.authorName, questionnaireAuthor),
			createdAt: row.createdAt.toISOString(),
		};
	}
}
