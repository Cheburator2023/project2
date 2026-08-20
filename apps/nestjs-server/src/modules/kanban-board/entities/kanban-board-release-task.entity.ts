import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { KanbanBoardReleaseEntity } from "./kanban-board-release.entity";
import { KanbanBoardReleaseThemeEntity } from "./kanban-board-release-theme.entity";
import { KanbanBoardTaskEntity } from "./kanban-board-task.entity";

@Entity("kanban_board_release_tasks")
export class KanbanBoardReleaseTaskEntity {
	@PrimaryColumn({ name: "release_id", type: "varchar", length: 26 })
	releaseId!: string;

	@PrimaryColumn({ name: "task_id", type: "varchar", length: 26 })
	taskId!: string;

	@ManyToOne(() => KanbanBoardReleaseEntity, (release) => release.tasks, {
		onDelete: "CASCADE",
	})
	@JoinColumn({ name: "release_id" })
	release?: KanbanBoardReleaseEntity;

	@ManyToOne(() => KanbanBoardTaskEntity, { onDelete: "CASCADE" })
	@JoinColumn({ name: "task_id" })
	task?: KanbanBoardTaskEntity;

	@Index()
	@Column({ name: "theme_id", type: "varchar", length: 26, nullable: true })
	themeId!: string | null;

	@ManyToOne(() => KanbanBoardReleaseThemeEntity, (theme) => theme.tasks, {
		onDelete: "SET NULL",
	})
	@JoinColumn({ name: "theme_id" })
	theme?: KanbanBoardReleaseThemeEntity | null;

	@Column({ type: "int", default: 0 })
	position!: number;
}
