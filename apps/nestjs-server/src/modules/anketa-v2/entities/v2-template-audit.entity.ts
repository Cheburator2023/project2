import type { V2TemplateAuditAction } from "@smart-anketa/api-contract";
import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "v2_template_audit" })
export class V2TemplateAuditEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Index()
	@Column({ name: "template_id", type: "uuid", nullable: false })
	templateId: string;

	@Index()
	@Column({ name: "version_id", type: "uuid", nullable: true })
	versionId: string | null;

	@Column({ type: "varchar", length: 64, nullable: false })
	action: V2TemplateAuditAction;

	@Column({ type: "jsonb", nullable: true })
	payload: Record<string, unknown> | null;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt: Date;

	@Column({ name: "created_by", type: "varchar", length: 255, nullable: true })
	createdBy: string | null;
}
