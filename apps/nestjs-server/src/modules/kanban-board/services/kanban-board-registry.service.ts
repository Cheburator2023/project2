import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ulid } from "ulid";
import {
	KANBAN_BOARD_STATUSES,
	type CreateKanbanBoardBoardRequestDto,
	type CreateKanbanBoardProjectRequestDto,
	type CreateKanbanBoardTaskRequestDto,
	type KanbanBoardBoardDto,
	type KanbanBoardProjectDto,
	type KanbanBoardTaskRegistryDto,
	type UpdateKanbanBoardBoardRequestDto,
	type UpdateKanbanBoardProjectRequestDto,
	type UpdateKanbanBoardTaskRequestDto,
} from "@smart-anketa/api-contract";
import { KanbanBoardEntity } from "../entities/kanban-board.entity";
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
		return this.toBoardDto(entity, new Map([[entity.id, 0]]));
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

		return rows.map((row) => this.toTaskRegistryDto(row));
	}

	async createTask(
		dto: CreateKanbanBoardTaskRequestDto,
	): Promise<KanbanBoardTaskRegistryDto> {
		const board = await this.boardRepository.findOne({
			where: { id: dto.boardId },
			relations: { project: true },
		});
		if (!board) throw new NotFoundException("Доска не найдена");

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
		return this.toTaskRegistryDto(entity);
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
		if (dto.parentId !== undefined) task.parentId = dto.parentId;
		if (dto.position !== undefined) task.position = dto.position;
		if (dto.content !== undefined) task.content = dto.content;
		task.updatedAt = new Date().toISOString();

		await this.taskRepository.save(task);
		return this.toTaskRegistryDto(task);
	}

	async deleteTask(id: string): Promise<void> {
		await this.kanbanBoardService.deleteTask(id);
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
	): KanbanBoardTaskRegistryDto {
		const status = KANBAN_BOARD_STATUSES.find((item) => item.id === task.parentId);
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
			statusTitle: status?.title ?? task.parentId,
		};
	}
}
