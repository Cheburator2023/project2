import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import type { KanbanBoardTaskContent } from "@smart-anketa/api-contract";
import { KanbanBoardEntity } from "./kanban-board.entity";
import { KanbanBoardProjectEntity } from "./kanban-board-project.entity";

@Entity("kanban_board_tasks")
export class KanbanBoardTaskEntity {
	@PrimaryColumn("varchar", { length: 26 })
	id!: string;

	@Index()
	@Column({ name: "board_id", type: "varchar", length: 26 })
	boardId!: string;

	@ManyToOne(() => KanbanBoardEntity, { onDelete: "CASCADE" })
	@JoinColumn({ name: "board_id" })
	board?: KanbanBoardEntity;

	@Index()
	@Column({ name: "project_id", type: "varchar", length: 26 })
	projectId!: string;

	@ManyToOne(() => KanbanBoardProjectEntity, { onDelete: "CASCADE" })
	@JoinColumn({ name: "project_id" })
	project?: KanbanBoardProjectEntity;

	@Column({ name: "task_number", type: "int" })
	taskNumber!: number;

	@Index()
	@Column({ name: "parent_id", type: "varchar", length: 64 })
	parentId!: string;

	@Column({ type: "int" })
	position!: number;

	@Column({ type: "jsonb" })
	content!: KanbanBoardTaskContent;

	@Index()
	@Column({ type: "varchar", length: 255 })
	origin!: string;

	/** ISO timestamp создания (как updatedAt — varchar для совместимости с concurrency). */
	@Column({ name: "created_at", type: "varchar", length: 64 })
	createdAt!: string;

	/** Имя исполнителя из настроек трекера («Я — исполнитель»), как authorName у комментариев. */
	@Column({ name: "created_by", type: "varchar", length: 255, nullable: true })
	createdBy!: string | null;

	@Column({ name: "updated_at", type: "varchar", length: 64 })
	updatedAt!: string;
}
