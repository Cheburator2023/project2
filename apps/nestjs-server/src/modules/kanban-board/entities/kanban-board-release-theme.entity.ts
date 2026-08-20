import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	OneToMany,
	PrimaryColumn,
} from "typeorm";
import { KanbanBoardReleaseEntity } from "./kanban-board-release.entity";
import { KanbanBoardReleaseTaskEntity } from "./kanban-board-release-task.entity";

@Entity("kanban_board_release_themes")
export class KanbanBoardReleaseThemeEntity {
	@PrimaryColumn("varchar", { length: 26 })
	id!: string;

	@Index()
	@Column({ name: "release_id", type: "varchar", length: 26 })
	releaseId!: string;

	@ManyToOne(() => KanbanBoardReleaseEntity, (release) => release.themes, {
		onDelete: "CASCADE",
	})
	@JoinColumn({ name: "release_id" })
	release?: KanbanBoardReleaseEntity;

	@Column({ type: "varchar", length: 255 })
	name!: string;

	@Column({ type: "varchar", length: 7, default: "#64748b" })
	color!: string;

	@Column({ type: "int", default: 0 })
	position!: number;

	@OneToMany(() => KanbanBoardReleaseTaskEntity, (item) => item.theme)
	tasks?: KanbanBoardReleaseTaskEntity[];
}
