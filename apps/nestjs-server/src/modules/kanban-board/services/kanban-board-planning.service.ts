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
	findKanbanBoardDoneColumnId,
	isKanbanBoardReleaseStatusId,
	kanbanBoardIsCancelledColumn,
	kanbanBoardReleaseVisibleOnBoard,
	KANBAN_BOARD_RELEASE_DONE_STATUS_ID,
	nextKanbanBoardReleaseThemeColor,
	normalizeTrackerCode,
	type AttachKanbanBoardPlanningReleaseRequestDto,
	type AttachKanbanBoardReleaseTasksRequestDto,
	type CreateKanbanBoardPlanningRequestDto,
	type CreateKanbanBoardReleaseRequestDto,
	type CreateKanbanBoardReleaseThemeRequestDto,
	type KanbanBoardPlanningDetailDto,
	type KanbanBoardPlanningDto,
	type KanbanBoardPlanningKanbanImportResultDto,
	type KanbanBoardReleaseDto,
	type KanbanBoardReleaseDetailDto,
	type KanbanBoardReleaseStatusId,
	type KanbanBoardReleaseTaskDto,
	type KanbanBoardReleaseThemeDto,
	type MoveKanbanBoardReleaseTaskRequestDto,
	type MoveKanbanBoardReleaseTaskStatusRequestDto,
	type ReorderKanbanBoardReleaseTasksRequestDto,
	type UpdateKanbanBoardPlanningLayoutRequestDto,
	type UpdateKanbanBoardPlanningRequestDto,
	type UpdateKanbanBoardReleaseRequestDto,
	type UpdateKanbanBoardReleaseThemeRequestDto,
	type UpdateKanbanBoardTaskRequestDto,
	normalizeKanbanBoardReleaseImageVersions,
	kanbanBoardTaskReleasesTitle,
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
import { importKanbanPlanningXlsx } from "../utils/kanban-board-planning-import.util";

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
			relations: { releases: true },
			order: { updatedAt: "DESC" },
		});
		const releaseIds = plannings.flatMap((item) =>
			(item.releases ?? []).map((release) => release.id),
		);
		const taskCounts = await this.countTasksByReleaseIds(releaseIds);
		return plannings.map((item) => this.toPlanningDto(item, taskCounts));
	}

	async findPlanningById(id: string): Promise<KanbanBoardPlanningDetailDto> {
		const planning = await this.requirePlanning(id);
		return this.toPlanningDetail(planning);
	}

	async createPlanning(
		dto: CreateKanbanBoardPlanningRequestDto,
	): Promise<KanbanBoardPlanningDetailDto> {
		const code = await this.ensureUniquePlanningCode(
			normalizeTrackerCode(dto.code),
		);
		const name = dto.name.trim();
		if (!code || !name) {
			throw new BadRequestException("Код и название планирования обязательны");
		}

		const entity = this.planningRepository.create({
			id: ulid(),
			code,
			name,
			description: dto.description?.trim() || null,
			layoutJson: null,
		});
		await this.planningRepository.save(entity);
		return this.findPlanningById(entity.id);
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

	async findReleaseById(id: string): Promise<KanbanBoardReleaseDetailDto> {
		const release = await this.requireRelease(id);
		const memberships = await this.membershipRepository.find({
			where: { releaseId: id },
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
				releaseId: membership.releaseId,
				themeId: membership.themeId,
				position: membership.position,
				task,
			});
		}
		const dto = await this.toReleaseDtoWithCounts(release);
		return { ...dto, taskCount: tasks.length, tasks };
	}

	async findAllReleases(
		availableOnly = false,
	): Promise<KanbanBoardReleaseDto[]> {
		const releases = await this.releaseRepository.find({
			relations: { supersprint: true, sprint: true, planning: true },
			order: { updatedAt: "DESC" },
		});
		const filtered = availableOnly
			? releases.filter((item) => !item.planningId)
			: releases;
		const taskCounts = await this.countTasksByReleaseIds(
			filtered.map((item) => item.id),
		);
		return filtered.map((item) =>
			this.toReleaseDto(item, taskCounts, new Map()),
		);
	}

	async createRelease(
		dto: CreateKanbanBoardReleaseRequestDto,
	): Promise<KanbanBoardReleaseDto> {
		const release = await this.buildRelease(dto);
		if (dto.planningId !== undefined) {
			release.planningId = await this.resolvePlanningId(dto.planningId);
			release.planning = undefined;
		}
		await this.releaseRepository.save(release);
		return this.toReleaseDtoWithCounts(release);
	}

	async addReleaseToPlanning(
		planningId: string,
		dto: AttachKanbanBoardPlanningReleaseRequestDto,
	): Promise<KanbanBoardPlanningDetailDto> {
		const planning = await this.requirePlanning(planningId);
		if (dto.releaseId?.trim()) {
			const release = await this.requireReleaseWithoutPlanning(
				dto.releaseId.trim(),
			);
			release.planningId = planning.id;
			release.planning = planning;
			await this.releaseRepository.save(release);
			return this.findPlanningById(planning.id);
		}
		if (!dto.code?.trim() || !dto.name?.trim()) {
			throw new BadRequestException(
				"Укажите существующий релиз или код и название нового",
			);
		}
		const created = await this.buildRelease({
			code: dto.code ?? `REL-${ulid().slice(-8)}`,
			name: dto.name ?? "",
			description: dto.description,
			status: dto.status,
			supersprintId: dto.supersprintId,
			sprintId: dto.sprintId,
			startDate: dto.startDate,
			endDate: dto.endDate,
			imageVersions: dto.imageVersions,
		});
		created.planningId = planning.id;
		created.planning = planning;
		await this.releaseRepository.save(created);
		return this.findPlanningById(planning.id);
	}

	async removeReleaseFromPlanning(
		planningId: string,
		releaseId: string,
	): Promise<KanbanBoardPlanningDetailDto> {
		const planning = await this.requirePlanning(planningId);
		const release = await this.requireRelease(releaseId);
		if (release.planningId !== planning.id) {
			throw new BadRequestException("Релиз не входит в это планирование");
		}
		release.planningId = null;
		release.planning = null;
		await this.releaseRepository.save(release);
		return this.findPlanningById(planning.id);
	}

	async deleteRelease(id: string): Promise<void> {
		const release = await this.releaseRepository.findOne({ where: { id } });
		if (!release) throw new NotFoundException("Релиз не найден");
		await this.releaseRepository.remove(release);
	}

	async updateRelease(
		id: string,
		dto: UpdateKanbanBoardReleaseRequestDto,
	): Promise<KanbanBoardReleaseDto> {
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
		if (dto.planningId !== undefined) {
			release.planningId = await this.resolvePlanningId(dto.planningId);
			release.planning = undefined;
		}
		if (dto.supersprintId !== undefined) {
			release.supersprintId = await this.resolveSupersprintId(
				dto.supersprintId,
			);
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
		if (dto.imageVersions !== undefined) {
			release.imageVersions = normalizeKanbanBoardReleaseImageVersions(
				dto.imageVersions,
			);
		}
		if (!release.code || !release.name) {
			throw new BadRequestException("Код и название релиза обязательны");
		}
		await this.releaseRepository.save(release);
		return this.toReleaseDtoWithCounts(release);
	}

	async completeRelease(
		id: string,
		editor?: { createdBy?: string | null; lockHolderLabel?: string },
	): Promise<KanbanBoardReleaseDetailDto> {
		const release = await this.requireRelease(id);
		if (release.status === "cancelled" || release.status === "archived") {
			throw new BadRequestException(
				"Нельзя завершить отменённый или архивный релиз",
			);
		}

		const memberships = await this.membershipRepository.find({
			where: { releaseId: id },
		});
		const taskIds = memberships.map((item) => item.taskId);
		const tasks = taskIds.length
			? await this.taskRepository.find({
					where: { id: In(taskIds), deletedAt: IsNull() },
				})
			: [];
		const boardIds = [...new Set(tasks.map((task) => task.boardId))];
		const columns = boardIds.length
			? await this.columnRepository.find({
					where: { boardId: In(boardIds) },
				})
			: [];
		const columnsByBoard = new Map<string, typeof columns>();
		for (const column of columns) {
			const list = columnsByBoard.get(column.boardId) ?? [];
			list.push(column);
			columnsByBoard.set(column.boardId, list);
		}

		const toMove: typeof tasks = [];
		for (const task of tasks) {
			const boardColumns = columnsByBoard.get(task.boardId) ?? [];
			const current = boardColumns.find(
				(column) => column.id === task.parentId,
			);
			if (current && kanbanBoardIsCancelledColumn(current)) continue;
			const doneId = findKanbanBoardDoneColumnId(boardColumns);
			if (!doneId) {
				throw new BadRequestException(
					"На доске задачи нет колонки «Готово» — завершить релиз нельзя",
				);
			}
			if (task.parentId !== doneId) toMove.push(task);
		}

		for (const task of toMove) {
			const boardColumns = columnsByBoard.get(task.boardId) ?? [];
			const doneId = findKanbanBoardDoneColumnId(boardColumns);
			if (!doneId || task.parentId === doneId) continue;
			const update: UpdateKanbanBoardTaskRequestDto = {
				parentId: doneId,
				lockHolderLabel: editor?.lockHolderLabel,
				forceOverwrite: true,
			};
			await this.registryService.updateTask(task.id, update, editor?.createdBy);
		}

		release.status = KANBAN_BOARD_RELEASE_DONE_STATUS_ID;
		await this.releaseRepository.save(release);
		return this.findReleaseById(release.id);
	}

	async createTheme(
		planningId: string,
		dto: CreateKanbanBoardReleaseThemeRequestDto,
	): Promise<KanbanBoardReleaseThemeDto> {
		await this.requirePlanning(planningId);
		const name = dto.name.trim();
		if (!name) throw new BadRequestException("Название темы обязательно");
		const count = await this.themeRepository.count({ where: { planningId } });
		const entity = this.themeRepository.create({
			id: ulid(),
			planningId,
			name,
			color: dto.color?.trim() || nextKanbanBoardReleaseThemeColor(count),
			position: dto.position ?? count,
		});
		await this.themeRepository.save(entity);
		return this.toThemeDto(entity);
	}

	async updateTheme(
		planningId: string,
		themeId: string,
		dto: UpdateKanbanBoardReleaseThemeRequestDto,
	): Promise<KanbanBoardReleaseThemeDto> {
		const theme = await this.requireTheme(planningId, themeId);
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

	async deleteTheme(planningId: string, themeId: string): Promise<void> {
		const theme = await this.requireTheme(planningId, themeId);
		await this.themeRepository.remove(theme);
	}

	async createThemeFromRelease(
		releaseId: string,
		dto: CreateKanbanBoardReleaseThemeRequestDto,
	): Promise<KanbanBoardReleaseThemeDto> {
		return this.createTheme(await this.planningIdOfRelease(releaseId), dto);
	}

	async updateThemeFromRelease(
		releaseId: string,
		themeId: string,
		dto: UpdateKanbanBoardReleaseThemeRequestDto,
	): Promise<KanbanBoardReleaseThemeDto> {
		return this.updateTheme(
			await this.planningIdOfRelease(releaseId),
			themeId,
			dto,
		);
	}

	async deleteThemeFromRelease(
		releaseId: string,
		themeId: string,
	): Promise<void> {
		return this.deleteTheme(await this.planningIdOfRelease(releaseId), themeId);
	}

	async attachTasks(
		releaseId: string,
		dto: AttachKanbanBoardReleaseTasksRequestDto,
	): Promise<KanbanBoardReleaseDetailDto> {
		const release = await this.requireRelease(releaseId);
		const taskIds = [
			...new Set((dto.taskIds ?? []).map((id) => id.trim()).filter(Boolean)),
		];
		if (!taskIds.length) {
			throw new BadRequestException("Нужно указать задачи");
		}
		const themeId = dto.themeId?.trim() || null;
		if (themeId) {
			if (!release.planningId) {
				throw new BadRequestException("Тема задаётся в планировании");
			}
			await this.requireTheme(release.planningId, themeId);
		}

		if (release.planningId) {
			await this.detachFromSiblingReleases(
				release.planningId,
				releaseId,
				taskIds,
			);
		}

		const existing = await this.membershipRepository.find({
			where: { releaseId, taskId: In(taskIds) },
		});
		const already = new Set(existing.map((item) => item.taskId));
		const incoming = taskIds.filter((id) => !already.has(id));
		if (!incoming.length) {
			return this.findReleaseById(releaseId);
		}

		const tasks = await this.taskRepository.find({
			where: { id: In(incoming), deletedAt: IsNull() },
		});
		if (tasks.length !== incoming.length) {
			throw new BadRequestException("Некоторые задачи не найдены");
		}

		const maxPosition = release.planningId
			? await this.nextPlanningThemePosition(release.planningId, themeId)
			: await this.nextMembershipPosition(releaseId, themeId);
		const rows = incoming.map((taskId, index) =>
			this.membershipRepository.create({
				releaseId,
				taskId,
				themeId,
				position: maxPosition + index,
			}),
		);
		await this.membershipRepository.save(rows);
		if (kanbanBoardReleaseVisibleOnBoard(release.status)) {
			await this.registryService.moveTasksToReleasesColumn(incoming);
		}
		return this.findReleaseById(releaseId);
	}

	async importKanbanXlsx(
		planningId: string,
		buf: Buffer,
		releaseId?: string,
	): Promise<KanbanBoardPlanningKanbanImportResultDto> {
		await this.requirePlanning(planningId);
		const release = await this.resolveImportRelease(planningId, releaseId);
		const parsed = await importKanbanPlanningXlsx(buf);
		const upserted =
			await this.registryService.upsertTasksFromKanbanSheet(parsed);
		await this.attachTasks(release.id, { taskIds: upserted.taskIds });

		return {
			sheetName: parsed.sheetName,
			releaseId: release.id,
			releaseName: release.name,
			createdCount: upserted.createdCount,
			updatedCount: upserted.updatedCount,
			attachedCount: upserted.taskIds.length,
			warnings: upserted.warnings,
			boards: upserted.boards,
		};
	}

	private async resolveImportRelease(
		planningId: string,
		releaseId?: string,
	): Promise<KanbanBoardReleaseEntity> {
		if (releaseId?.trim()) {
			const release = await this.requireRelease(releaseId.trim());
			if (release.planningId !== planningId) {
				throw new BadRequestException("Релиз не принадлежит этому планированию");
			}
			return release;
		}

		const releases = await this.releaseRepository.find({
			where: { planningId },
			order: { createdAt: "ASC" },
		});
		if (!releases[0]) {
			throw new BadRequestException(
				"Сначала создайте релиз в этом планировании",
			);
		}
		return releases[0];
	}

	async detachTask(
		releaseId: string,
		taskId: string,
	): Promise<KanbanBoardReleaseDetailDto> {
		const membership = await this.membershipRepository.findOne({
			where: { releaseId, taskId },
		});
		if (!membership)
			throw new NotFoundException("Задача не прикреплена к релизу");
		await this.membershipRepository.remove(membership);
		return this.findReleaseById(releaseId);
	}

	async reorderTasks(
		releaseId: string,
		dto: ReorderKanbanBoardReleaseTasksRequestDto,
	): Promise<KanbanBoardReleaseDetailDto> {
		const release = await this.requireRelease(releaseId);
		if (release.planningId) {
			await this.reorderPlanningTasks(release.planningId, dto);
			return this.findReleaseById(releaseId);
		}
		const items = dto.items ?? [];
		if (!items.length) {
			throw new BadRequestException("Нужно передать порядок задач");
		}
		const memberships = await this.membershipRepository.find({
			where: { releaseId },
		});
		const byTaskId = new Map(memberships.map((item) => [item.taskId, item]));
		for (const item of items) {
			const membership = byTaskId.get(item.taskId);
			if (!membership) {
				throw new BadRequestException("Задача не входит в релиз");
			}
			if (item.themeId?.trim()) {
				throw new BadRequestException("Тема задаётся в планировании");
			}
			membership.themeId = null;
			membership.position = item.position;
		}
		await this.membershipRepository.save([...byTaskId.values()]);
		return this.findReleaseById(releaseId);
	}

	async reorderPlanningTasks(
		planningId: string,
		dto: ReorderKanbanBoardReleaseTasksRequestDto,
	): Promise<KanbanBoardPlanningDetailDto> {
		await this.requirePlanning(planningId);
		const items = dto.items ?? [];
		if (!items.length) {
			throw new BadRequestException("Нужно передать порядок задач");
		}
		const releaseIds = (
			await this.releaseRepository.find({
				where: { planningId },
				select: { id: true },
			})
		).map((item) => item.id);
		const memberships = releaseIds.length
			? await this.membershipRepository.find({
					where: { releaseId: In(releaseIds) },
				})
			: [];
		const byTaskId = new Map(memberships.map((item) => [item.taskId, item]));
		const themeIds = new Set(
			(
				await this.themeRepository.find({
					where: { planningId },
					select: { id: true },
				})
			).map((theme) => theme.id),
		);

		for (const item of items) {
			const membership = byTaskId.get(item.taskId);
			if (!membership) {
				throw new BadRequestException("Задача не входит в планирование");
			}
			const themeId = item.themeId?.trim() || null;
			if (themeId && !themeIds.has(themeId)) {
				throw new BadRequestException("Тема не найдена");
			}
			membership.themeId = themeId;
			membership.position = item.position;
		}
		await this.membershipRepository.save([...byTaskId.values()]);
		return this.findPlanningById(planningId);
	}

	async moveTaskStatus(
		releaseId: string,
		taskId: string,
		dto: MoveKanbanBoardReleaseTaskStatusRequestDto,
		editor?: { createdBy?: string | null; lockHolderLabel?: string },
	): Promise<KanbanBoardReleaseDetailDto> {
		const membership = await this.membershipRepository.findOne({
			where: { releaseId, taskId },
		});
		if (!membership)
			throw new NotFoundException("Задача не прикреплена к релизу");

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
		return this.findReleaseById(releaseId);
	}

	async moveTask(
		releaseId: string,
		taskId: string,
		dto: MoveKanbanBoardReleaseTaskRequestDto,
	): Promise<KanbanBoardPlanningDetailDto> {
		const source = await this.requireRelease(releaseId);
		const targetReleaseId = dto.targetReleaseId?.trim() || "";
		if (!targetReleaseId) {
			throw new BadRequestException("Нужно указать целевой релиз");
		}
		const target = await this.requireRelease(targetReleaseId);
		if (!source.planningId || source.planningId !== target.planningId) {
			throw new BadRequestException(
				"Перенос возможен только между релизами одного планирования",
			);
		}

		const membership = await this.membershipRepository.findOne({
			where: { releaseId, taskId },
		});
		if (!membership)
			throw new NotFoundException("Задача не прикреплена к релизу");

		const themeId =
			dto.themeId !== undefined
				? dto.themeId?.trim() || null
				: membership.themeId;
		if (themeId) await this.requireTheme(source.planningId, themeId);

		if (source.id === target.id) {
			membership.themeId = themeId;
			await this.membershipRepository.save(membership);
			return this.findPlanningById(source.planningId);
		}

		await this.membershipRepository.remove(membership);
		const existing = await this.membershipRepository.findOne({
			where: { releaseId: target.id, taskId },
		});
		if (existing) {
			existing.themeId = themeId;
			await this.membershipRepository.save(existing);
		} else {
			const position = await this.nextPlanningThemePosition(
				source.planningId,
				themeId,
			);
			await this.membershipRepository.save(
				this.membershipRepository.create({
					releaseId: target.id,
					taskId,
					themeId,
					position,
				}),
			);
		}
		if (kanbanBoardReleaseVisibleOnBoard(target.status)) {
			await this.registryService.moveTasksToReleasesColumn([taskId]);
		}
		return this.findPlanningById(source.planningId);
	}

	private async buildRelease(
		dto: CreateKanbanBoardReleaseRequestDto,
	): Promise<KanbanBoardReleaseEntity> {
		const name = dto.name.trim();
		const code = await this.ensureUniqueReleaseCode(
			normalizeTrackerCode(dto.code),
		);
		if (!name || !code) {
			throw new BadRequestException("Код и название релиза обязательны");
		}
		const status: KanbanBoardReleaseStatusId = isKanbanBoardReleaseStatusId(
			dto.status,
		)
			? dto.status
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
			description: dto.description?.trim() || null,
			status,
			supersprintId,
			sprintId: sprint?.id ?? null,
			startDate: dto.startDate?.trim() || null,
			endDate: dto.endDate?.trim() || null,
			planningId: null,
			imageVersions: normalizeKanbanBoardReleaseImageVersions(
				dto.imageVersions,
			),
		});
		entity.sprint = sprint;
		return entity;
	}

	private async requirePlanning(
		id: string,
	): Promise<KanbanBoardPlanningEntity> {
		const planning = await this.planningRepository.findOne({ where: { id } });
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
		if (release.planningId) {
			throw new BadRequestException("У релиза уже есть планирование");
		}
		return release;
	}

	private async planningIdOfRelease(releaseId: string): Promise<string> {
		const release = await this.requireRelease(releaseId);
		if (!release.planningId) {
			throw new BadRequestException("Группа принадлежит планированию");
		}
		return release.planningId;
	}

	private async requireTheme(
		planningId: string,
		themeId: string,
	): Promise<KanbanBoardReleaseThemeEntity> {
		const theme = await this.themeRepository.findOne({
			where: { id: themeId, planningId },
		});
		if (!theme) throw new NotFoundException("Тема не найдена");
		return theme;
	}

	private async toPlanningDetail(
		planning: KanbanBoardPlanningEntity,
	): Promise<KanbanBoardPlanningDetailDto> {
		const releases = await this.releaseRepository.find({
			where: { planningId: planning.id },
			relations: { supersprint: true, sprint: true, planning: true },
			order: { code: "ASC" },
		});
		const releaseIds = releases.map((item) => item.id);
		const themes = await this.themeRepository.find({
			where: { planningId: planning.id },
			order: { position: "ASC", name: "ASC" },
		});
		const memberships = releaseIds.length
			? await this.membershipRepository.find({
					where: { releaseId: In(releaseIds) },
					order: { position: "ASC" },
				})
			: [];
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
				releaseId: membership.releaseId,
				themeId: membership.themeId,
				position: membership.position,
				task,
			});
		}

		const taskCounts = new Map<string, number>();
		const themeCounts = new Map<string, number>();
		for (const release of releases) {
			taskCounts.set(
				release.id,
				tasks.filter((item) => item.releaseId === release.id).length,
			);
			release.planning = planning;
		}

		return {
			...this.toPlanningDto(planning, taskCounts, releases),
			layoutJson: planning.layoutJson ?? null,
			releases: releases.map((release) =>
				this.toReleaseDto(release, taskCounts, themeCounts),
			),
			themes: themes.map((theme) => this.toThemeDto(theme)),
			tasks,
		};
	}

	private toPlanningDto(
		planning: KanbanBoardPlanningEntity,
		taskCounts: Map<string, number>,
		releases = planning.releases ?? [],
	): KanbanBoardPlanningDto {
		const taskCount = releases.reduce(
			(sum, release) => sum + (taskCounts.get(release.id) ?? 0),
			0,
		);
		return {
			id: planning.id,
			code: planning.code,
			name: planning.name,
			description: planning.description,
			releaseTitle: kanbanBoardTaskReleasesTitle(releases),
			releaseCount: releases.length,
			taskCount,
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
		const planningId = release.planningId ?? release.planning?.id ?? null;
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
			imageVersions: normalizeKanbanBoardReleaseImageVersions(
				release.imageVersions,
			),
			themeCount: themeCounts.get(release.id) ?? 0,
			taskCount: taskCounts.get(release.id) ?? 0,
			hasPlanning: Boolean(planningId),
			planningId,
			planningCode: release.planning?.code ?? "",
			planningName: release.planning?.name ?? "",
			createdAt: release.createdAt.toISOString(),
			updatedAt: release.updatedAt.toISOString(),
		};
	}

	private async toReleaseDtoWithCounts(
		release: KanbanBoardReleaseEntity,
	): Promise<KanbanBoardReleaseDto> {
		if (!release.planning && release.planningId) {
			release.planning =
				(await this.planningRepository.findOne({
					where: { id: release.planningId },
				})) ?? undefined;
		}
		const taskCounts = await this.countTasksByReleaseIds([release.id]);
		return this.toReleaseDto(release, taskCounts, new Map());
	}

	private async detachFromSiblingReleases(
		planningId: string,
		keepReleaseId: string,
		taskIds: string[],
	): Promise<void> {
		if (!taskIds.length) return;
		const siblings = await this.releaseRepository.find({
			where: { planningId },
			select: { id: true },
		});
		const siblingIds = siblings
			.map((item) => item.id)
			.filter((id) => id !== keepReleaseId);
		if (!siblingIds.length) return;
		await this.membershipRepository.delete({
			releaseId: In(siblingIds),
			taskId: In(taskIds),
		});
	}

	private toThemeDto(
		theme: KanbanBoardReleaseThemeEntity,
	): KanbanBoardReleaseThemeDto {
		return {
			id: theme.id,
			planningId: theme.planningId,
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

	private async nextPlanningThemePosition(
		planningId: string,
		themeId: string | null,
	): Promise<number> {
		const releaseIds = (
			await this.releaseRepository.find({
				where: { planningId },
				select: { id: true },
			})
		).map((item) => item.id);
		if (!releaseIds.length) return 0;
		const max = await this.membershipRepository
			.createQueryBuilder("item")
			.select("COALESCE(MAX(item.position), -1)", "max")
			.where("item.release_id IN (:...ids)", { ids: releaseIds })
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
			where: exceptId ? { code, id: Not(exceptId) } : { code },
		});
		if (existing)
			throw new BadRequestException("Код планирования уже используется");
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

	private async resolvePlanningId(
		planningId?: string | null,
	): Promise<string | null> {
		const id = planningId?.trim() || "";
		if (!id) return null;
		const planning = await this.planningRepository.findOne({ where: { id } });
		if (!planning) throw new NotFoundException("Планирование не найдено");
		return planning.id;
	}
}
