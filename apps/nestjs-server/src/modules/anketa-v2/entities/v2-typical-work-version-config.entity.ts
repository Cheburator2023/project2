import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity({ name: "v2_typical_work_version_config" })
@Index(["templateVersionId", "workId", "streamExecutor"], { unique: true })
export class V2TypicalWorkVersionConfigEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ name: "template_version_id", type: "uuid" })
	templateVersionId: string;

	@Column({ name: "work_id", type: "uuid" })
	workId: string;

	@Column({ name: "stream_executor", type: "varchar", length: 120, default: "" })
	streamExecutor: string;

	@Column({ type: "jsonb", default: [] })
	formula: unknown;

	@Column({ name: "formula_text", type: "varchar", length: 500, nullable: true })
	formulaText: string | null;

	@Column({ name: "rounding_mode", type: "varchar", length: 20, default: "CEIL" })
	roundingMode: string;

	@Column({
		name: "rounding_step",
		type: "decimal",
		precision: 10,
		scale: 4,
		nullable: true,
	})
	roundingStep: string | null;

	@Column({ name: "calculation_logic", type: "jsonb", nullable: true })
	calculationLogic: unknown;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt: Date;
}
