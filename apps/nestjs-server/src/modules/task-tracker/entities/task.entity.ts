import { Column, Entity, Index, PrimaryColumn } from "typeorm";
import type { TaskContent } from "@smart-anketa/api-contract";

@Entity("tasks")
export class TaskEntity {
	@PrimaryColumn("varchar", { length: 26 })
	id!: string;

	@Index()
	@Column({ name: "parent_id", type: "varchar", length: 64 })
	parentId!: string;

	@Column({ type: "int" })
	position!: number;

	@Column({ type: "jsonb" })
	content!: TaskContent;

	@Index()
	@Column({ type: "varchar", length: 255 })
	origin!: string;

	@Column({ name: "updated_at", type: "varchar", length: 64 })
	updatedAt!: string;
}
