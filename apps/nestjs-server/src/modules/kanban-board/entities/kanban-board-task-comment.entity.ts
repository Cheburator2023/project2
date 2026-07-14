import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "kanban_board_task_comments" })
export class KanbanBoardTaskCommentEntity {
	@PrimaryColumn({ type: "varchar", length: 26 })
	id!: string;

	@Column({ name: "task_id", type: "varchar", length: 26 })
	taskId!: string;

	@Column({ type: "text" })
	body!: string;

	@Column({ name: "author_name", type: "varchar", length: 255 })
	authorName!: string;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt!: Date;
}
