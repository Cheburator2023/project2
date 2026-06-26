import {
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import { KanbanBoardSprintEntity } from "./kanban-board-sprint.entity";

@Entity("kanban_board_supersprints")
export class KanbanBoardSupersprintEntity {
	@PrimaryColumn("varchar", { length: 26 })
	id!: string;

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

	@OneToMany(() => KanbanBoardSprintEntity, (sprint) => sprint.supersprint)
	sprints?: KanbanBoardSprintEntity[];

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt!: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt!: Date;
}
