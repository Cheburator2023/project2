import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity({ name: "v2_typical_work" })
export class V2TypicalWorkEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ type: "varchar", length: 255 })
	name: string;

	@Column({ name: "arch_component_type", type: "varchar", length: 100 })
	archComponentType: string;

	@Column({ name: "work_type", type: "varchar", length: 100, nullable: true })
	workType: string | null;

	@Index({ unique: true })
	@Column({ name: "catalog_key", type: "varchar", length: 160, nullable: true })
	catalogKey: string | null;

	@Index()
	@Column({ name: "template_id", type: "uuid", nullable: true })
	templateId: string | null;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt: Date;
}
