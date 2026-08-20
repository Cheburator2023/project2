import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Not, Repository } from "typeorm";
import { ulid } from "ulid";
import {
	findKanbanBoardColumnByStatusTitle,
	isKanbanBoardReleaseStatusId,
	nextKanbanBoardReleaseThemeColor,
	normalizeTrackerCode,
	type AttachKanbanBoardReleaseTasksRequestDto,
	type CreateKanbanBoardPlanningRequestDto,
	type CreateKanbanBoardReleaseThemeRequestDto,
	type KanbanBoardPlanningDetailDto,
	type KanbanBoardPlanningDto,
	type KanbanBoardReleaseDto,
	type KanbanBoardReleaseStatusId,
	type KanbanBoardReleaseTaskDto,
	type KanbanBoardReleaseThemeDto,
	type MoveKanbanBoardReleaseTaskStatusRequestDto,
	type ReorderKanbanBoardReleaseTasksRequestDto,
	type UpdateKanbanBoardPlanningLayoutRequestDto,
	type UpdateKanbanBoardPlanningRequestDto,
	type UpdateKanbanBoardReleaseRequestDto,
	type UpdateKanbanBoardReleaseThemeRequestDto,
	type UpdateKanbanBoardTaskRequestDto,
} from "@smart-anketa/api-contract";
import { KanbanBoardPlanningEntity } from "../entities/kanban-board-planning.entity";
import { KanbanBoardReleaseEntity } from "../entities/kanban-board-release.entity";
import { KanbanBoardReleaseThemeEntity } from "../entities/kanban-board-release-theme.entity";
import { KanbanBoardReleaseTaskEntity } from "../entities/kanban-board-release-task.entity";
import { KanbanBoardTaskEntity } from "../entities/kanban-board-task.entity";
import { KanbanBoardSprintEntity } from "../entities/kanban-board-sprint.entity";
import { KanbanBoardSupersprintEntity } from "../entities/kanban-board-supersprint.entity";
import { KanbanBoardColumnEntity } from "../entities/kanban-board-column.entity";
import { KanbanBoardRegistryService } from "./kanban-board-registry.service";

@Injectable()
export class KanbanBoardPlanningService {
	constructor(
		@InjectRepository(KanbanBoardPlanningEntity)
		private readonly planningRepository: Repository<KanbanBoardPlanningEntity>,
		@InjectRepository(KanbanBoardReleaseEntity)
		private readonly releaseRepository: Repository<KanbanBoardReleaseEntity>,
		@InjectRepository(KanbanBoardReleaseThemeEntity)
		private readonly themeRepository: Repository<KanbanBoardReleaseThemeEntity>,
		@InjectRepository(KanbanBoardReleaseTaskEntity)
		private readonly membershipRepository: Repository<KanbanBoardReleaseTaskEntity>,
		@InjectRepository(KanbanBoardTaskEntity)
		private readonly taskRepository: Repository<KanbanBoardTaskEntity>,
		@InjectRepository(KanbanBoardSprintEntity)
		private readonly sprintRepository: Repository<KanbanBoardSprintEntity>,
		@InjectRepository(KanbanBoardSupersprintEntity)
		private readonly supersprintRepository: Repository<KanbanBoardSupersprintEntity>,
		@InjectRepository(KanbanBoardColumnEntity)
		private readonly columnRepository: Repository<KanbanBoardColumnEntity>,
		private readonly registryService: KanbanBoardRegistryService,
	) {}

	async findAllPlannings(): Promise<KanbanBoardPlanningDto[]> {
		const plannings = await this.planningRepository.find({
			relations: { release: { sprint: true } },
			order: { updatedAt: "DESC" },
		});
		const taskCounts = await this.countTasksByReleaseIds(
			plannings.map((item) => item.releaseId),
		);
		return plannings.map((item) => this.toPlanningDto(item, taskCounts));
	}

	async findPlanningById(id: string): Promise<KanbanBoardPlanningDetailDto> {
		const planning = await this.requirePlanning(id);
		return this.toPlanningDetail(planning);
	}

	async createPlanning(
		dto: CreateKanbanBoardPlanningRequestDto,
	): Promise<KanbanBoardPlanningDetailDto> {
		const code = await this.ensureUniquePlanningCode(normalizeTrackerCode(dto.code));
		const name = dto.name.trim();
		if (!code || !name) {
			throw new BadRequestException("Код и название планирования обязательны");
		}

		const release = dto.releaseId?.trim()
			? await this.requireReleaseWithoutPlanning(dto.releaseId.trim())
			: await this.createReleaseFromPlanningDto(dto);

		const entity = this.planningRepository.create({
			id: ulid(),
			code,
			name,
			description: dto.description?.trim() || null,
			releaseId: release.id,
			layoutJson: null,
		});
		entity.release = release;
		await this.planningRepository.save(entity);
		return this.toPlanningDetail(entity);
	}

	async updatePlanning(
		id: string,
		dto: UpdateKanbanBoardPlanningRequestDto,
	): Promise<KanbanBoardPlanningDetailDto> {
		const planning = await this.requirePlanning(id);
		if (dto.code !== undefined) {
			planning.code = await this.ensureUniquePlanningCode(
				normalizeTrackerCode(dto.code),
				planning.id,
			);
		}
		if (dto.name !== undefined) planning.name = dto.name.trim();
		if (dto.description !== undefined) {
			planning.description = dto.description?.trim() || null;
		}
		if (!planning.code || !planning.name) {
			throw new BadRequestException("Код и название планирования обязательны");
		}
		await this.planningRepository.save(planning);
		return this.toPlanningDetail(planning);
	}

	async updatePlanningLayout(
		id: string,
		dto: UpdateKanbanBoardPlanningLayoutRequestDto,
	): Promise<KanbanBoardPlanningDetailDto> {
		const planning = await this.requirePlanning(id);
		if (dto.layoutJson !== null && typeof dto.layoutJson !== "object") {
			throw new BadRequestException("layoutJson должен быть объектом");
		}
		planning.layoutJson = dto.layoutJson ?? null;
		await this.planningRepository.save(planning);
		return this.toPlanningDetail(planning);
	}

	async deletePlanning(id: string): Promise<void> {
		const planning = await this.planningRepository.findOne({ where: { id } });
		if (!planning) throw new NotFoundException("Планирование не найдено");
		await this.planningRepository.remove(planning);
	}

	async findAllReleases(availableOnly = false): Promise<KanbanBoardReleaseDto[]> {
		const releases = await this.releaseRepository.find({
			relations: { supersprint: true, sprint: true, planning: true },
			order: { updatedAt: "DESC" },
		});
		const filtered = availableOnly
			? releases.filter((item) => !item.planning)
			: releases;
		const taskCounts = await this.countTasksByReleaseIds(
			filtered.map((item) => item.id),
		);
		const themeCounts = await this.countThemesByReleaseIds(
			filtered.map((item) => item.id),
		);
		return filtered.map((item) =>
			this.toReleaseDto(item, taskCounts, themeCounts),
		);
	}

	async updateRelease(
		id: string,
		dto: UpdateKanbanBoardReleaseRequestDto,
	): Promise<KanbanBoardPlanningDetailDto> {
		const release = await this.requireRelease(id);
		if (dto.code !== undefined) {
			release.code = await this.ensureUniqueReleaseCode(
				normalizeTrackerCode(dto.code),
				release.id,
			);
		}
		if (dto.name !== undefined) release.name = dto.name.trim();
		if (dto.description !== undefined) {
			release.description = dto.description?.trim() || null;
		}
		if (dto.status !== undefined) {
			if (!isKanbanBoardReleaseStatusId(dto.status)) {
				throw new BadRequestException("Неизвестный статус релиза");
			}
			release.status = dto.status;
		}
		if (dto.supersprintId !== undefined) {
			release.supersprintId = await this.resolveSupersprintId(dto.supersprintId);
			release.supersprint = undefined;
		}
		if (dto.sprintId !== undefined) {
			const sprint = await this.resolveSprint(dto.sprintId);
			release.sprintId = sprint?.id ?? null;
			release.sprint = sprint;
			if (
				dto.supersprintId === undefined &&
				sprint?.supersprintId &&
				!release.supersprintId
			) {
				release.supersprintId = sprint.supersprintId;
			}
		}
		if (dto.startDate !== undefined) {
			release.startDate = dto.startDate?.trim() || null;
		}
		if (dto.endDate !== undefined) {
			release.endDate = dto.endDate?.trim() || null;
		}
		if (!release.code || !release.name) {
			throw new BadRequestException("Код и название релиза обязательны");
		}
		await this.releaseRepository.save(release);
		return this.detailByReleaseId(release.id);
	}

	async createTheme(
		releaseId: string,
		dto: CreateKanbanBoardReleaseThemeRequestDto,
	): Promise<KanbanBoardReleaseThemeDto> {
		await this.requireRelease(releaseId);
		const name = dto.name.trim();
		if (!name) throw new BadRequestException("Название темы обязательно");
		const count = await this.themeRepository.count({ where: { releaseId } });
		const entity = this.themeRepository.create({
			id: ulid(),
			releaseId,
			name,
			color: dto.color?.trim() || nextKanbanBoardReleaseThemeColor(count),
			position: dto.position ?? count,
		});
		await this.themeRepository.save(entity);
		return this.toThemeDto(entity);
	}

	async updateTheme(
		releaseId: string,
		themeId: string,
		dto: UpdateKanbanBoardReleaseThemeRequestDto,
	): Promise<KanbanBoardReleaseThemeDto> {
		const theme = await this.requireTheme(releaseId, themeId);
		if (dto.name !== undefined) {
			const name = dto.name.trim();
			if (!name) throw new BadRequestException("Название темы обязательно");
			theme.name = name;
		}
		if (dto.color !== undefined) theme.color = dto.color.trim() || "#64748b";
		if (dto.position !== undefined) theme.position = dto.position;
		await this.themeRepository.save(theme);
		return this.toThemeDto(theme);
	}

	async deleteTheme(releaseId: string, themeId: string): Promise<void> {
		const theme = await this.requireTheme(releaseId, themeId);
		await this.themeRepository.remove(theme);
	}

	async attachTasks(
		releaseId: string,
		dto: AttachKanbanBoardReleaseTasksRequestDto,
	): Promise<KanbanBoardPlanningDetailDto> {
		await this.requireRelease(releaseId);
		const taskIds = [...new Set((dto.taskIds ?? []).map((id) => id.trim()).filter(Boolean))];
		if (!taskIds.length) {
			throw new BadRequestException("Нужно указать задачи");
		}
		const themeId = dto.themeId?.trim() || null;
		if (themeId) await this.requireTheme(releaseId, themeId);

		const existing = await this.membershipRepository.find({
			where: { releaseId, taskId: In(taskIds) },
		});
		const already = new Set(existing.map((item) => item.taskId));
		const incoming = taskIds.filter((id) => !already.has(id));
		if (!incoming.length) {
			return this.detailByReleaseId(releaseId);
		}

		const tasks = await this.taskRepository.find({
			where: { id: In(incoming), deletedAt: IsNull() },
		});
		if (tasks.length !== incoming.length) {
			throw new BadRequestException("Некоторые задачи не найдены");
		}

		const maxPosition = await this.nextMembershipPosition(releaseId, themeId);
		const rows = incoming.map((taskId, index) =>
			this.membershipRepository.create({
				releaseId,
				taskId,
				themeId,
				position: maxPosition + index,
			}),
		);
		await this.membershipRepository.save(rows);
		return this.detailByReleaseId(releaseId);
	}

	async detachTask(
		releaseId: string,
		taskId: string,
	): Promise<KanbanBoardPlanningDetailDto> {
		const membership = await this.membershipRepository.findOne({
			where: { releaseId, taskId },
		});
		if (!membership) throw new NotFoundException("Задача не прикреплена к релизу");
		await this.membershipRepository.remove(membership);
		return this.detailByReleaseId(releaseId);
	}

	async reorderTasks(
		releaseId: string,
		dto: ReorderKanbanBoardReleaseTasksRequestDto,
	): Promise<KanbanBoardPlanningDetailDto> {
		await this.requireRelease(releaseId);
		const items = dto.items ?? [];
		if (!items.length) {
			throw new BadRequestException("Нужно передать порядок задач");
		}
		const memberships = await this.membershipRepository.find({
			where: { releaseId },
		});
		const byTaskId = new Map(memberships.map((item) => [item.taskId, item]));
		const themeIds = new Set(
			(
				await this.themeRepository.find({
					where: { releaseId },
					select: { id: true },
				})
			).map((theme) => theme.id),
		);

		for (const item of items) {
			const membership = byTaskId.get(item.taskId);
			if (!membership) {
				throw new BadRequestException("Задача не входит в релиз");
			}
			const themeId = item.themeId?.trim() || null;
			if (themeId && !themeIds.has(themeId)) {
				throw new BadRequestException("Тема не найдена");
			}
			membership.themeId = themeId;
			membership.position = item.position;
		}
		await this.membershipRepository.save([...byTaskId.values()]);
		return this.detailByReleaseId(releaseId);
	}

	async moveTaskStatus(
		releaseId: string,
		taskId: string,
		dto: MoveKanbanBoardReleaseTaskStatusRequestDto,
		editor?: { createdBy?: string | null; lockHolderLabel?: string },
	): Promise<KanbanBoardPlanningDetailDto> {
		const membership = await this.membershipRepository.findOne({
			where: { releaseId, taskId },
		});
		if (!membership) throw new NotFoundException("Задача не прикреплена к релизу");

		const statusTitle = dto.statusTitle?.trim() ?? "";
		if (!statusTitle) {
			throw new BadRequestException("Нужно указать статус");
		}

		const task = await this.taskRepository.findOne({
			where: { id: taskId, deletedAt: IsNull() },
		});
		if (!task) throw new NotFoundException("Задача не найдена");

		const columns = await this.columnRepository.find({
			where: { boardId: task.boardId },
		});
		const column = findKanbanBoardColumnByStatusTitle(columns, statusTitle);
		if (!column) {
			throw new BadRequestException(
				`На доске задачи нет колонки «${statusTitle}»`,
			);
		}

		const update: UpdateKanbanBoardTaskRequestDto = {
			parentId: column.id,
			lockHolderLabel: editor?.lockHolderLabel,
		};
		await this.registryService.updateTask(taskId, update, editor?.createdBy);
		return this.detailByReleaseId(releaseId);
	}

	private async createReleaseFromPlanningDto(
		dto: CreateKanbanBoardPlanningRequestDto,
	): Promise<KanbanBoardReleaseEntity> {
		const name = (dto.releaseName ?? "").trim() || dto.name.trim();
		const code = await this.ensureUniqueReleaseCode(
			normalizeTrackerCode(dto.releaseCode || `REL-${ulid().slice(-8)}`),
		);
		if (!name || !code) {
			throw new BadRequestException("Для нового релиза нужны код и название");
		}
		const status: KanbanBoardReleaseStatusId = isKanbanBoardReleaseStatusId(
			dto.releaseStatus,
		)
			? dto.releaseStatus
			: "draft";
		const sprint = await this.resolveSprint(dto.sprintId);
		const supersprintId =
			(await this.resolveSupersprintId(dto.supersprintId)) ??
			sprint?.supersprintId ??
			null;

		const entity = this.releaseRepository.create({
			id: ulid(),
			code,
			name,
			description: dto.releaseDescription?.trim() || null,
			status,
			supersprintId,
			sprintId: sprint?.id ?? null,
			startDate: dto.startDate?.trim() || null,
			endDate: dto.endDate?.trim() || null,
		});
		entity.sprint = sprint;
		await this.releaseRepository.save(entity);
		return entity;
	}

	private async requirePlanning(id: string): Promise<KanbanBoardPlanningEntity> {
		const planning = await this.planningRepository.findOne({
			where: { id },
			relations: { release: { supersprint: true, sprint: true } },
		});
		if (!planning) throw new NotFoundException("Планирование не найдено");
		return planning;
	}

	private async requireRelease(id: string): Promise<KanbanBoardReleaseEntity> {
		const release = await this.releaseRepository.findOne({
			where: { id },
			relations: { supersprint: true, sprint: true, planning: true },
		});
		if (!release) throw new NotFoundException("Релиз не найден");
		return release;
	}

	private async requireReleaseWithoutPlanning(
		id: string,
	): Promise<KanbanBoardReleaseEntity> {
		const release = await this.requireRelease(id);
		if (release.planning) {
			throw new BadRequestException("У релиза уже есть планирование");
		}
		return release;
	}

	private async requireTheme(
		releaseId: string,
		themeId: string,
	): Promise<KanbanBoardReleaseThemeEntity> {
		const theme = await this.themeRepository.findOne({
			where: { id: themeId, releaseId },
		});
		if (!theme) throw new NotFoundException("Тема не найдена");
		return theme;
	}

	private async detailByReleaseId(
		releaseId: string,
	): Promise<KanbanBoardPlanningDetailDto> {
		const planning = await this.planningRepository.findOne({
			where: { releaseId },
			relations: { release: { supersprint: true, sprint: true } },
		});
		if (!planning) throw new NotFoundException("Планирование не найдено");
		return this.toPlanningDetail(planning);
	}

	private async toPlanningDetail(
		planning: KanbanBoardPlanningEntity,
	): Promise<KanbanBoardPlanningDetailDto> {
		const release = planning.release
			? planning.release
			: await this.requireRelease(planning.releaseId);
		const themes = await this.themeRepository.find({
			where: { releaseId: release.id },
			order: { position: "ASC", name: "ASC" },
		});
		const memberships = await this.membershipRepository.find({
			where: { releaseId: release.id },
			order: { position: "ASC" },
		});
		const taskDtos = await this.registryService.findRegistryTasksByIds(
			memberships.map((item) => item.taskId),
		);
		const taskById = new Map(taskDtos.map((task) => [task.id, task]));
		const tasks: KanbanBoardReleaseTaskDto[] = [];
		for (const membership of memberships) {
			const task = taskById.get(membership.taskId);
			if (!task) continue;
			tasks.push({
				taskId: membership.taskId,
				themeId: membership.themeId,
				position: membership.position,
				task,
			});
		}

		const taskCounts = new Map([[release.id, tasks.length]]);
		const themeCounts = new Map([[release.id, themes.length]]);
		release.planning = planning;

		return {
			...this.toPlanningDto(planning, taskCounts),
			layoutJson: planning.layoutJson ?? null,
			release: this.toReleaseDto(release, taskCounts, themeCounts),
			themes: themes.map((theme) => this.toThemeDto(theme)),
			tasks,
		};
	}

	private toPlanningDto(
		planning: KanbanBoardPlanningEntity,
		taskCounts: Map<string, number>,
	): KanbanBoardPlanningDto {
		const release = planning.release;
		const sprint = release?.sprint;
		return {
			id: planning.id,
			code: planning.code,
			name: planning.name,
			description: planning.description,
			releaseId: planning.releaseId,
			releaseCode: release?.code ?? "",
			releaseName: release?.name ?? "",
			releaseStatus: release?.status ?? "draft",
			sprintTitle: sprint ? `${sprint.code} — ${sprint.name}` : "",
			taskCount: taskCounts.get(planning.releaseId) ?? 0,
			hasLayout: planning.layoutJson != null,
			createdAt: planning.createdAt.toISOString(),
			updatedAt: planning.updatedAt.toISOString(),
		};
	}

	private toReleaseDto(
		release: KanbanBoardReleaseEntity,
		taskCounts: Map<string, number>,
		themeCounts: Map<string, number>,
	): KanbanBoardReleaseDto {
		return {
			id: release.id,
			code: release.code,
			name: release.name,
			description: release.description,
			status: release.status,
			supersprintId: release.supersprintId,
			supersprintCode: release.supersprint?.code ?? "",
			supersprintName: release.supersprint?.name ?? "",
			sprintId: release.sprintId,
			sprintCode: release.sprint?.code ?? "",
			sprintName: release.sprint?.name ?? "",
			startDate: release.startDate,
			endDate: release.endDate,
			themeCount: themeCounts.get(release.id) ?? 0,
			taskCount: taskCounts.get(release.id) ?? 0,
			hasPlanning: Boolean(release.planning),
			planningId: release.planning?.id ?? null,
			createdAt: release.createdAt.toISOString(),
			updatedAt: release.updatedAt.toISOString(),
		};
	}

	private toThemeDto(theme: KanbanBoardReleaseThemeEntity): KanbanBoardReleaseThemeDto {
		return {
			id: theme.id,
			releaseId: theme.releaseId,
			name: theme.name,
			color: theme.color,
			position: theme.position,
		};
	}

	private async countTasksByReleaseIds(
		releaseIds: string[],
	): Promise<Map<string, number>> {
		if (!releaseIds.length) return new Map();
		const rows = await this.membershipRepository
			.createQueryBuilder("item")
			.select("item.release_id", "releaseId")
			.addSelect("COUNT(*)", "count")
			.where("item.release_id IN (:...ids)", { ids: releaseIds })
			.groupBy("item.release_id")
			.getRawMany<{ releaseId: string; count: string }>();
		return new Map(rows.map((row) => [row.releaseId, Number(row.count)]));
	}

	private async countThemesByReleaseIds(
		releaseIds: string[],
	): Promise<Map<string, number>> {
		if (!releaseIds.length) return new Map();
		const rows = await this.themeRepository
			.createQueryBuilder("theme")
			.select("theme.release_id", "releaseId")
			.addSelect("COUNT(*)", "count")
			.where("theme.release_id IN (:...ids)", { ids: releaseIds })
			.groupBy("theme.release_id")
			.getRawMany<{ releaseId: string; count: string }>();
		return new Map(rows.map((row) => [row.releaseId, Number(row.count)]));
	}

	private async nextMembershipPosition(
		releaseId: string,
		themeId: string | null,
	): Promise<number> {
		const max = await this.membershipRepository
			.createQueryBuilder("item")
			.select("COALESCE(MAX(item.position), -1)", "max")
			.where("item.release_id = :releaseId", { releaseId })
			.andWhere(
				themeId ? "item.theme_id = :themeId" : "item.theme_id IS NULL",
				themeId ? { themeId } : {},
			)
			.getRawOne<{ max: string }>();
		return Number(max?.max ?? -1) + 1;
	}

	private async ensureUniquePlanningCode(
		code: string,
		exceptId?: string,
	): Promise<string> {
		if (!code) throw new BadRequestException("Код планирования обязателен");
		const existing = await this.planningRepository.findOne({
			where: exceptId
				? { code, id: Not(exceptId) }
				: { code },
		});
		if (existing) throw new BadRequestException("Код планирования уже используется");
		return code;
	}

	private async ensureUniqueReleaseCode(
		code: string,
		exceptId?: string,
	): Promise<string> {
		if (!code) throw new BadRequestException("Код релиза обязателен");
		const existing = await this.releaseRepository.findOne({
			where: exceptId ? { code, id: Not(exceptId) } : { code },
		});
		if (existing) throw new BadRequestException("Код релиза уже используется");
		return code;
	}

	private async resolveSprint(
		sprintId?: string | null,
	): Promise<KanbanBoardSprintEntity | null> {
		const id = sprintId?.trim() || "";
		if (!id) return null;
		const sprint = await this.sprintRepository.findOne({
			where: { id },
			relations: { supersprint: true },
		});
		if (!sprint) throw new NotFoundException("Спринт не найден");
		return sprint;
	}

	private async resolveSupersprintId(
		supersprintId?: string | null,
	): Promise<string | null> {
		const id = supersprintId?.trim() || "";
		if (!id) return null;
		const supersprint = await this.supersprintRepository.findOne({
			where: { id },
		});
		if (!supersprint) throw new NotFoundException("Суперспринт не найден");
		return supersprint.id;
	}
}
