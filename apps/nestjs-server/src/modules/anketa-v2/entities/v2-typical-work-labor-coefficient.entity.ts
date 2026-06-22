import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity({ name: "v2_typical_work_labor_coefficient" })
@Index(["workId", "streamExecutor"])
export class V2TypicalWorkLaborCoefficientEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ name: "work_id", type: "uuid" })
	workId: string;

	@Column({ name: "stream_executor", type: "varchar", length: 120 })
	streamExecutor: string;

	@Column({ name: "param_code", type: "varchar", length: 120 })
	paramCode: string;

	@Column({ name: "param_name", type: "varchar", length: 255, nullable: true })
	paramName: string | null;

	@Column({ name: "value_code", type: "varchar", length: 120, nullable: true })
	valueCode: string | null;

	@Column({ name: "value_label", type: "varchar", length: 255, nullable: true })
	valueLabel: string | null;

	@Column({ type: "decimal", precision: 10, scale: 2, default: 1 })
	coefficient: string;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt: Date;
}
