import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	OneToMany,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import { KanbanBoardEntity } from "./kanban-board.entity";

@Entity("kanban_board_projects")
export class KanbanBoardProjectEntity {
	@PrimaryColumn("varchar", { length: 26 })
	id!: string;

	@Column({ type: "varchar", length: 64, unique: true })
	code!: string;

	@Column({ type: "varchar", length: 255 })
	name!: string;

	@Column({ type: "text", nullable: true })
	description!: string | null;

	@Column({ name: "is_stock", type: "boolean", default: false })
	isStock!: boolean;

	@OneToMany(() => KanbanBoardEntity, (board) => board.project)
	boards?: KanbanBoardEntity[];

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt!: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt!: Date;
}
