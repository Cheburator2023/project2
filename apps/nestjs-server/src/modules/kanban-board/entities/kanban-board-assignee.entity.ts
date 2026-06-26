import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity("kanban_board_assignees")
export class KanbanBoardAssigneeEntity {
	@PrimaryColumn("varchar", { length: 26 })
	id!: string;

	@Column({ type: "varchar", length: 64, unique: true })
	code!: string;

	@Column({ type: "varchar", length: 255 })
	name!: string;

	@Column({ type: "varchar", length: 255, nullable: true })
	email!: string | null;

	@Column({ type: "varchar", length: 32, nullable: true })
	role!: string | null;

	@Column({
		name: "sprint_capacity_pd",
		type: "numeric",
		precision: 6,
		scale: 2,
		nullable: true,
	})
	sprintCapacityPd!: string | null;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt!: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt!: Date;
}
