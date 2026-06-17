import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity({ name: "v2_typical_work_norm" })
@Index(["workId", "streamExecutor"])
export class V2TypicalWorkNormEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ name: "work_id", type: "uuid" })
	workId: string;

	@Column({ name: "stream_executor", type: "varchar", length: 120 })
	streamExecutor: string;

	@Column({ name: "norm_value", type: "decimal", precision: 10, scale: 2 })
	normValue: string;

	@Column({ name: "valid_from", type: "date" })
	validFrom: string;

	@Column({ name: "valid_to", type: "date", nullable: true })
	validTo: string | null;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt: Date;
}
