import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	OneToMany,
	PrimaryColumn,
} from "typeorm";
import { KanbanBoardPlanningEntity } from "./kanban-board-planning.entity";
import { KanbanBoardReleaseTaskEntity } from "./kanban-board-release-task.entity";

@Entity("kanban_board_release_themes")
export class KanbanBoardReleaseThemeEntity {
	@PrimaryColumn("varchar", { length: 26 })
	id!: string;

	@Index()
	@Column({ name: "planning_id", type: "varchar", length: 26 })
	planningId!: string;

	@ManyToOne(() => KanbanBoardPlanningEntity, (planning) => planning.themes, {
		onDelete: "CASCADE",
	})
	@JoinColumn({ name: "planning_id" })
	planning?: KanbanBoardPlanningEntity;

	@Column({ type: "varchar", length: 255 })
	name!: string;

	@Column({ type: "varchar", length: 7, default: "#64748b" })
	color!: string;

	@Column({ type: "int", default: 0 })
	position!: number;

	@OneToMany(() => KanbanBoardReleaseTaskEntity, (item) => item.theme)
	tasks?: KanbanBoardReleaseTaskEntity[];
}
