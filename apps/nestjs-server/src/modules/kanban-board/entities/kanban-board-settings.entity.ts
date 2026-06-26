import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

export const KANBAN_BOARD_SETTINGS_DEFAULT_ID = "default";

@Entity("kanban_board_settings")
export class KanbanBoardSettingsEntity {
	@PrimaryColumn("varchar", { length: 32 })
	id!: string;

	@Column({
		name: "default_sprint_capacity_pd",
		type: "numeric",
		precision: 6,
		scale: 2,
		default: 9,
	})
	defaultSprintCapacityPd!: string;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt!: Date;
}
