import {
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import { KanbanBoardReleaseEntity } from "./kanban-board-release.entity";
import { KanbanBoardReleaseThemeEntity } from "./kanban-board-release-theme.entity";

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

	@OneToMany(() => KanbanBoardReleaseEntity, (release) => release.planning)
	releases?: KanbanBoardReleaseEntity[];

	@OneToMany(() => KanbanBoardReleaseThemeEntity, (theme) => theme.planning)
	themes?: KanbanBoardReleaseThemeEntity[];

	@Column({ name: "layout_json", type: "jsonb", nullable: true })
	layoutJson!: unknown | null;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt!: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt!: Date;
}
