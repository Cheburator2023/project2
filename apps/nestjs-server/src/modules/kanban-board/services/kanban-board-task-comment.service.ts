import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
	extractKanbanCommentMentionNames,
	formatKanbanTaskKeyForBoard,
	kanbanBoardCommentLengthError,
	type CreateKanbanBoardTaskCommentRequestDto,
	type KanbanBoardTaskCommentDto,
} from "@smart-anketa/api-contract";
import { Repository } from "typeorm";
import { ulid } from "ulid";
import { KanbanBoardAssigneeEntity } from "../entities/kanban-board-assignee.entity";
import { KanbanBoardTaskCommentEntity } from "../entities/kanban-board-task-comment.entity";
import { KanbanBoardTaskEntity } from "../entities/kanban-board-task.entity";
import { KanbanBoardPushService } from "./kanban-board-push.service";

@Injectable()
export class KanbanBoardTaskCommentService {
	constructor(
		@InjectRepository(KanbanBoardTaskCommentEntity)
		private readonly commentRepository: Repository<KanbanBoardTaskCommentEntity>,
		@InjectRepository(KanbanBoardTaskEntity)
		private readonly taskRepository: Repository<KanbanBoardTaskEntity>,
		@InjectRepository(KanbanBoardAssigneeEntity)
		private readonly assigneeRepository: Repository<KanbanBoardAssigneeEntity>,
		private readonly pushService: KanbanBoardPushService,
	) {}

	async listForTask(taskId: string): Promise<KanbanBoardTaskCommentDto[]> {
		await this.ensureTaskExists(taskId);
		const rows = await this.commentRepository.find({
			where: { taskId },
			order: { createdAt: "ASC" },
		});
		return rows.map((row) => this.toDto(row));
	}

	async countByTaskIds(taskIds: string[]): Promise<Map<string, number>> {
		const uniqueIds = [...new Set(taskIds.filter(Boolean))];
		const counts = new Map<string, number>();
		if (!uniqueIds.length) return counts;

		const rows = await this.commentRepository
			.createQueryBuilder("comment")
			.select("comment.task_id", "taskId")
			.addSelect("COUNT(*)", "count")
			.where("comment.task_id IN (:...taskIds)", { taskIds: uniqueIds })
			.groupBy("comment.task_id")
			.getRawMany<{ taskId: string; count: string }>();

		for (const row of rows) {
			counts.set(row.taskId, Number(row.count) || 0);
		}
		return counts;
	}

	async create(
		taskId: string,
		dto: CreateKanbanBoardTaskCommentRequestDto,
	): Promise<KanbanBoardTaskCommentDto> {
		await this.ensureTaskExists(taskId);
		const body = dto.body.trim();
		const authorName = dto.authorName.trim();
		if (!body) {
			throw new BadRequestException("Текст комментария не может быть пустым");
		}
		const lengthError = kanbanBoardCommentLengthError(body);
		if (lengthError) {
			throw new BadRequestException(lengthError);
		}
		if (!authorName) {
			throw new BadRequestException("Укажите автора комментария");
		}
		await this.ensureAssigneeExists(authorName);

		const entity = this.commentRepository.create({
			id: ulid(),
			taskId,
			body,
			authorName,
		});
		await this.commentRepository.save(entity);

		try {
			const assignees = await this.assigneeRepository.find({
				select: ["name"],
			});
			const assigneeNames = assignees.map((row) => row.name);
			const mentioned = extractKanbanCommentMentionNames(
				body,
				assigneeNames,
			).filter((name) => name !== authorName);
			const task = await this.taskRepository.findOne({
				where: { id: taskId },
				relations: { board: { project: true }, project: true },
			});
			const taskKey = task
				? formatKanbanTaskKeyForBoard(
						task.board?.project?.code ?? task.project?.code ?? "TASK",
						task.board?.slug ?? "",
						task.taskNumber,
					)
				: taskId;
			const title = task?.content.title?.trim() || taskKey;
			const snippet = body.length > 140 ? `${body.slice(0, 137)}…` : body;
			const taskUrl = `/tracker/task/${encodeURIComponent(taskKey)}`;

			if (mentioned.length) {
				this.pushService.notifyAssignees(mentioned, {
					title: `Упоминание: ${title}`,
					body: `${authorName}: ${snippet}`,
					url: taskUrl,
					tag: `kanban-mention-${taskId}`,
				});
			}

			const participantNames = new Set<string>();
			for (const name of task?.content.assignees ?? []) {
				const trimmed = name.trim();
				if (trimmed) participantNames.add(trimmed);
			}
			const current = task?.content.currentAssignee?.trim();
			if (current) participantNames.add(current);
			const createdBy = task?.createdBy?.trim();
			if (createdBy) participantNames.add(createdBy);
			participantNames.delete(authorName);
			for (const name of mentioned) participantNames.delete(name);
			if (participantNames.size) {
				this.pushService.notifyAssignees([...participantNames], {
					title: `Комментарий: ${title}`,
					body: `${authorName}: ${snippet}`,
					url: taskUrl,
					tag: `kanban-comment-${taskId}`,
				});
			}
		} catch {
			/* push must not fail comment create */
		}

		return this.toDto(entity);
	}

	async delete(taskId: string, commentId: string): Promise<void> {
		const row = await this.commentRepository.findOne({
			where: { id: commentId, taskId },
		});
		if (!row) throw new NotFoundException("Комментарий не найден");
		await this.commentRepository.delete({ id: commentId, taskId });
	}

	private async ensureTaskExists(taskId: string) {
		const task = await this.taskRepository.findOne({ where: { id: taskId } });
		if (!task) throw new NotFoundException("Задача не найдена");
		return task;
	}

	private async ensureAssigneeExists(name: string) {
		const assignee = await this.assigneeRepository.findOne({ where: { name } });
		if (!assignee) {
			throw new BadRequestException("Исполнитель не найден в справочнике");
		}
	}

	private toDto(row: KanbanBoardTaskCommentEntity): KanbanBoardTaskCommentDto {
		return {
			id: row.id,
			taskId: row.taskId,
			body: row.body,
			authorName: row.authorName,
			createdAt: row.createdAt.toISOString(),
		};
	}
}
