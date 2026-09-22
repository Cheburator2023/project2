import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
} from "typeorm";
import { KanbanBoardPlanningEntity } from "./kanban-board-planning.entity";
import { KanbanBoardReleaseThemeEntity } from "./kanban-board-release-theme.entity";
import { KanbanBoardTaskEntity } from "./kanban-board-task.entity";

/** Задача в планировании. Релиз не обязателен. */
@Entity("kanban_board_planning_tasks")
export class KanbanBoardPlanningTaskEntity {
	@PrimaryColumn({ name: "planning_id", type: "varchar", length: 26 })
	planningId!: string;

	@PrimaryColumn({ name: "task_id", type: "varchar", length: 26 })
	taskId!: string;

	@ManyToOne(() => KanbanBoardPlanningEntity, { onDelete: "CASCADE" })
	@JoinColumn({ name: "planning_id" })
	planning?: KanbanBoardPlanningEntity;

	@ManyToOne(() => KanbanBoardTaskEntity, { onDelete: "CASCADE" })
	@JoinColumn({ name: "task_id" })
	task?: KanbanBoardTaskEntity;

	@Index()
	@Column({ name: "theme_id", type: "varchar", length: 26, nullable: true })
	themeId!: string | null;

	@ManyToOne(() => KanbanBoardReleaseThemeEntity, { onDelete: "SET NULL" })
	@JoinColumn({ name: "theme_id" })
	theme?: KanbanBoardReleaseThemeEntity | null;

	@Column({ type: "int", default: 0 })
	position!: number;
}
