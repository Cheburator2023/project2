import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryColumn,
} from "typeorm";
import type { KanbanBoardTaskChangeItem } from "@smart-anketa/api-contract";

@Entity({ name: "kanban_board_task_history" })
export class KanbanBoardTaskHistoryEntity {
	@PrimaryColumn("varchar", { length: 26 })
	id!: string;

	@Index()
	@Column({ name: "board_id", type: "varchar", length: 26 })
	boardId!: string;

	@Index()
	@Column({ name: "task_id", type: "varchar", length: 26 })
	taskId!: string;

	@Column({ name: "task_key", type: "varchar", length: 64 })
	taskKey!: string;

	@Column({ name: "task_title", type: "varchar", length: 512, default: "" })
	taskTitle!: string;

	@Column({ type: "jsonb" })
	changes!: KanbanBoardTaskChangeItem[];

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt!: Date;

	@Column({ name: "created_by", type: "varchar", length: 255, nullable: true })
	createdBy!: string | null;
}
