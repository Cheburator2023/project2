import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "kanban_board_task_locks" })
export class KanbanBoardTaskLockEntity {
	@PrimaryColumn({ name: "task_id", type: "varchar", length: 26 })
	taskId!: string;

	@Column({ name: "locked_by_label", type: "varchar", length: 255 })
	lockedByLabel!: string;

	@Column({ name: "locked_by_user_id", type: "varchar", length: 128, nullable: true })
	lockedByUserId!: string | null;

	@Column({ name: "expires_at", type: "timestamptz" })
	expiresAt!: Date;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt!: Date;
}
