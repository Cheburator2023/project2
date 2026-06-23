import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";
import { V2TypicalWorkParamEntity } from "./v2-typical-work-param.entity";

@Entity({ name: "v2_typical_work_param_value" })
@Index("uq_v2_typical_work_param_value_code", ["paramId", "code"], {
	unique: true,
})
export class V2TypicalWorkParamValueEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Index()
	@Column({ name: "param_id", type: "uuid", nullable: false })
	paramId: string;

	@ManyToOne(() => V2TypicalWorkParamEntity, (param) => param.values, {
		nullable: false,
		onDelete: "CASCADE",
	})
	@JoinColumn({ name: "param_id" })
	param?: V2TypicalWorkParamEntity;

	@Column({ type: "varchar", length: 120, nullable: false })
	code: string;

	@Column({ type: "varchar", length: 500, nullable: false })
	label: string;

	@Column({ type: "numeric", precision: 10, scale: 2, nullable: true })
	coefficient: string | null;

	@Column({ name: "sort_order", type: "integer", nullable: false, default: 0 })
	sortOrder: number;

	@Column({ name: "valid_from", type: "date", nullable: false })
	validFrom: string;

	@Column({ name: "valid_to", type: "date", nullable: true })
	validTo: string | null;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt: Date;
}
