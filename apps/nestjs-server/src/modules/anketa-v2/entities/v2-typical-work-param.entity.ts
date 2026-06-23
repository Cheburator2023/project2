import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";
import { V2TypicalWorkParamValueEntity } from "./v2-typical-work-param-value.entity";

@Entity({ name: "v2_typical_work_param" })
export class V2TypicalWorkParamEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Index({ unique: true })
	@Column({ type: "varchar", length: 120, nullable: false })
	code: string;

	@Column({ type: "varchar", length: 255, nullable: false })
	name: string;

	@Column({ type: "text", nullable: true })
	description: string | null;

	@OneToMany(() => V2TypicalWorkParamValueEntity, (value) => value.param)
	values?: V2TypicalWorkParamValueEntity[];

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt: Date;
}
