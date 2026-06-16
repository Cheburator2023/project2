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
import type { TaskRecord } from "@smart-anketa/api-contract";
import type { Response } from "express";
import {
	SnapshotIntegrityError,
	SnapshotSchemaError,
	TaskTrackerService,
} from "../services/task-tracker.service";

@ApiBearerAuth("JWT-auth")
@ApiTags("TaskTracker")
@Controller("task-tracker")
export class TaskTrackerController {
	constructor(private readonly taskTrackerService: TaskTrackerService) {}

	@Get("config")
	@ApiOperation({ summary: "Конфигурация таск-трекера текущего стенда" })
	getConfig() {
		return { standId: this.taskTrackerService.getStandId() };
	}

	@Get("tasks")
	@ApiOperation({ summary: "Список всех задач на доске" })
	async findAll(): Promise<TaskRecord[]> {
		return this.taskTrackerService.findAll();
	}

	@Put("tasks")
	@ApiOperation({ summary: "Сохранить задачи текущего стенда" })
	async saveLocalTasks(@Body() tasks: TaskRecord[]): Promise<TaskRecord[]> {
		if (!Array.isArray(tasks)) {
			throw new BadRequestException("Ожидается массив задач");
		}
		return this.taskTrackerService.saveLocalTasks(tasks);
	}

	@Delete("tasks/:id")
	@ApiOperation({ summary: "Удалить задачу текущего стенда" })
	async deleteTask(@Param("id") id: string): Promise<void> {
		await this.taskTrackerService.deleteLocalTask(id);
	}

	@Get("export")
	@ApiOperation({ summary: "Экспорт снапшота задач текущего стенда в XLSX" })
	@ApiResponse({
		status: HttpStatus.OK,
		content: {
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
				schema: { type: "string", format: "binary" },
			},
		},
	})
	async exportSnapshot(@Res() res: Response): Promise<void> {
		const buffer = await this.taskTrackerService.exportSnapshot();
		const date = new Date().toISOString().slice(0, 10);
		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		);
		res.setHeader(
			"Content-Disposition",
			`attachment; filename=tasks-${date}.xlsx`,
		);
		res.end(buffer);
	}

	@Post("import")
	@UseInterceptors(FileInterceptor("file"))
	@ApiConsumes("multipart/form-data")
	@ApiBody({
		schema: {
			type: "object",
			properties: {
				file: { type: "string", format: "binary" },
			},
		},
	})
	@ApiOperation({ summary: "Импорт снапшота задач из XLSX" })
	async importSnapshot(@UploadedFile() file?: { buffer: Buffer }) {
		if (!file?.buffer?.length) {
			throw new BadRequestException("Файл не передан");
		}

		try {
			return await this.taskTrackerService.importSnapshot(file.buffer);
		} catch (error) {
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
}
