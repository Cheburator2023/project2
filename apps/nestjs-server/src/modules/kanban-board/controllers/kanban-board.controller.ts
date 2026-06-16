import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	HttpStatus,
	Param,
	Post,
	Put,
	Res,
	UploadedFile,
	UseInterceptors,
} from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiBody,
	ApiConsumes,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import type {
	CreateKanbanBoardBoardRequestDto,
	CreateKanbanBoardProjectRequestDto,
	CreateKanbanBoardTaskRequestDto,
	KanbanBoardBoardDto,
	KanbanBoardProjectDto,
	KanbanBoardTaskRecord,
	KanbanBoardTaskRegistryDto,
	UpdateKanbanBoardBoardRequestDto,
	UpdateKanbanBoardProjectRequestDto,
	UpdateKanbanBoardTaskRequestDto,
} from "@smart-anketa/api-contract";
import type { Response } from "express";
import { KanbanBoardRegistryService } from "../services/kanban-board-registry.service";
import {
	KanbanBoardService,
	SnapshotIntegrityError,
	SnapshotSchemaError,
} from "../services/kanban-board.service";

@ApiBearerAuth("JWT-auth")
@ApiTags("KanbanBoard")
@Controller("kanban-board")
export class KanbanBoardController {
	constructor(
		private readonly kanbanBoardService: KanbanBoardService,
		private readonly registryService: KanbanBoardRegistryService,
	) {}

	@Get("config")
	getConfig() {
		return { standId: this.kanbanBoardService.getStandId() };
	}

	@Get("projects")
	async findAllProjects(): Promise<KanbanBoardProjectDto[]> {
		return this.registryService.findAllProjects();
	}

	@Post("projects")
	async createProject(
		@Body() dto: CreateKanbanBoardProjectRequestDto,
	): Promise<KanbanBoardProjectDto> {
		return this.registryService.createProject(dto);
	}

	@Put("projects/:id")
	async updateProject(
		@Param("id") id: string,
		@Body() dto: UpdateKanbanBoardProjectRequestDto,
	): Promise<KanbanBoardProjectDto> {
		return this.registryService.updateProject(id, dto);
	}

	@Delete("projects/:id")
	async deleteProject(@Param("id") id: string): Promise<void> {
		return this.registryService.deleteProject(id);
	}

	@Get("boards")
	async findAllBoards(): Promise<KanbanBoardBoardDto[]> {
		return this.registryService.findAllBoards();
	}

	@Post("boards")
	async createBoard(
		@Body() dto: CreateKanbanBoardBoardRequestDto,
	): Promise<KanbanBoardBoardDto> {
		return this.registryService.createBoard(dto);
	}

	@Put("boards/:id")
	async updateBoard(
		@Param("id") id: string,
		@Body() dto: UpdateKanbanBoardBoardRequestDto,
	): Promise<KanbanBoardBoardDto> {
		return this.registryService.updateBoard(id, dto);
	}

	@Delete("boards/:id")
	async deleteBoard(@Param("id") id: string): Promise<void> {
		return this.registryService.deleteBoard(id);
	}

	@Get("tasks/registry")
	async findTasksRegistry(): Promise<KanbanBoardTaskRegistryDto[]> {
		return this.registryService.findAllTasksRegistry();
	}

	@Post("tasks")
	async createTask(
		@Body() dto: CreateKanbanBoardTaskRequestDto,
	): Promise<KanbanBoardTaskRegistryDto> {
		return this.registryService.createTask(dto);
	}

	@Put("tasks/:id")
	async updateTask(
		@Param("id") id: string,
		@Body() dto: UpdateKanbanBoardTaskRequestDto,
	): Promise<KanbanBoardTaskRegistryDto> {
		return this.registryService.updateTask(id, dto);
	}

	@Delete("tasks/:id")
	async deleteTask(@Param("id") id: string): Promise<void> {
		return this.registryService.deleteTask(id);
	}

	@Get("boards/:boardId/tasks")
	async findBoardTasks(
		@Param("boardId") boardId: string,
	): Promise<KanbanBoardTaskRecord[]> {
		return this.kanbanBoardService.findByBoard(boardId);
	}

	@Put("boards/:boardId/tasks")
	async saveBoardTasks(
		@Param("boardId") boardId: string,
		@Body() tasks: KanbanBoardTaskRecord[],
	): Promise<KanbanBoardTaskRecord[]> {
		if (!Array.isArray(tasks)) {
			throw new BadRequestException("Ожидается массив задач");
		}
		return this.kanbanBoardService.saveBoardTasks(boardId, tasks);
	}

	@Get("tasks")
	async findAllTasks(): Promise<KanbanBoardTaskRecord[]> {
		return this.kanbanBoardService.findAll();
	}

	@Put("tasks")
	async saveLocalTasks(
		@Body() tasks: KanbanBoardTaskRecord[],
	): Promise<KanbanBoardTaskRecord[]> {
		if (!Array.isArray(tasks)) {
			throw new BadRequestException("Ожидается массив задач");
		}
		return this.kanbanBoardService.saveLocalTasks(tasks);
	}

	@Get("boards/:boardId/export")
	@ApiResponse({
		status: HttpStatus.OK,
		content: {
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
				schema: { type: "string", format: "binary" },
			},
		},
	})
	async exportBoardSnapshot(
		@Param("boardId") boardId: string,
		@Res() res: Response,
	): Promise<void> {
		const buffer = await this.kanbanBoardService.exportBoardSnapshot(boardId);
		const date = new Date().toISOString().slice(0, 10);
		const standId = this.kanbanBoardService.getStandId();
		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		);
		res.setHeader(
			"Content-Disposition",
			`attachment; filename=kanban-board-${boardId}-${standId}-${date}.xlsx`,
		);
		res.end(buffer);
	}

	@Post("boards/:boardId/import")
	@UseInterceptors(FileInterceptor("file"))
	@ApiConsumes("multipart/form-data")
	async importBoardSnapshot(
		@Param("boardId") boardId: string,
		@UploadedFile() file?: { buffer: Buffer },
	) {
		if (!file?.buffer?.length) {
			throw new BadRequestException("Файл не передан");
		}
		try {
			return await this.kanbanBoardService.importBoardSnapshot(
				boardId,
				file.buffer,
			);
		} catch (error) {
			this.rethrowImportError(error);
		}
	}

	@Get("export")
	@ApiResponse({
		status: HttpStatus.OK,
		content: {
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
				schema: { type: "string", format: "binary" },
			},
		},
	})
	async exportSnapshot(@Res() res: Response): Promise<void> {
		const buffer = await this.kanbanBoardService.exportSnapshot();
		const date = new Date().toISOString().slice(0, 10);
		const standId = this.kanbanBoardService.getStandId();
		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		);
		res.setHeader(
			"Content-Disposition",
			`attachment; filename=kanban-board-${standId}-${date}.xlsx`,
		);
		res.end(buffer);
	}

	@Post("import")
	@UseInterceptors(FileInterceptor("file"))
	@ApiConsumes("multipart/form-data")
	@ApiBody({
		schema: {
			type: "object",
			properties: { file: { type: "string", format: "binary" } },
		},
	})
	async importSnapshot(@UploadedFile() file?: { buffer: Buffer }) {
		if (!file?.buffer?.length) {
			throw new BadRequestException("Файл не передан");
		}
		try {
			return await this.kanbanBoardService.importSnapshot(file.buffer);
		} catch (error) {
			this.rethrowImportError(error);
		}
	}

	private rethrowImportError(error: unknown): never {
		if (error instanceof SnapshotIntegrityError) {
			throw new BadRequestException({
				message: "Integrity check failed",
				expectedSha256: error.expectedSha256,
				actualSha256: error.actualSha256,
			});
		}
		if (error instanceof SnapshotSchemaError) {
			throw new BadRequestException(error.message);
		}
		if (error instanceof Error) {
			throw new BadRequestException(error.message);
		}
		throw error;
	}
}
