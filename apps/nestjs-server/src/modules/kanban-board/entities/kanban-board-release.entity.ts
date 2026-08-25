import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	OneToMany,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import type {
	KanbanBoardReleaseImageVersions,
	KanbanBoardReleaseStatusId,
} from "@smart-anketa/api-contract";
import { KanbanBoardSprintEntity } from "./kanban-board-sprint.entity";
import { KanbanBoardSupersprintEntity } from "./kanban-board-supersprint.entity";
import { KanbanBoardReleaseTaskEntity } from "./kanban-board-release-task.entity";
import { KanbanBoardPlanningEntity } from "./kanban-board-planning.entity";

@Entity("kanban_board_releases")
export class KanbanBoardReleaseEntity {
	@PrimaryColumn("varchar", { length: 26 })
	id!: string;

	@Column({ type: "varchar", length: 64, unique: true })
	code!: string;

	@Column({ type: "varchar", length: 255 })
	name!: string;

	@Column({ type: "text", nullable: true })
	description!: string | null;

	@Column({ type: "varchar", length: 32, default: "draft" })
	status!: KanbanBoardReleaseStatusId;

	@Index()
	@Column({
		name: "supersprint_id",
		type: "varchar",
		length: 26,
		nullable: true,
	})
	supersprintId!: string | null;

	@ManyToOne(() => KanbanBoardSupersprintEntity, { onDelete: "SET NULL" })
	@JoinColumn({ name: "supersprint_id" })
	supersprint?: KanbanBoardSupersprintEntity | null;

	@Index()
	@Column({ name: "sprint_id", type: "varchar", length: 26, nullable: true })
	sprintId!: string | null;

	@ManyToOne(() => KanbanBoardSprintEntity, { onDelete: "SET NULL" })
	@JoinColumn({ name: "sprint_id" })
	sprint?: KanbanBoardSprintEntity | null;

	@Column({ name: "start_date", type: "date", nullable: true })
	startDate!: string | null;

	@Column({ name: "end_date", type: "date", nullable: true })
	endDate!: string | null;

	@Index()
	@Column({ name: "planning_id", type: "varchar", length: 26, nullable: true })
	planningId!: string | null;

	@ManyToOne(() => KanbanBoardPlanningEntity, (planning) => planning.releases, {
		onDelete: "SET NULL",
	})
	@JoinColumn({ name: "planning_id" })
	planning?: KanbanBoardPlanningEntity | null;

	@Column({
		name: "image_versions",
		type: "jsonb",
		default: () => "'{}'::jsonb",
	})
	imageVersions!: KanbanBoardReleaseImageVersions;

	@OneToMany(() => KanbanBoardReleaseTaskEntity, (item) => item.release)
	tasks?: KanbanBoardReleaseTaskEntity[];

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt!: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt!: Date;
}
