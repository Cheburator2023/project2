import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KanbanBoardTaskEntity } from "./entities/kanban-board-task.entity";
import { KanbanBoardTaskImageEntity } from "./entities/kanban-board-task-image.entity";
import { KanbanBoardTaskCommentEntity } from "./entities/kanban-board-task-comment.entity";
import { KanbanBoardProjectEntity } from "./entities/kanban-board-project.entity";
import { KanbanBoardEntity } from "./entities/kanban-board.entity";
import { KanbanBoardColumnEntity } from "./entities/kanban-board-column.entity";
import { KanbanBoardAssigneeEntity } from "./entities/kanban-board-assignee.entity";
import { KanbanBoardSupersprintEntity } from "./entities/kanban-board-supersprint.entity";
import { KanbanBoardSprintEntity } from "./entities/kanban-board-sprint.entity";
import { KanbanBoardCustomerEntity } from "./entities/kanban-board-customer.entity";
import { KanbanBoardStreamEntity } from "./entities/kanban-board-stream.entity";
import { KanbanBoardSettingsEntity } from "./entities/kanban-board-settings.entity";
import { KanbanBoardController } from "./controllers/kanban-board.controller";
import { KanbanBoardService } from "./services/kanban-board.service";
import { KanbanBoardRegistryService } from "./services/kanban-board-registry.service";
import { KanbanBoardTaskImageService } from "./services/kanban-board-task-image.service";
import { KanbanBoardTaskCommentService } from "./services/kanban-board-task-comment.service";
import { KanbanBoardTaskLockService } from "./services/kanban-board-task-lock.service";
import { KanbanBoardTaskLockEntity } from "./entities/kanban-board-task-lock.entity";
import { KanbanBoardTaskImageCleanupService } from "./services/kanban-board-task-image-cleanup.service";
import { KanbanBoardTaskHistoryEntity } from "./entities/kanban-board-task-history.entity";
import { KanbanBoardHistoryService } from "./services/kanban-board-history.service";

@Module({
	imports: [
		TypeOrmModule.forFeature([
			KanbanBoardProjectEntity,
			KanbanBoardEntity,
			KanbanBoardColumnEntity,
			KanbanBoardAssigneeEntity,
			KanbanBoardSupersprintEntity,
			KanbanBoardSprintEntity,
			KanbanBoardCustomerEntity,
			KanbanBoardStreamEntity,
			KanbanBoardTaskEntity,
			KanbanBoardTaskImageEntity,
			KanbanBoardTaskCommentEntity,
			KanbanBoardTaskLockEntity,
			KanbanBoardSettingsEntity,
			KanbanBoardTaskHistoryEntity,
		]),
	],
	controllers: [KanbanBoardController],
	providers: [
		KanbanBoardService,
		KanbanBoardRegistryService,
		KanbanBoardTaskImageService,
		KanbanBoardTaskCommentService,
		KanbanBoardTaskLockService,
		KanbanBoardTaskImageCleanupService,
		KanbanBoardHistoryService,
	],
	exports: [
		KanbanBoardService,
		KanbanBoardRegistryService,
		KanbanBoardTaskImageService,
		KanbanBoardTaskCommentService,
		KanbanBoardTaskLockService,
		KanbanBoardHistoryService,
	],
})
export class KanbanBoardModule {}
