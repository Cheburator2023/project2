import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ulid } from "ulid";
import {
	KANBAN_BOARD_COLUMN_COLORS,
	KANBAN_BOARD_STATUSES,
	pickKanbanBoardColumnColor,
	type CreateKanbanBoardAssigneeRequestDto,
	type CreateKanbanBoardBoardRequestDto,
	type CreateKanbanBoardColumnRequestDto,
	type CreateKanbanBoardProjectRequestDto,
	type CreateKanbanBoardTaskRequestDto,
	type KanbanBoardAssigneeDto,
	type KanbanBoardBoardDto,
	type KanbanBoardColumnDto,
	type KanbanBoardProjectDto,
	type KanbanBoardTaskRegistryDto,
	type UpdateKanbanBoardAssigneeRequestDto,
	type UpdateKanbanBoardBoardRequestDto,
	type UpdateKanbanBoardColumnRequestDto,
	type UpdateKanbanBoardProjectRequestDto,
	type UpdateKanbanBoardTaskRequestDto,
} from "@smart-anketa/api-contract";
import { KanbanBoardEntity } from "../entities/kanban-board.entity";
import { KanbanBoardAssigneeEntity } from "../entities/kanban-board-assignee.entity";
import { KanbanBoardColumnEntity } from "../entities/kanban-board-column.entity";
import { KanbanBoardProjectEntity } from "../entities/kanban-board-project.entity";
import { KanbanBoardTaskEntity } from "../entities/kanban-board-task.entity";
import { KanbanBoardService } from "./kanban-board.service";

@Injectable()
export class KanbanBoardRegistryService {
	constructor(
		@InjectRepository(KanbanBoardProjectEntity)
		private readonly projectRepository: Repository<KanbanBoardProjectEntity>,
		@InjectRepository(KanbanBoardEntity)
		private readonly boardRepository: Repository<KanbanBoardEntity>,
		@InjectRepository(KanbanBoardColumnEntity)
		private readonly columnRepository: Repository<KanbanBoardColumnEntity>,
		@InjectRepository(KanbanBoardAssigneeEntity)
		private readonly assigneeRepository: Repository<KanbanBoardAssigneeEntity>,
		@InjectRepository(KanbanBoardTaskEntity)
		private readonly taskRepository: Repository<KanbanBoardTaskEntity>,
		private readonly kanbanBoardService: KanbanBoardService,
	) {}

	async findAllProjects(): Promise<KanbanBoardProjectDto[]> {
		const projects = await this.projectRepository.find({
			order: { name: "ASC" },
		});
		const boardCounts = await this.boardRepository
			.createQueryBuilder("board")
			.select("board.project_id", "projectId")
			.addSelect("COUNT(*)", "count")
			.groupBy("board.project_id")
			.getRawMany<{ projectId: string; count: string }>();
		const countMap = new Map(
			boardCounts.map((row) => [row.projectId, Number(row.count)]),
		);

		return projects.map((project) => this.toProjectDto(project, countMap));
	}

	async createProject(
		dto: CreateKanbanBoardProjectRequestDto,
	): Promise<KanbanBoardProjectDto> {
		const code = dto.code.trim();
		const name = dto.name.trim();
		if (!code || !name) {
			throw new BadRequestException("Код и название обязательны");
		}

		const entity = this.projectRepository.create({
			id: ulid(),
			code,
			name,
			description: dto.description?.trim() || null,
			isStock: false,
		});
		await this.projectRepository.save(entity);
		return this.toProjectDto(entity, new Map([[entity.id, 0]]));
	}

	async updateProject(
		id: string,
		dto: UpdateKanbanBoardProjectRequestDto,
	): Promise<KanbanBoardProjectDto> {
		const project = await this.projectRepository.findOne({ where: { id } });
		if (!project) throw new NotFoundException("Проект не найден");
		if (project.isStock && dto.code && dto.code !== project.code) {
			throw new BadRequestException("Нельзя менять код стокового проекта");
		}

		if (dto.code !== undefined) project.code = dto.code.trim();
		if (dto.name !== undefined) project.name = dto.name.trim();
		if (dto.description !== undefined) {
			project.description = dto.description?.trim() || null;
		}

		await this.projectRepository.save(project);
		const boardCount = await this.boardRepository.count({
			where: { projectId: project.id },
		});
		return this.toProjectDto(project, new Map([[project.id, boardCount]]));
	}

	async deleteProject(id: string): Promise<void> {
		const project = await this.projectRepository.findOne({ where: { id } });
		if (!project) throw new NotFoundException("Проект не найден");
		if (project.isStock) {
			throw new BadRequestException("Стоковый проект нельзя удалить");
		}
		await this.projectRepository.remove(project);
	}

	async findAllAssignees(): Promise<KanbanBoardAssigneeDto[]> {
		const assignees = await this.assigneeRepository.find({
			order: { name: "ASC" },
		});
		const taskCounts = await this.countTasksByAssigneeName();
		return assignees.map((assignee) =>
			this.toAssigneeDto(assignee, taskCounts),
		);
	}

	async createAssignee(
		dto: CreateKanbanBoardAssigneeRequestDto,
	): Promise<KanbanBoardAssigneeDto> {
		const code = dto.code.trim();
		const name = dto.name.trim();
		if (!code || !name) {
			throw new BadRequestException("Код и имя обязательны");
		}

		const entity = this.assigneeRepository.create({
			id: ulid(),
			code,
			name,
			email: dto.email?.trim() || null,
		});
		await this.assigneeRepository.save(entity);
		return this.toAssigneeDto(entity, new Map());
	}

	async updateAssignee(
		id: string,
		dto: UpdateKanbanBoardAssigneeRequestDto,
	): Promise<KanbanBoardAssigneeDto> {
		const assignee = await this.assigneeRepository.findOne({ where: { id } });
		if (!assignee) throw new NotFoundException("Исполнитель не найден");

		const previousName = assignee.name;
		if (dto.code !== undefined) assignee.code = dto.code.trim();
		if (dto.name !== undefined) assignee.name = dto.name.trim();
		if (dto.email !== undefined) {
			assignee.email = dto.email?.trim() || null;
		}
		if (!assignee.code || !assignee.name) {
			throw new BadRequestException("Код и имя обязательны");
		}

		await this.assigneeRepository.save(assignee);
		if (dto.name !== undefined && assignee.name !== previousName) {
			await this.renameAssigneeInTasks(previousName, assignee.name);
		}

		const taskCounts = await this.countTasksByAssigneeName();
		return this.toAssigneeDto(assignee, taskCounts);
	}

	async deleteAssignee(id: string): Promise<void> {
		const assignee = await this.assigneeRepository.findOne({ where: { id } });
		if (!assignee) throw new NotFoundException("Исполнитель не найден");

		const taskCount = await this.countTasksWithAssigneeName(assignee.name);
		if (taskCount > 0) {
			throw new BadRequestException(
				"Нельзя удалить исполнителя, назначенного на задачи",
			);
		}

		await this.assigneeRepository.remove(assignee);
	}

	async findAllBoards(): Promise<KanbanBoardBoardDto[]> {
		const boards = await this.boardRepository.find({
			relations: { project: true },
			order: { sortOrder: "ASC", name: "ASC" },
		});
		const taskCounts = await this.taskRepository
			.createQueryBuilder("task")
			.select("task.board_id", "boardId")
			.addSelect("COUNT(*)", "count")
			.groupBy("task.board_id")
			.getRawMany<{ boardId: string; count: string }>();
		const countMap = new Map(
			taskCounts.map((row) => [row.boardId, Number(row.count)]),
		);

		return boards.map((board) => this.toBoardDto(board, countMap));
	}

	async createBoard(
		dto: CreateKanbanBoardBoardRequestDto,
	): Promise<KanbanBoardBoardDto> {
		const project = await this.projectRepository.findOne({
			where: { id: dto.projectId },
		});
		if (!project) throw new NotFoundException("Проект не найден");

		const entity = this.boardRepository.create({
			id: ulid(),
			projectId: dto.projectId,
			name: dto.name.trim(),
			slug: dto.slug.trim(),
			description: dto.description?.trim() || null,
			sortOrder: dto.sortOrder ?? 0,
		});
		entity.project = project;
		await this.boardRepository.save(entity);
		await this.seedDefaultColumns(entity.id);
		return this.toBoardDto(entity, new Map([[entity.id, 0]]));
	}

	async findBoardColumns(boardId: string): Promise<KanbanBoardColumnDto[]> {
		await this.ensureBoardExists(boardId);
		let columns = await this.columnRepository.find({
			where: { boardId },
			order: { sortOrder: "ASC", title: "ASC" },
		});
		if (!columns.length) {
			await this.seedDefaultColumns(boardId);
			columns = await this.columnRepository.find({
				where: { boardId },
				order: { sortOrder: "ASC", title: "ASC" },
			});
		}
		return columns.map((column) => this.toColumnDto(column));
	}

	async createColumn(
		boardId: string,
		dto: CreateKanbanBoardColumnRequestDto,
	): Promise<KanbanBoardColumnDto> {
		await this.ensureBoardExists(boardId);
		const title = dto.title.trim();
		if (!title) {
			throw new BadRequestException("Название колонки обязательно");
		}

		const maxSortOrder = await this.columnRepository
			.createQueryBuilder("column")
			.select("MAX(column.sort_order)", "max")
			.where("column.board_id = :boardId", { boardId })
			.getRawOne<{ max: string | null }>();
		const sortOrder = Number(maxSortOrder?.max ?? -1) + 1;
		const color = dto.color?.trim() || pickKanbanBoardColumnColor(sortOrder);

		const entity = this.columnRepository.create({
			id: ulid(),
			boardId,
			title,
			color,
			sortOrder,
		});
		await this.columnRepository.save(entity);
		return this.toColumnDto(entity);
	}

	async updateColumn(
		boardId: string,
		columnId: string,
		dto: UpdateKanbanBoardColumnRequestDto,
	): Promise<KanbanBoardColumnDto> {
		const column = await this.ensureColumnOnBoard(boardId, columnId);
		if (dto.title !== undefined) {
			const title = dto.title.trim();
			if (!title) {
				throw new BadRequestException("Название колонки обязательно");
			}
			column.title = title;
		}
		if (dto.color !== undefined) {
			const color = dto.color.trim();
			if (color) column.color = color;
		}
		await this.columnRepository.save(column);
		return this.toColumnDto(column);
	}

	async deleteColumn(boardId: string, columnId: string): Promise<void> {
		await this.ensureColumnOnBoard(boardId, columnId);
		const taskCount = await this.taskRepository.count({
			where: { boardId, parentId: columnId },
		});
		if (taskCount > 0) {
			throw new BadRequestException("Нельзя удалить колонку с задачами");
		}
		await this.columnRepository.delete({ boardId, id: columnId });
	}

	async updateBoard(
		id: string,
		dto: UpdateKanbanBoardBoardRequestDto,
	): Promise<KanbanBoardBoardDto> {
		const board = await this.boardRepository.findOne({
			where: { id },
			relations: { project: true },
		});
		if (!board) throw new NotFoundException("Доска не найдена");

		if (dto.projectId !== undefined) {
			const project = await this.projectRepository.findOne({
				where: { id: dto.projectId },
			});
			if (!project) throw new NotFoundException("Проект не найден");
			board.projectId = dto.projectId;
			board.project = project;
		}
		if (dto.name !== undefined) board.name = dto.name.trim();
		if (dto.slug !== undefined) board.slug = dto.slug.trim();
		if (dto.description !== undefined) {
			board.description = dto.description?.trim() || null;
		}
		if (dto.sortOrder !== undefined) board.sortOrder = dto.sortOrder;

		await this.boardRepository.save(board);
		const taskCount = await this.taskRepository.count({ where: { boardId: id } });
		return this.toBoardDto(board, new Map([[id, taskCount]]));
	}

	async deleteBoard(id: string): Promise<void> {
		const board = await this.boardRepository.findOne({ where: { id } });
		if (!board) throw new NotFoundException("Доска не найдена");
		await this.boardRepository.remove(board);
	}

	async findAllTasksRegistry(): Promise<KanbanBoardTaskRegistryDto[]> {
		const rows = await this.taskRepository.find({
			relations: { board: { project: true } },
			order: { updatedAt: "DESC" },
		});
		const columnTitles = await this.loadColumnTitleMap(
			rows.map((row) => row.boardId),
		);

		return rows.map((row) => this.toTaskRegistryDto(row, columnTitles));
	}

	async createTask(
		dto: CreateKanbanBoardTaskRequestDto,
	): Promise<KanbanBoardTaskRegistryDto> {
		const board = await this.boardRepository.findOne({
			where: { id: dto.boardId },
			relations: { project: true },
		});
		if (!board) throw new NotFoundException("Доска не найдена");
		await this.ensureColumnOnBoard(dto.boardId, dto.parentId);

		const position =
			dto.position ??
			(await this.taskRepository.count({
				where: { boardId: dto.boardId, parentId: dto.parentId },
			}));

		const entity = this.taskRepository.create({
			id: ulid(),
			boardId: dto.boardId,
			parentId: dto.parentId,
			position,
			content: dto.content,
			origin: this.kanbanBoardService.getStandId(),
			updatedAt: new Date().toISOString(),
		});
		entity.board = board;
		await this.taskRepository.save(entity);
		const columnTitles = await this.loadColumnTitleMap([entity.boardId]);
		return this.toTaskRegistryDto(entity, columnTitles);
	}

	async updateTask(
		id: string,
		dto: UpdateKanbanBoardTaskRequestDto,
	): Promise<KanbanBoardTaskRegistryDto> {
		const task = await this.taskRepository.findOne({
			where: { id },
			relations: { board: { project: true } },
		});
		if (!task) throw new NotFoundException("Задача не найдена");

		if (dto.boardId !== undefined) {
			const board = await this.boardRepository.findOne({
				where: { id: dto.boardId },
				relations: { project: true },
			});
			if (!board) throw new NotFoundException("Доска не найдена");
			task.boardId = dto.boardId;
			task.board = board;
		}
		const nextParentId = dto.parentId ?? task.parentId;
		await this.ensureColumnOnBoard(task.boardId, nextParentId);
		if (dto.parentId !== undefined) task.parentId = dto.parentId;
		if (dto.position !== undefined) task.position = dto.position;
		if (dto.content !== undefined) task.content = dto.content;
		task.updatedAt = new Date().toISOString();

		await this.taskRepository.save(task);
		const columnTitles = await this.loadColumnTitleMap([task.boardId]);
		return this.toTaskRegistryDto(task, columnTitles);
	}

	async deleteTask(id: string): Promise<void> {
		await this.kanbanBoardService.deleteTask(id);
	}

	private async ensureBoardExists(boardId: string): Promise<KanbanBoardEntity> {
		const board = await this.boardRepository.findOne({ where: { id: boardId } });
		if (!board) throw new NotFoundException("Доска не найдена");
		return board;
	}

	private async ensureColumnOnBoard(
		boardId: string,
		columnId: string,
	): Promise<KanbanBoardColumnEntity> {
		const column = await this.columnRepository.findOne({
			where: { id: columnId, boardId },
		});
		if (!column) {
			throw new BadRequestException("Колонка не найдена на доске");
		}
		return column;
	}

	private async seedDefaultColumns(boardId: string): Promise<void> {
		for (const [index, status] of KANBAN_BOARD_STATUSES.entries()) {
			const existing = await this.columnRepository.findOne({
				where: { id: status.id, boardId },
			});
			if (existing) continue;

			await this.columnRepository.save(
				this.columnRepository.create({
					id: status.id,
					boardId,
					title: status.title,
					color: KANBAN_BOARD_COLUMN_COLORS[status.id],
					sortOrder: index,
				}),
			);
		}
	}

	private toColumnDto(column: KanbanBoardColumnEntity): KanbanBoardColumnDto {
		return {
			id: column.id,
			boardId: column.boardId,
			title: column.title,
			color: column.color,
			sortOrder: column.sortOrder,
			createdAt: column.createdAt.toISOString(),
			updatedAt: column.updatedAt.toISOString(),
		};
	}

	private toProjectDto(
		project: KanbanBoardProjectEntity,
		countMap: Map<string, number>,
	): KanbanBoardProjectDto {
		return {
			id: project.id,
			code: project.code,
			name: project.name,
			description: project.description,
			isStock: project.isStock,
			boardCount: countMap.get(project.id) ?? 0,
			createdAt: project.createdAt.toISOString(),
			updatedAt: project.updatedAt.toISOString(),
		};
	}

	private toBoardDto(
		board: KanbanBoardEntity,
		countMap: Map<string, number>,
	): KanbanBoardBoardDto {
		return {
			id: board.id,
			projectId: board.projectId,
			projectCode: board.project?.code ?? "",
			projectName: board.project?.name ?? "",
			name: board.name,
			slug: board.slug,
			description: board.description,
			sortOrder: board.sortOrder,
			taskCount: countMap.get(board.id) ?? 0,
			createdAt: board.createdAt.toISOString(),
			updatedAt: board.updatedAt.toISOString(),
		};
	}

	private toTaskRegistryDto(
		task: KanbanBoardTaskEntity,
		columnTitles: Map<string, string> = new Map(),
	): KanbanBoardTaskRegistryDto {
		return {
			id: task.id,
			boardId: task.boardId,
			parentId: task.parentId,
			position: task.position,
			content: task.content,
			origin: task.origin,
			updatedAt: task.updatedAt,
			projectCode: task.board?.project?.code ?? "",
			projectName: task.board?.project?.name ?? "",
			boardSlug: task.board?.slug ?? "",
			boardName: task.board?.name ?? "",
			title: task.content.title,
			statusTitle:
				columnTitles.get(`${task.boardId}:${task.parentId}`) ?? task.parentId,
		};
	}

	private async loadColumnTitleMap(
		boardIds: string[],
	): Promise<Map<string, string>> {
		const uniqueBoardIds = [...new Set(boardIds)];
		if (!uniqueBoardIds.length) return new Map();

		const columns = await this.columnRepository
			.createQueryBuilder("column")
			.where("column.board_id IN (:...boardIds)", { boardIds: uniqueBoardIds })
			.getMany();
		const titleByBoardColumn = new Map<string, string>();
		for (const column of columns) {
			titleByBoardColumn.set(`${column.boardId}:${column.id}`, column.title);
		}
		return titleByBoardColumn;
	}

	private toAssigneeDto(
		assignee: KanbanBoardAssigneeEntity,
		taskCounts: Map<string, number>,
	): KanbanBoardAssigneeDto {
		return {
			id: assignee.id,
			code: assignee.code,
			name: assignee.name,
			email: assignee.email,
			taskCount: taskCounts.get(assignee.name) ?? 0,
			createdAt: assignee.createdAt.toISOString(),
			updatedAt: assignee.updatedAt.toISOString(),
		};
	}

	private async countTasksByAssigneeName(): Promise<Map<string, number>> {
		const rows = await this.taskRepository
			.createQueryBuilder("task")
			.select("task.content->>'assignee'", "assigneeName")
			.addSelect("COUNT(*)", "count")
			.where("task.content->>'assignee' IS NOT NULL")
			.andWhere("task.content->>'assignee' <> ''")
			.groupBy("task.content->>'assignee'")
			.getRawMany<{ assigneeName: string; count: string }>();

		return new Map(rows.map((row) => [row.assigneeName, Number(row.count)]));
	}

	private async countTasksWithAssigneeName(name: string): Promise<number> {
		return this.taskRepository
			.createQueryBuilder("task")
			.where("task.content->>'assignee' = :name", { name })
			.getCount();
	}

	private async renameAssigneeInTasks(
		oldName: string,
		newName: string,
	): Promise<void> {
		const tasks = await this.taskRepository
			.createQueryBuilder("task")
			.where("task.content->>'assignee' = :oldName", { oldName })
			.getMany();

		for (const task of tasks) {
			task.content = { ...task.content, assignee: newName };
			await this.taskRepository.save(task);
		}
	}
}
