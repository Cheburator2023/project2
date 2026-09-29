import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity({ name: "kanban_board_push_subscriptions" })
export class KanbanBoardPushSubscriptionEntity {
	@PrimaryColumn({ type: "varchar", length: 26 })
	id!: string;

	@Index()
	@Column({ name: "assignee_name", type: "varchar", length: 255 })
	assigneeName!: string;

	@Column({ type: "text", unique: true })
	endpoint!: string;

	@Column({ type: "text" })
	p256dh!: string;

	@Column({ type: "text" })
	auth!: string;

	@Column({ name: "user_agent", type: "text", nullable: true })
	userAgent!: string | null;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt!: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt!: Date;
}
