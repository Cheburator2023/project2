import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import { KanbanBoardEntity } from "./kanban-board.entity";

@Entity("kanban_board_columns")
export class KanbanBoardColumnEntity {
	@PrimaryColumn({ name: "board_id", type: "varchar", length: 26 })
	boardId!: string;

	@PrimaryColumn("varchar", { length: 26 })
	id!: string;

	@ManyToOne(() => KanbanBoardEntity, { onDelete: "CASCADE" })
	@JoinColumn({ name: "board_id" })
	board?: KanbanBoardEntity;

	@Column({ type: "varchar", length: 255 })
	title!: string;

	@Column({ type: "varchar", length: 7, default: "#94a3b8" })
	color!: string;

	@Column({ name: "sort_order", type: "int", default: 0 })
	sortOrder!: number;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt!: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt!: Date;
}
