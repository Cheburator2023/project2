import { Injectable } from "@nestjs/common";
import { DataSource, EntitySubscriberInterface, EventSubscriber } from "typeorm";
import type {
	InsertEvent,
	RemoveEvent,
	UpdateEvent,
} from "typeorm";
import { KanbanBoardTaskEntity } from "../entities/kanban-board-task.entity";
import { KanbanWsPublisher } from "./kanban-ws-publisher.service";

@EventSubscriber()
@Injectable()
export class KanbanTaskWsSubscriber
	implements EntitySubscriberInterface<KanbanBoardTaskEntity>
{
	constructor(
		dataSource: DataSource,
		private readonly publisher: KanbanWsPublisher,
	) {
		if (!dataSource.subscribers.includes(this)) {
			dataSource.subscribers.push(this);
		}
	}

	listenTo() {
		return KanbanBoardTaskEntity;
	}

	afterInsert(event: InsertEvent<KanbanBoardTaskEntity>): void {
		this.emit(event.entity);
	}

	afterUpdate(event: UpdateEvent<KanbanBoardTaskEntity>): void {
		this.emit(
			(event.entity ?? event.databaseEntity) as
				| KanbanBoardTaskEntity
				| undefined,
		);
	}

	afterRemove(event: RemoveEvent<KanbanBoardTaskEntity>): void {
		this.emit(event.databaseEntity);
	}

	private emit(entity?: KanbanBoardTaskEntity): void {
		if (!entity?.boardId || !entity.id) return;
		this.publisher.publishTaskChanged(entity.boardId, entity.id);
	}
}
