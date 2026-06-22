import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity({ name: "v2_typical_work_rule" })
@Index(["workId", "streamExecutor"])
export class V2TypicalWorkRuleEntity {
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

	@Column({ type: "varchar", length: 10, default: "=" })
	operator: string;

	@Column({ name: "value_code", type: "varchar", length: 120, nullable: true })
	valueCode: string | null;

	@Column({ name: "value_label", type: "varchar", length: 255, nullable: true })
	valueLabel: string | null;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt: Date;
}
