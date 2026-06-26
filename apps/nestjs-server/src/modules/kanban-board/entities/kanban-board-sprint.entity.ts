import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import { KanbanBoardSupersprintEntity } from "./kanban-board-supersprint.entity";

@Entity("kanban_board_sprints")
export class KanbanBoardSprintEntity {
	@PrimaryColumn("varchar", { length: 26 })
	id!: string;

	@Index()
	@Column({ name: "supersprint_id", type: "varchar", length: 26, nullable: true })
	supersprintId!: string | null;

	@ManyToOne(() => KanbanBoardSupersprintEntity, (item) => item.sprints, {
		onDelete: "SET NULL",
	})
	@JoinColumn({ name: "supersprint_id" })
	supersprint?: KanbanBoardSupersprintEntity | null;

	@Column({ type: "varchar", length: 64, unique: true })
	code!: string;

	@Column({ type: "varchar", length: 255 })
	name!: string;

	@Column({ type: "text", nullable: true })
	description!: string | null;

	@Column({ name: "start_date", type: "date" })
	startDate!: string;

	@Column({ name: "end_date", type: "date", nullable: true })
	endDate!: string | null;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt!: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt!: Date;
}
