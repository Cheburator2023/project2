import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KanbanBoardTaskEntity } from "./entities/kanban-board-task.entity";
import { KanbanBoardTaskImageEntity } from "./entities/kanban-board-task-image.entity";
import { KanbanBoardTaskFileEntity } from "./entities/kanban-board-task-file.entity";
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
import { KanbanBoardReleaseEntity } from "./entities/kanban-board-release.entity";
import { KanbanBoardReleaseThemeEntity } from "./entities/kanban-board-release-theme.entity";
import { KanbanBoardReleaseTaskEntity } from "./entities/kanban-board-release-task.entity";
import { KanbanBoardPlanningEntity } from "./entities/kanban-board-planning.entity";
import { KanbanBoardPlanningTaskEntity } from "./entities/kanban-board-planning-task.entity";
import { KanbanBoardPushSubscriptionEntity } from "./entities/kanban-board-push-subscription.entity";
import { KanbanBoardController } from "./controllers/kanban-board.controller";
import { KanbanBoardService } from "./services/kanban-board.service";
import { KanbanBoardRegistryService } from "./services/kanban-board-registry.service";
import { KanbanBoardPlanningService } from "./services/kanban-board-planning.service";
import { KanbanBoardTaskImageService } from "./services/kanban-board-task-image.service";
import { KanbanBoardTaskFileService } from "./services/kanban-board-task-file.service";
import { KanbanBoardTaskCommentService } from "./services/kanban-board-task-comment.service";
import { KanbanBoardTaskLockService } from "./services/kanban-board-task-lock.service";
import { KanbanBoardTaskLockEntity } from "./entities/kanban-board-task-lock.entity";
import { KanbanBoardTaskImageCleanupService } from "./services/kanban-board-task-image-cleanup.service";
import { KanbanBoardTaskHistoryEntity } from "./entities/kanban-board-task-history.entity";
import { KanbanBoardHistoryService } from "./services/kanban-board-history.service";
import { KanbanBoardPushService } from "./services/kanban-board-push.service";
import { KanbanWsPublisher } from "./services/kanban-ws-publisher.service";
import { KanbanTaskWsSubscriber } from "./services/kanban-task-ws.subscriber";
import { KanbanGateway } from "./gateways/kanban.gateway";

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
			KanbanBoardTaskFileEntity,
			KanbanBoardTaskCommentEntity,
			KanbanBoardTaskLockEntity,
			KanbanBoardSettingsEntity,
			KanbanBoardTaskHistoryEntity,
			KanbanBoardReleaseEntity,
			KanbanBoardReleaseThemeEntity,
			KanbanBoardReleaseTaskEntity,
			KanbanBoardPlanningEntity,
			KanbanBoardPlanningTaskEntity,
			KanbanBoardPushSubscriptionEntity,
		]),
	],
	controllers: [KanbanBoardController],
	providers: [
		KanbanBoardService,
		KanbanBoardRegistryService,
		KanbanBoardPlanningService,
		KanbanBoardTaskImageService,
		KanbanBoardTaskFileService,
		KanbanBoardTaskCommentService,
		KanbanBoardTaskLockService,
		KanbanBoardTaskImageCleanupService,
		KanbanBoardHistoryService,
		KanbanBoardPushService,
		KanbanWsPublisher,
		KanbanTaskWsSubscriber,
		KanbanGateway,
	],
	exports: [
		KanbanBoardService,
		KanbanBoardRegistryService,
		KanbanBoardPlanningService,
		KanbanBoardTaskImageService,
		KanbanBoardTaskFileService,
		KanbanBoardTaskCommentService,
		KanbanBoardTaskLockService,
		KanbanBoardHistoryService,
		KanbanBoardPushService,
	],
})
export class KanbanBoardModule {}
