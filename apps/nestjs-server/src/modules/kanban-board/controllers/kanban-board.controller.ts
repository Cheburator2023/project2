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
	Query,
	Res,
	UploadedFile,
	UploadedFiles,
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
import { FileInterceptor, FileFieldsInterceptor } from "@nestjs/platform-express";
import type {
	AssignKanbanBoardTasksToBoardRequestDto,
	AssignKanbanBoardTasksToBoardResultDto,
	CreateKanbanBoardCustomerRequestDto,
	CreateKanbanBoardAssigneeRequestDto,
	CreateKanbanBoardBoardRequestDto,
	CreateKanbanBoardColumnRequestDto,
	CreateKanbanBoardProjectRequestDto,
	CreateKanbanBoardSprintRequestDto,
	CreateKanbanBoardStreamRequestDto,
	CreateKanbanBoardSupersprintRequestDto,
	CreateKanbanBoardTaskRequestDto,
	KanbanBoardCustomerDto,
	KanbanBoardAssigneeDto,
	KanbanBoardBoardDto,
	KanbanBoardColumnDto,
	KanbanBoardProjectDto,
	KanbanBoardPlanningImportResultDto,
	KanbanBoardSprintDto,
	KanbanBoardSettingsDto,
	KanbanBoardStreamDto,
	KanbanBoardSupersprintDto,
	KanbanBoardTaskRecord,
	KanbanBoardTaskRegistryDto,
	KanbanBoardTaskImageDto,
	KanbanBoardHistoryDto,
	KanbanBoardHistoryOverviewDto,
	UpdateKanbanBoardCustomerRequestDto,
	UpdateKanbanBoardAssigneeRequestDto,
	UpdateKanbanBoardBoardRequestDto,
	UpdateKanbanBoardColumnRequestDto,
	UpdateKanbanBoardProjectRequestDto,
	UpdateKanbanBoardSettingsRequestDto,
	UpdateKanbanBoardSprintRequestDto,
	UpdateKanbanBoardStreamRequestDto,
	UpdateKanbanBoardSupersprintRequestDto,
	UpdateKanbanBoardTaskRequestDto,
} from "@smart-anketa/api-contract";
import type { Response } from "express";
import { KanbanBoardRegistryService } from "../services/kanban-board-registry.service";
import { KanbanBoardTaskImageService } from "../services/kanban-board-task-image.service";
import {
	KanbanBoardService,
	PlanningImportNotSupportedError,
	SnapshotIntegrityError,
	SnapshotSchemaError,
} from "../services/kanban-board.service";
import { KanbanBoardHistoryService } from "../services/kanban-board-history.service";
import { CurrentUser } from "../../../shared/decorators/user.decorator";

const kanbanAuditUserId = (
	user: Record<string, unknown> | undefined,
): string | null => {
	if (!user) return null;
	const id = user.id ?? user.sub ?? user.preferred_username ?? user.login;
	return typeof id === "string" && id.trim() ? id.trim() : null;
};

@ApiBearerAuth("JWT-auth")
@ApiTags("KanbanBoard")
@Controller("kanban-board")
export class KanbanBoardController {
	constructor(
		private readonly kanbanBoardService: KanbanBoardService,
		private readonly registryService: KanbanBoardRegistryService,
		private readonly taskImageService: KanbanBoardTaskImageService,
		private readonly historyService: KanbanBoardHistoryService,
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

	@Get("assignees")
	async findAllAssignees(): Promise<KanbanBoardAssigneeDto[]> {
		return this.registryService.findAllAssignees();
	}

	@Post("assignees")
	async createAssignee(
		@Body() dto: CreateKanbanBoardAssigneeRequestDto,
	): Promise<KanbanBoardAssigneeDto> {
		return this.registryService.createAssignee(dto);
	}

	@Put("assignees/:id")
	async updateAssignee(
		@Param("id") id: string,
		@Body() dto: UpdateKanbanBoardAssigneeRequestDto,
	): Promise<KanbanBoardAssigneeDto> {
		return this.registryService.updateAssignee(id, dto);
	}

	@Delete("assignees/:id")
	async deleteAssignee(@Param("id") id: string): Promise<void> {
		return this.registryService.deleteAssignee(id);
	}

	@Get("settings")
	async getSettings(): Promise<KanbanBoardSettingsDto> {
		return this.registryService.getSettings();
	}

	@Put("settings")
	async updateSettings(
		@Body() dto: UpdateKanbanBoardSettingsRequestDto,
	): Promise<KanbanBoardSettingsDto> {
		return this.registryService.updateSettings(dto);
	}

	@Get("supersprints")
	async findAllSupersprints(): Promise<KanbanBoardSupersprintDto[]> {
		return this.registryService.findAllSupersprints();
	}

	@Post("supersprints")
	async createSupersprint(
		@Body() dto: CreateKanbanBoardSupersprintRequestDto,
	): Promise<KanbanBoardSupersprintDto> {
		return this.registryService.createSupersprint(dto);
	}

	@Put("supersprints/:id")
	async updateSupersprint(
		@Param("id") id: string,
		@Body() dto: UpdateKanbanBoardSupersprintRequestDto,
	): Promise<KanbanBoardSupersprintDto> {
		return this.registryService.updateSupersprint(id, dto);
	}

	@Delete("supersprints/:id")
	async deleteSupersprint(@Param("id") id: string): Promise<void> {
		return this.registryService.deleteSupersprint(id);
	}

	@Get("sprints")
	async findAllSprints(): Promise<KanbanBoardSprintDto[]> {
		return this.registryService.findAllSprints();
	}

	@Post("sprints")
	async createSprint(
		@Body() dto: CreateKanbanBoardSprintRequestDto,
	): Promise<KanbanBoardSprintDto> {
		return this.registryService.createSprint(dto);
	}

	@Put("sprints/:id")
	async updateSprint(
		@Param("id") id: string,
		@Body() dto: UpdateKanbanBoardSprintRequestDto,
	): Promise<KanbanBoardSprintDto> {
		return this.registryService.updateSprint(id, dto);
	}

	@Delete("sprints/:id")
	async deleteSprint(@Param("id") id: string): Promise<void> {
		return this.registryService.deleteSprint(id);
	}

	@Get("streams")
	async findAllStreams(): Promise<KanbanBoardStreamDto[]> {
		return this.registryService.findAllStreams();
	}

	@Post("streams")
	async createStream(
		@Body() dto: CreateKanbanBoardStreamRequestDto,
	): Promise<KanbanBoardStreamDto> {
		return this.registryService.createStream(dto);
	}

	@Put("streams/:id")
	async updateStream(
		@Param("id") id: string,
		@Body() dto: UpdateKanbanBoardStreamRequestDto,
	): Promise<KanbanBoardStreamDto> {
		return this.registryService.updateStream(id, dto);
	}

	@Delete("streams/:id")
	async deleteStream(@Param("id") id: string): Promise<void> {
		return this.registryService.deleteStream(id);
	}

	@Get("customers")
	async findAllCustomers(): Promise<KanbanBoardCustomerDto[]> {
		return this.registryService.findAllCustomers();
	}

	@Post("customers")
	async createCustomer(
		@Body() dto: CreateKanbanBoardCustomerRequestDto,
	): Promise<KanbanBoardCustomerDto> {
		return this.registryService.createCustomer(dto);
	}

	@Put("customers/:id")
	async updateCustomer(
		@Param("id") id: string,
		@Body() dto: UpdateKanbanBoardCustomerRequestDto,
	): Promise<KanbanBoardCustomerDto> {
		return this.registryService.updateCustomer(id, dto);
	}

	@Delete("customers/:id")
	async deleteCustomer(@Param("id") id: string): Promise<void> {
		return this.registryService.deleteCustomer(id);
	}

	@Get("boards")
	async findAllBoards(): Promise<KanbanBoardBoardDto[]> {
		return this.registryService.findAllBoards();
	}

	@Get("boards/ref/:ref")
	async findBoardByRef(
		@Param("ref") ref: string,
	): Promise<KanbanBoardBoardDto> {
		return this.registryService.findBoardByRef(ref);
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

	@Get("boards/:boardId/columns")
	async findBoardColumns(
		@Param("boardId") boardId: string,
	): Promise<KanbanBoardColumnDto[]> {
		return this.registryService.findBoardColumns(
			await this.registryService.resolveBoardId(boardId),
		);
	}

	@Post("boards/:boardId/columns")
	async createColumn(
		@Param("boardId") boardId: string,
		@Body() dto: CreateKanbanBoardColumnRequestDto,
	): Promise<KanbanBoardColumnDto> {
		const resolvedBoardId =
			await this.registryService.resolveBoardId(boardId);
		return this.registryService.createColumn(resolvedBoardId, dto);
	}

	@Put("boards/:boardId/columns/:columnId")
	async updateColumn(
		@Param("boardId") boardId: string,
		@Param("columnId") columnId: string,
		@Body() dto: UpdateKanbanBoardColumnRequestDto,
	): Promise<KanbanBoardColumnDto> {
		const resolvedBoardId =
			await this.registryService.resolveBoardId(boardId);
		return this.registryService.updateColumn(
			resolvedBoardId,
			columnId,
			dto,
		);
	}

	@Delete("boards/:boardId/columns/:columnId")
	async deleteColumn(
		@Param("boardId") boardId: string,
		@Param("columnId") columnId: string,
	): Promise<void> {
		const resolvedBoardId =
			await this.registryService.resolveBoardId(boardId);
		return this.registryService.deleteColumn(resolvedBoardId, columnId);
	}

	@Get("tasks/registry")
	async findTasksRegistry(): Promise<KanbanBoardTaskRegistryDto[]> {
		return this.registryService.findAllTasksRegistry();
	}

	@Get("tasks/ref/:ref")
	async findTaskByRef(
		@Param("ref") ref: string,
	): Promise<KanbanBoardTaskRegistryDto> {
		return this.registryService.findTaskByRef(ref);
	}

	@Get("tasks/registry/export")
	@ApiResponse({
		status: HttpStatus.OK,
		content: {
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
				schema: { type: "string", format: "binary" },
			},
		},
	})
	async exportTasksRegistry(@Res() res: Response): Promise<void> {
		const buffer = await this.registryService.exportTasksRegistryXlsx();
		const date = new Date().toISOString().slice(0, 10);
		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		);
		res.setHeader(
			"Content-Disposition",
			`attachment; filename=tracker-tasks-${date}.xlsx`,
		);
		res.end(buffer);
	}

	@Get("sprints/export")
	@ApiResponse({
		status: HttpStatus.OK,
		content: {
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
				schema: { type: "string", format: "binary" },
			},
		},
	})
	async exportSprintsRegistry(@Res() res: Response): Promise<void> {
		const buffer = await this.registryService.exportSprintsRegistryXlsx();
		const date = new Date().toISOString().slice(0, 10);
		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		);
		res.setHeader(
			"Content-Disposition",
			`attachment; filename=tracker-sprints-${date}.xlsx`,
		);
		res.end(buffer);
	}

	@Get("supersprints/export")
	@ApiResponse({
		status: HttpStatus.OK,
		content: {
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
				schema: { type: "string", format: "binary" },
			},
		},
	})
	async exportSupersprintsRegistry(@Res() res: Response): Promise<void> {
		const buffer = await this.registryService.exportSupersprintsRegistryXlsx();
		const date = new Date().toISOString().slice(0, 10);
		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		);
		res.setHeader(
			"Content-Disposition",
			`attachment; filename=tracker-supersprints-${date}.xlsx`,
		);
		res.end(buffer);
	}

	@Get("history/overview")
	async findHistoryOverview(): Promise<KanbanBoardHistoryOverviewDto> {
		return this.historyService.findAllBoardsHistoryOverview();
	}

	@Get("boards/:boardId/history")
	async findBoardHistory(
		@Param("boardId") boardId: string,
	): Promise<KanbanBoardHistoryDto> {
		const resolvedBoardId =
			await this.registryService.resolveBoardId(boardId);
		return this.historyService.findBoardHistory(resolvedBoardId);
	}

	@Post("tasks")
	async createTask(
		@Body() dto: CreateKanbanBoardTaskRequestDto,
		@CurrentUser() user: Record<string, unknown> | undefined,
	): Promise<KanbanBoardTaskRegistryDto> {
		return this.registryService.createTask(dto, kanbanAuditUserId(user));
	}

	@Put("tasks/:id")
	async updateTask(
		@Param("id") id: string,
		@Body() dto: UpdateKanbanBoardTaskRequestDto,
		@CurrentUser() user: Record<string, unknown> | undefined,
	): Promise<KanbanBoardTaskRegistryDto> {
		return this.registryService.updateTask(id, dto, kanbanAuditUserId(user));
	}

	@Delete("tasks/:id")
	async deleteTask(
		@Param("id") id: string,
		@CurrentUser() user: Record<string, unknown> | undefined,
	): Promise<void> {
		return this.registryService.deleteTask(id, kanbanAuditUserId(user));
	}

	@Get("tasks/:taskId/images")
	async listTaskImages(
		@Param("taskId") taskId: string,
	): Promise<KanbanBoardTaskImageDto[]> {
		return this.taskImageService.listForTask(taskId);
	}

	@Post("tasks/:taskId/images")
	@UseInterceptors(
		FileFieldsInterceptor([
			{ name: "full", maxCount: 1 },
			{ name: "thumb", maxCount: 1 },
		]),
	)
	@ApiConsumes("multipart/form-data")
	async uploadTaskImage(
		@Param("taskId") taskId: string,
		@UploadedFiles()
		files: {
			full?: Array<{ buffer: Buffer; originalname?: string; mimetype?: string }>;
			thumb?: Array<{ buffer: Buffer }>;
		},
		@Body()
		body: {
			name?: string;
			width?: string;
			height?: string;
			mimeType?: string;
		},
	): Promise<KanbanBoardTaskImageDto> {
		const full = files.full?.[0];
		const thumb = files.thumb?.[0];
		if (!full?.buffer?.length || !thumb?.buffer?.length) {
			throw new BadRequestException("Передайте full и thumb");
		}
		return this.taskImageService.upload(taskId, {
			originalName: body.name ?? full.originalname ?? "image",
			mimeType: body.mimeType ?? full.mimetype ?? "image/webp",
			width: Number(body.width),
			height: Number(body.height),
			full: full.buffer,
			thumb: thumb.buffer,
		});
	}

	@Get("tasks/:taskId/images/:imageId")
	async getTaskImage(
		@Param("taskId") taskId: string,
		@Param("imageId") imageId: string,
		@Query("variant") variantRaw: string | undefined,
		@Res() res: Response,
	): Promise<void> {
		const variant = variantRaw === "thumb" ? "thumb" : "full";
		const file = await this.taskImageService.readFile(taskId, imageId, variant);
		res.setHeader("Content-Type", file.mimeType);
		res.setHeader("Cache-Control", "private, max-age=86400");
		res.end(file.buffer);
	}

	@Delete("tasks/:taskId/images/:imageId")
	async deleteTaskImage(
		@Param("taskId") taskId: string,
		@Param("imageId") imageId: string,
	): Promise<void> {
		return this.taskImageService.delete(taskId, imageId);
	}

	@Post("tasks/import-planning")
	@UseInterceptors(FileInterceptor("file"))
	@ApiConsumes("multipart/form-data")
	async importPlanningTasks(
		@UploadedFile() file?: { buffer: Buffer },
	): Promise<KanbanBoardPlanningImportResultDto> {
		if (!file?.buffer?.length) {
			throw new BadRequestException("Файл не передан");
		}
		try {
			return await this.registryService.importPlanningTasks(file.buffer);
		} catch (error) {
			this.rethrowImportError(error);
		}
	}

	@Post("tasks/assign-board")
	async assignTasksToBoard(
		@Body() dto: AssignKanbanBoardTasksToBoardRequestDto,
	): Promise<AssignKanbanBoardTasksToBoardResultDto> {
		return this.registryService.assignTasksToBoard(dto);
	}

	@Get("boards/:boardId/tasks")
	async findBoardTasks(
		@Param("boardId") boardId: string,
	): Promise<KanbanBoardTaskRecord[]> {
		const resolvedBoardId =
			await this.registryService.resolveBoardId(boardId);
		return this.kanbanBoardService.findByBoard(resolvedBoardId);
	}

	@Put("boards/:boardId/tasks")
	async saveBoardTasks(
		@Param("boardId") boardId: string,
		@Body() tasks: KanbanBoardTaskRecord[],
		@CurrentUser() user: Record<string, unknown> | undefined,
	): Promise<KanbanBoardTaskRecord[]> {
		if (!Array.isArray(tasks)) {
			throw new BadRequestException("Ожидается массив задач");
		}
		const resolvedBoardId =
			await this.registryService.resolveBoardId(boardId);
		return this.kanbanBoardService.saveBoardTasks(
			resolvedBoardId,
			tasks,
			kanbanAuditUserId(user),
		);
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
		const resolvedBoardId =
			await this.registryService.resolveBoardId(boardId);
		const buffer =
			await this.kanbanBoardService.exportBoardSnapshot(resolvedBoardId);
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
		const resolvedBoardId =
			await this.registryService.resolveBoardId(boardId);
		try {
			return await this.kanbanBoardService.importBoardSnapshot(
				resolvedBoardId,
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
		if (error instanceof PlanningImportNotSupportedError) {
			throw new BadRequestException(error.message);
		}
		if (error instanceof Error) {
			throw new BadRequestException(error.message);
		}
		throw error;
	}
}
