import {
	Injectable,
	Logger,
	OnModuleDestroy,
	OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { KanbanBoardColumnEntity } from "../entities/kanban-board-column.entity";
import { KanbanBoardTaskEntity } from "../entities/kanban-board-task.entity";
import {
	kanbanBoardIsDoneColumn,
	kanbanBoardTaskImageCleanupCutoffIso,
	kanbanBoardTaskImageDoneRetentionDays,
} from "../utils/kanban-board-task-image.util";
import { KanbanBoardTaskImageService } from "./kanban-board-task-image.service";

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 60 * 1000;

@Injectable()
export class KanbanBoardTaskImageCleanupService
	implements OnModuleInit, OnModuleDestroy
{
	private readonly logger = new Logger(KanbanBoardTaskImageCleanupService.name);
	private timer: NodeJS.Timeout | undefined;
	private startupTimer: NodeJS.Timeout | undefined;

	constructor(
		@InjectRepository(KanbanBoardTaskEntity)
		private readonly taskRepository: Repository<KanbanBoardTaskEntity>,
		@InjectRepository(KanbanBoardColumnEntity)
		private readonly columnRepository: Repository<KanbanBoardColumnEntity>,
		private readonly taskImageService: KanbanBoardTaskImageService,
	) {}

	onModuleInit(): void {
		if (process.env.KANBAN_TASK_IMAGES_CLEANUP_ENABLED === "false") {
			this.logger.log("Очистка изображений задач отключена");
			return;
		}

		this.startupTimer = setTimeout(() => {
			void this.runCleanup();
		}, STARTUP_DELAY_MS);

		this.timer = setInterval(() => {
			void this.runCleanup();
		}, CLEANUP_INTERVAL_MS);
	}

	onModuleDestroy(): void {
		if (this.startupTimer) clearTimeout(this.startupTimer);
		if (this.timer) clearInterval(this.timer);
	}

	async runCleanup(): Promise<{ taskCount: number; imageCount: number }> {
		try {
			const result = await this.purgeImagesForStaleDoneTasks();
			if (result.imageCount > 0) {
				this.logger.log(
					`Очистка изображений: задач ${result.taskCount}, файлов ${result.imageCount}`,
				);
			}
			return result;
		} catch (error) {
			this.logger.error(
				"Ошибка очистки изображений у завершённых задач",
				error instanceof Error ? error.stack : String(error),
			);
			return { taskCount: 0, imageCount: 0 };
		}
	}

	async purgeImagesForStaleDoneTasks(): Promise<{
		taskCount: number;
		imageCount: number;
	}> {
		const retentionDays = kanbanBoardTaskImageDoneRetentionDays(
			process.env.KANBAN_TASK_IMAGES_DONE_RETENTION_DAYS,
		);
		const cutoff = kanbanBoardTaskImageCleanupCutoffIso(retentionDays);
		const doneParentIds = await this.resolveDoneColumnIds();
		if (!doneParentIds.length) {
			return { taskCount: 0, imageCount: 0 };
		}

		const tasks = await this.taskRepository
			.createQueryBuilder("task")
			.where("task.parent_id IN (:...doneParentIds)", { doneParentIds })
			.andWhere("task.updated_at < :cutoff", { cutoff })
			.getMany();
		if (!tasks.length) {
			return { taskCount: 0, imageCount: 0 };
		}

		let imageCount = 0;
		for (const task of tasks) {
			imageCount += await this.taskImageService.deleteAllForTask(task.id);
		}

		return { taskCount: tasks.length, imageCount };
	}

	private async resolveDoneColumnIds(): Promise<string[]> {
		const columns = await this.columnRepository.find({
			select: ["id", "title"],
		});
		const ids = new Set<string>();
		for (const column of columns) {
			if (kanbanBoardIsDoneColumn(column)) {
				ids.add(column.id);
			}
		}
		return [...ids];
	}
}
