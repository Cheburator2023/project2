import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity({ name: "v2_typical_work_labor_param" })
@Index(["workId", "streamExecutor", "paramCode"], { unique: true })
export class V2TypicalWorkLaborParamEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ name: "work_id", type: "uuid" })
	workId: string;

	@Column({ name: "stream_executor", type: "varchar", length: 120 })
	streamExecutor: string;

	@Column({
		name: "schema_field_uid",
		type: "varchar",
		length: 80,
		nullable: true,
	})
	schemaFieldUid: string | null;

	@Column({ name: "param_code", type: "varchar", length: 120 })
	paramCode: string;

	@Column({ name: "param_name", type: "varchar", length: 255, nullable: true })
	paramName: string | null;

	@Column({ type: "varchar", length: 20, default: "by_value" })
	kind: string;

	@Column({ name: "any_of_value_codes", type: "jsonb", nullable: true })
	anyOfValueCodes: string[] | null;

	@Column({ name: "any_of_value_labels", type: "jsonb", nullable: true })
	anyOfValueLabels: string[] | null;

	@Column({
		name: "coeff_on",
		type: "decimal",
		precision: 10,
		scale: 2,
		nullable: true,
	})
	coeffOn: string | null;

	@Column({
		name: "coeff_off",
		type: "decimal",
		precision: 10,
		scale: 2,
		nullable: true,
	})
	coeffOff: string | null;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt: Date;
}
