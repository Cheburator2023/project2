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
	kanbanBoardTaskTypeTitle,
	kanbanBoardWorkTypeTitle,
	pickKanbanBoardColumnColor,
	type CreateKanbanBoardAssigneeRequestDto,
	type CreateKanbanBoardBoardRequestDto,
	type CreateKanbanBoardColumnRequestDto,
	type CreateKanbanBoardProjectRequestDto,
	type CreateKanbanBoardSprintRequestDto,
	type CreateKanbanBoardStreamRequestDto,
	type CreateKanbanBoardSupersprintRequestDto,
	type CreateKanbanBoardTaskRequestDto,
	type KanbanBoardAssigneeDto,
	type KanbanBoardBoardDto,
	type KanbanBoardColumnDto,
	type KanbanBoardProjectDto,
	type KanbanBoardSprintDto,
	type KanbanBoardStreamDto,
	type KanbanBoardSupersprintDto,
	type KanbanBoardTaskContent,
	type KanbanBoardTaskRegistryDto,
	type UpdateKanbanBoardAssigneeRequestDto,
	type UpdateKanbanBoardBoardRequestDto,
	type UpdateKanbanBoardColumnRequestDto,
	type UpdateKanbanBoardProjectRequestDto,
	type UpdateKanbanBoardSprintRequestDto,
	type UpdateKanbanBoardStreamRequestDto,
	type UpdateKanbanBoardSupersprintRequestDto,
	type UpdateKanbanBoardTaskRequestDto,
} from "@smart-anketa/api-contract";
import { KanbanBoardEntity } from "../entities/kanban-board.entity";
import { KanbanBoardAssigneeEntity } from "../entities/kanban-board-assignee.entity";
import { KanbanBoardColumnEntity } from "../entities/kanban-board-column.entity";
import { KanbanBoardProjectEntity } from "../entities/kanban-board-project.entity";
import { KanbanBoardSprintEntity } from "../entities/kanban-board-sprint.entity";
import { KanbanBoardStreamEntity } from "../entities/kanban-board-stream.entity";
import { KanbanBoardSupersprintEntity } from "../entities/kanban-board-supersprint.entity";
import { KanbanBoardTaskEntity } from "../entities/kanban-board-task.entity";
import { KanbanBoardService } from "./kanban-board.service";
import {
	exportTasksRegistryWorkbook,
	exportTasksRegistryXlsx,
} from "../utils/kanban-board-registry-export.util";

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
		@InjectRepository(KanbanBoardSupersprintEntity)
		private readonly supersprintRepository: Repository<KanbanBoardSupersprintEntity>,
		@InjectRepository(KanbanBoardSprintEntity)
		private readonly sprintRepository: Repository<KanbanBoardSprintEntity>,
		@InjectRepository(KanbanBoardStreamEntity)
		private readonly streamRepository: Repository<KanbanBoardStreamEntity>,
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

	async findAllSupersprints(): Promise<KanbanBoardSupersprintDto[]> {
		const supersprints = await this.supersprintRepository.find({
			order: { startDate: "DESC", name: "ASC" },
		});
		const sprintCounts = await this.sprintRepository
			.createQueryBuilder("sprint")
			.select("sprint.supersprint_id", "supersprintId")
			.addSelect("COUNT(*)", "count")
			.where("sprint.supersprint_id IS NOT NULL")
			.groupBy("sprint.supersprint_id")
			.getRawMany<{ supersprintId: string; count: string }>();
		const countMap = new Map(
			sprintCounts.map((row) => [row.supersprintId, Number(row.count)]),
		);

		return supersprints.map((item) => this.toSupersprintDto(item, countMap));
	}

	async createSupersprint(
		dto: CreateKanbanBoardSupersprintRequestDto,
	): Promise<KanbanBoardSupersprintDto> {
		const code = dto.code.trim();
		const name = dto.name.trim();
		const startDate = dto.startDate.trim();
		if (!code || !name || !startDate) {
			throw new BadRequestException("Код, название и дата начала обязательны");
		}

		const entity = this.supersprintRepository.create({
			id: ulid(),
			code,
			name,
			description: dto.description?.trim() || null,
			startDate,
			endDate: dto.endDate?.trim() || null,
		});
		await this.supersprintRepository.save(entity);
		return this.toSupersprintDto(entity, new Map());
	}

	async updateSupersprint(
		id: string,
		dto: UpdateKanbanBoardSupersprintRequestDto,
	): Promise<KanbanBoardSupersprintDto> {
		const supersprint = await this.supersprintRepository.findOne({ where: { id } });
		if (!supersprint) throw new NotFoundException("Суперспринт не найден");

		if (dto.code !== undefined) supersprint.code = dto.code.trim();
		if (dto.name !== undefined) supersprint.name = dto.name.trim();
		if (dto.description !== undefined) {
			supersprint.description = dto.description?.trim() || null;
		}
		if (dto.startDate !== undefined) supersprint.startDate = dto.startDate.trim();
		if (dto.endDate !== undefined) {
			supersprint.endDate = dto.endDate?.trim() || null;
		}
		if (!supersprint.code || !supersprint.name || !supersprint.startDate) {
			throw new BadRequestException("Код, название и дата начала обязательны");
		}

		await this.supersprintRepository.save(supersprint);
		const sprintCount = await this.sprintRepository.count({
			where: { supersprintId: supersprint.id },
		});
		return this.toSupersprintDto(
			supersprint,
			new Map([[supersprint.id, sprintCount]]),
		);
	}

	async deleteSupersprint(id: string): Promise<void> {
		const supersprint = await this.supersprintRepository.findOne({ where: { id } });
		if (!supersprint) throw new NotFoundException("Суперспринт не найден");

		const sprintCount = await this.sprintRepository.count({
			where: { supersprintId: id },
		});
		if (sprintCount > 0) {
			throw new BadRequestException(
				"Нельзя удалить суперспринт со связанными спринтами",
			);
		}

		await this.supersprintRepository.remove(supersprint);
	}

	async findAllSprints(): Promise<KanbanBoardSprintDto[]> {
		const sprints = await this.sprintRepository.find({
			relations: { supersprint: true },
			order: { startDate: "DESC", name: "ASC" },
		});
		const taskCounts = await this.countTasksBySprintId();
		return sprints.map((sprint) => this.toSprintDto(sprint, taskCounts));
	}

	async createSprint(
		dto: CreateKanbanBoardSprintRequestDto,
	): Promise<KanbanBoardSprintDto> {
		const code = dto.code.trim();
		const name = dto.name.trim();
		const startDate = dto.startDate.trim();
		if (!code || !name || !startDate) {
			throw new BadRequestException("Код, название и дата начала обязательны");
		}

		let supersprint: KanbanBoardSupersprintEntity | null = null;
		if (dto.supersprintId) {
			supersprint = await this.supersprintRepository.findOne({
				where: { id: dto.supersprintId },
			});
			if (!supersprint) throw new NotFoundException("Суперспринт не найден");
		}

		const entity = this.sprintRepository.create({
			id: ulid(),
			supersprintId: supersprint?.id ?? null,
			code,
			name,
			description: dto.description?.trim() || null,
			startDate,
			endDate: dto.endDate?.trim() || null,
		});
		entity.supersprint = supersprint;
		await this.sprintRepository.save(entity);
		return this.toSprintDto(entity, new Map());
	}

	async updateSprint(
		id: string,
		dto: UpdateKanbanBoardSprintRequestDto,
	): Promise<KanbanBoardSprintDto> {
		const sprint = await this.sprintRepository.findOne({
			where: { id },
			relations: { supersprint: true },
		});
		if (!sprint) throw new NotFoundException("Спринт не найден");

		if (dto.supersprintId !== undefined) {
			if (dto.supersprintId) {
				const supersprint = await this.supersprintRepository.findOne({
					where: { id: dto.supersprintId },
				});
				if (!supersprint) throw new NotFoundException("Суперспринт не найден");
				sprint.supersprintId = supersprint.id;
				sprint.supersprint = supersprint;
			} else {
				sprint.supersprintId = null;
				sprint.supersprint = null;
			}
		}
		if (dto.code !== undefined) sprint.code = dto.code.trim();
		if (dto.name !== undefined) sprint.name = dto.name.trim();
		if (dto.description !== undefined) {
			sprint.description = dto.description?.trim() || null;
		}
		if (dto.startDate !== undefined) sprint.startDate = dto.startDate.trim();
		if (dto.endDate !== undefined) sprint.endDate = dto.endDate?.trim() || null;
		if (!sprint.code || !sprint.name || !sprint.startDate) {
			throw new BadRequestException("Код, название и дата начала обязательны");
		}

		await this.sprintRepository.save(sprint);
		const taskCounts = await this.countTasksBySprintId();
		return this.toSprintDto(sprint, taskCounts);
	}

	async deleteSprint(id: string): Promise<void> {
		const sprint = await this.sprintRepository.findOne({ where: { id } });
		if (!sprint) throw new NotFoundException("Спринт не найден");

		const taskCount = await this.countTasksWithSprintId(id);
		if (taskCount > 0) {
			throw new BadRequestException("Нельзя удалить спринт с задачами");
		}

		await this.sprintRepository.remove(sprint);
	}

	async findAllStreams(): Promise<KanbanBoardStreamDto[]> {
		const streams = await this.streamRepository.find({
			order: { name: "ASC" },
		});
		const taskCounts = await this.countTasksByStreamName();
		return streams.map((stream) => this.toStreamDto(stream, taskCounts));
	}

	async createStream(
		dto: CreateKanbanBoardStreamRequestDto,
	): Promise<KanbanBoardStreamDto> {
		const code = dto.code.trim();
		const name = dto.name.trim();
		if (!code || !name) {
			throw new BadRequestException("Код и название обязательны");
		}

		const entity = this.streamRepository.create({
			id: ulid(),
			code,
			name,
			description: dto.description?.trim() || null,
		});
		await this.streamRepository.save(entity);
		return this.toStreamDto(entity, new Map());
	}

	async updateStream(
		id: string,
		dto: UpdateKanbanBoardStreamRequestDto,
	): Promise<KanbanBoardStreamDto> {
		const stream = await this.streamRepository.findOne({ where: { id } });
		if (!stream) throw new NotFoundException("Стрим не найден");

		const previousName = stream.name;
		if (dto.code !== undefined) stream.code = dto.code.trim();
		if (dto.name !== undefined) stream.name = dto.name.trim();
		if (dto.description !== undefined) {
			stream.description = dto.description?.trim() || null;
		}
		if (!stream.code || !stream.name) {
			throw new BadRequestException("Код и название обязательны");
		}

		await this.streamRepository.save(stream);
		if (dto.name !== undefined && stream.name !== previousName) {
			await this.renameStreamInTasks(previousName, stream.name);
		}

		const taskCounts = await this.countTasksByStreamName();
		return this.toStreamDto(stream, taskCounts);
	}

	async deleteStream(id: string): Promise<void> {
		const stream = await this.streamRepository.findOne({ where: { id } });
		if (!stream) throw new NotFoundException("Стрим не найден");

		const taskCount = await this.countTasksWithStreamName(stream.name);
		if (taskCount > 0) {
			throw new BadRequestException("Нельзя удалить стрим, указанный в задачах");
		}

		await this.streamRepository.remove(stream);
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
		const sprintTitles = await this.loadSprintTitleMap(
			rows
				.map((row) => row.content.sprintId)
				.filter((value): value is string => Boolean(value)),
		);

		return rows.map((row) => this.toTaskRegistryDto(row, columnTitles, sprintTitles));
	}

	async exportTasksRegistryXlsx(): Promise<Buffer> {
		const tasks = await this.findAllTasksRegistry();
		return exportTasksRegistryXlsx(tasks);
	}

	async exportSprintsRegistryXlsx(): Promise<Buffer> {
		const [sprints, tasks] = await Promise.all([
			this.findAllSprints(),
			this.findAllTasksRegistry(),
		]);
		const tasksBySprintId = new Map<string, KanbanBoardTaskRegistryDto[]>();
		for (const task of tasks) {
			const sprintId = task.content.sprintId;
			if (!sprintId) continue;
			const bucket = tasksBySprintId.get(sprintId) ?? [];
			bucket.push(task);
			tasksBySprintId.set(sprintId, bucket);
		}

		const sheets = sprints.map((sprint) => ({
			name: `${sprint.code} — ${sprint.name}`,
			tasks: tasksBySprintId.get(sprint.id) ?? [],
		}));

		return exportTasksRegistryWorkbook(sheets);
	}

	async exportSupersprintsRegistryXlsx(): Promise<Buffer> {
		const [supersprints, sprints, tasks] = await Promise.all([
			this.findAllSupersprints(),
			this.findAllSprints(),
			this.findAllTasksRegistry(),
		]);

		const sprintIdsBySupersprintId = new Map<string, string[]>();
		for (const sprint of sprints) {
			if (!sprint.supersprintId) continue;
			const bucket = sprintIdsBySupersprintId.get(sprint.supersprintId) ?? [];
			bucket.push(sprint.id);
			sprintIdsBySupersprintId.set(sprint.supersprintId, bucket);
		}

		const tasksBySprintId = new Map<string, KanbanBoardTaskRegistryDto[]>();
		for (const task of tasks) {
			const sprintId = task.content.sprintId;
			if (!sprintId) continue;
			const bucket = tasksBySprintId.get(sprintId) ?? [];
			bucket.push(task);
			tasksBySprintId.set(sprintId, bucket);
		}

		const sheets = supersprints.map((supersprint) => {
			const sprintIds = sprintIdsBySupersprintId.get(supersprint.id) ?? [];
			const supersprintTasks = sprintIds.flatMap(
				(sprintId) => tasksBySprintId.get(sprintId) ?? [],
			);
			return {
				name: `${supersprint.code} — ${supersprint.name}`,
				tasks: supersprintTasks,
			};
		});

		return exportTasksRegistryWorkbook(sheets);
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

		const content = await this.validateTaskContent(dto.content);

		const entity = this.taskRepository.create({
			id: ulid(),
			boardId: dto.boardId,
			parentId: dto.parentId,
			position,
			content,
			origin: this.kanbanBoardService.getStandId(),
			updatedAt: new Date().toISOString(),
		});
		entity.board = board;
		await this.taskRepository.save(entity);
		const columnTitles = await this.loadColumnTitleMap([entity.boardId]);
		const sprintTitles = await this.loadSprintTitleMap(
			content.sprintId ? [content.sprintId] : [],
		);
		return this.toTaskRegistryDto(entity, columnTitles, sprintTitles);
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
		if (dto.content !== undefined) {
			task.content = await this.validateTaskContent(dto.content);
		}
		task.updatedAt = new Date().toISOString();

		await this.taskRepository.save(task);
		const columnTitles = await this.loadColumnTitleMap([task.boardId]);
		const sprintTitles = await this.loadSprintTitleMap(
			task.content.sprintId ? [task.content.sprintId] : [],
		);
		return this.toTaskRegistryDto(task, columnTitles, sprintTitles);
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
		sprintTitles: Map<string, string> = new Map(),
	): KanbanBoardTaskRegistryDto {
		const { content } = task;
		return {
			id: task.id,
			boardId: task.boardId,
			parentId: task.parentId,
			position: task.position,
			content,
			origin: task.origin,
			updatedAt: task.updatedAt,
			projectCode: task.board?.project?.code ?? "",
			projectName: task.board?.project?.name ?? "",
			boardSlug: task.board?.slug ?? "",
			boardName: task.board?.name ?? "",
			title: content.title,
			statusTitle:
				columnTitles.get(`${task.boardId}:${task.parentId}`) ?? task.parentId,
			taskTypeTitle: kanbanBoardTaskTypeTitle(content.taskType),
			workTypeTitle: kanbanBoardWorkTypeTitle(content.workType),
			estimatePd: content.estimatePd,
			dueDate: content.dueDate,
			parentTask: content.parentTask,
			sprintTitle: content.sprintId
				? sprintTitles.get(content.sprintId) ?? content.sprintId
				: undefined,
			streamCustomer: content.streamCustomer,
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

	private toSupersprintDto(
		supersprint: KanbanBoardSupersprintEntity,
		countMap: Map<string, number>,
	): KanbanBoardSupersprintDto {
		return {
			id: supersprint.id,
			code: supersprint.code,
			name: supersprint.name,
			description: supersprint.description,
			startDate: supersprint.startDate,
			endDate: supersprint.endDate,
			sprintCount: countMap.get(supersprint.id) ?? 0,
			createdAt: supersprint.createdAt.toISOString(),
			updatedAt: supersprint.updatedAt.toISOString(),
		};
	}

	private toSprintDto(
		sprint: KanbanBoardSprintEntity,
		taskCounts: Map<string, number>,
	): KanbanBoardSprintDto {
		return {
			id: sprint.id,
			supersprintId: sprint.supersprintId,
			supersprintCode: sprint.supersprint?.code ?? "",
			supersprintName: sprint.supersprint?.name ?? "",
			code: sprint.code,
			name: sprint.name,
			description: sprint.description,
			startDate: sprint.startDate,
			endDate: sprint.endDate,
			taskCount: taskCounts.get(sprint.id) ?? 0,
			createdAt: sprint.createdAt.toISOString(),
			updatedAt: sprint.updatedAt.toISOString(),
		};
	}

	private toStreamDto(
		stream: KanbanBoardStreamEntity,
		taskCounts: Map<string, number>,
	): KanbanBoardStreamDto {
		return {
			id: stream.id,
			code: stream.code,
			name: stream.name,
			description: stream.description,
			taskCount: taskCounts.get(stream.name) ?? 0,
			createdAt: stream.createdAt.toISOString(),
			updatedAt: stream.updatedAt.toISOString(),
		};
	}

	private async validateTaskContent(
		content: KanbanBoardTaskContent,
	): Promise<KanbanBoardTaskContent> {
		if (content.sprintId) {
			const sprint = await this.sprintRepository.findOne({
				where: { id: content.sprintId },
			});
			if (!sprint) {
				throw new BadRequestException("Спринт не найден");
			}
		}
		return content;
	}

	private async loadSprintTitleMap(sprintIds: string[]): Promise<Map<string, string>> {
		const uniqueIds = [...new Set(sprintIds)];
		if (!uniqueIds.length) return new Map();

		const sprints = await this.sprintRepository
			.createQueryBuilder("sprint")
			.where("sprint.id IN (:...sprintIds)", { sprintIds: uniqueIds })
			.getMany();
		return new Map(sprints.map((sprint) => [sprint.id, sprint.name]));
	}

	private async countTasksBySprintId(): Promise<Map<string, number>> {
		const rows = await this.taskRepository
			.createQueryBuilder("task")
			.select("task.content->>'sprintId'", "sprintId")
			.addSelect("COUNT(*)", "count")
			.where("task.content->>'sprintId' IS NOT NULL")
			.andWhere("task.content->>'sprintId' <> ''")
			.groupBy("task.content->>'sprintId'")
			.getRawMany<{ sprintId: string; count: string }>();

		return new Map(rows.map((row) => [row.sprintId, Number(row.count)]));
	}

	private async countTasksWithSprintId(sprintId: string): Promise<number> {
		return this.taskRepository
			.createQueryBuilder("task")
			.where("task.content->>'sprintId' = :sprintId", { sprintId })
			.getCount();
	}

	private async countTasksByStreamName(): Promise<Map<string, number>> {
		const rows = await this.taskRepository
			.createQueryBuilder("task")
			.select("task.content->>'streamCustomer'", "streamName")
			.addSelect("COUNT(*)", "count")
			.where("task.content->>'streamCustomer' IS NOT NULL")
			.andWhere("task.content->>'streamCustomer' <> ''")
			.groupBy("task.content->>'streamCustomer'")
			.getRawMany<{ streamName: string; count: string }>();

		return new Map(rows.map((row) => [row.streamName, Number(row.count)]));
	}

	private async countTasksWithStreamName(name: string): Promise<number> {
		return this.taskRepository
			.createQueryBuilder("task")
			.where("task.content->>'streamCustomer' = :name", { name })
			.getCount();
	}

	private async renameStreamInTasks(
		oldName: string,
		newName: string,
	): Promise<void> {
		const tasks = await this.taskRepository
			.createQueryBuilder("task")
			.where("task.content->>'streamCustomer' = :oldName", { oldName })
			.getMany();

		for (const task of tasks) {
			task.content = { ...task.content, streamCustomer: newName };
			await this.taskRepository.save(task);
		}
	}
}
