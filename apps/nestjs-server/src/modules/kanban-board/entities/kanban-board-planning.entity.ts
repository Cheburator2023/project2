import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	OneToOne,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import { KanbanBoardReleaseEntity } from "./kanban-board-release.entity";

@Entity("kanban_board_plannings")
export class KanbanBoardPlanningEntity {
	@PrimaryColumn("varchar", { length: 26 })
	id!: string;

	@Column({ type: "varchar", length: 64, unique: true })
	code!: string;

	@Column({ type: "varchar", length: 255 })
	name!: string;

	@Column({ type: "text", nullable: true })
	description!: string | null;

	@Column({ name: "release_id", type: "varchar", length: 26, unique: true })
	releaseId!: string;

	@OneToOne(() => KanbanBoardReleaseEntity, (release) => release.planning, {
		onDelete: "CASCADE",
	})
	@JoinColumn({ name: "release_id" })
	release?: KanbanBoardReleaseEntity;

	@Column({ name: "layout_json", type: "jsonb", nullable: true })
	layoutJson!: unknown | null;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt!: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt!: Date;
}
