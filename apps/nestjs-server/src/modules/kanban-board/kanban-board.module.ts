import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KanbanBoardTaskEntity } from "./entities/kanban-board-task.entity";
import { KanbanBoardProjectEntity } from "./entities/kanban-board-project.entity";
import { KanbanBoardEntity } from "./entities/kanban-board.entity";
import { KanbanBoardColumnEntity } from "./entities/kanban-board-column.entity";
import { KanbanBoardController } from "./controllers/kanban-board.controller";
import { KanbanBoardService } from "./services/kanban-board.service";
import { KanbanBoardRegistryService } from "./services/kanban-board-registry.service";

@Module({
	imports: [
		TypeOrmModule.forFeature([
			KanbanBoardProjectEntity,
			KanbanBoardEntity,
			KanbanBoardColumnEntity,
			KanbanBoardTaskEntity,
		]),
	],
	controllers: [KanbanBoardController],
	providers: [KanbanBoardService, KanbanBoardRegistryService],
	exports: [KanbanBoardService, KanbanBoardRegistryService],
})
export class KanbanBoardModule {}
