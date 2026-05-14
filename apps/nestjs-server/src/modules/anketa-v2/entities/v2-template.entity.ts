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
import { V2TemplateVersionEntity } from "./v2-template-version.entity";

@Entity({ name: "v2_template" })
export class V2TemplateEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Index({ unique: true })
	@Column({ type: "varchar", length: 100, nullable: false })
	code: string;

	@Column({ type: "varchar", length: 255, nullable: false })
	name: string;

	@Column({ type: "text", nullable: true })
	description: string | null;

	@Column({ name: "stream_code", type: "varchar", length: 100, nullable: true })
	streamCode: string | null;

	@Column({ name: "current_version_id", type: "uuid", nullable: true })
	currentVersionId: string | null;

	@ManyToOne(() => V2TemplateVersionEntity, { nullable: true })
	@JoinColumn({ name: "current_version_id" })
	currentVersion?: V2TemplateVersionEntity | null;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt: Date;

	@Column({ name: "created_by", type: "varchar", length: 255, nullable: true })
	createdBy: string | null;

	@Column({ name: "updated_by", type: "varchar", length: 255, nullable: true })
	updatedBy: string | null;
}
