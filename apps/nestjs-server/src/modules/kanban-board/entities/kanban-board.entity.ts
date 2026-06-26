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
import { KanbanBoardProjectEntity } from "./kanban-board-project.entity";

@Entity("kanban_boards")
export class KanbanBoardEntity {
	@PrimaryColumn("varchar", { length: 26 })
	id!: string;

	@Index()
	@Column({ name: "project_id", type: "varchar", length: 26 })
	projectId!: string;

	@ManyToOne(() => KanbanBoardProjectEntity, (project) => project.boards, {
		onDelete: "CASCADE",
	})
	@JoinColumn({ name: "project_id" })
	project?: KanbanBoardProjectEntity;

	@Column({ type: "varchar", length: 255 })
	name!: string;

	@Column({ type: "varchar", length: 64 })
	slug!: string;

	@Column({ type: "text", nullable: true })
	description!: string | null;

	@Column({ name: "sort_order", type: "int", default: 0 })
	sortOrder!: number;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt!: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt!: Date;
}
