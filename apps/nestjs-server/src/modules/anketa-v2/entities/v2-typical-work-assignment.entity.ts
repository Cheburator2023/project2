import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity({ name: "v2_typical_work_assignment" })
@Index(["workId", "streamExecutor"], { unique: true })
export class V2TypicalWorkAssignmentEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ name: "work_id", type: "uuid" })
	workId: string;

	@Column({ name: "stream_executor", type: "varchar", length: 120 })
	streamExecutor: string;

	@Column({ name: "is_active", type: "boolean", default: true })
	isActive: boolean;

	@Column({
		name: "trigger_arch_count_kind",
		type: "varchar",
		length: 40,
		nullable: true,
	})
	triggerArchCountKind: string | null;

	@Column({ name: "trigger_arch_count_steps", type: "jsonb", nullable: true })
	triggerArchCountSteps: Array<{ count: number; coefficient: number }> | null;

	@Column({
		name: "trigger_arch_count_combinator",
		type: "varchar",
		length: 3,
		default: "and",
	})
	triggerArchCountCombinator: string;

	@Column({ name: "trigger_mode", type: "varchar", length: 20, default: "simple" })
	triggerMode: string;

	@Column({ name: "trigger_formula", type: "jsonb", nullable: true })
	triggerFormula: {
		tokens: unknown[];
		text: string;
	} | null;

	@Column({ name: "labor_arch_counts", type: "jsonb", nullable: true })
	laborArchCounts: Array<{
		kind: string;
		paramName?: string | null;
		steps: Array<{ count: number; coefficient: number }>;
	}> | null;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt: Date;
}
