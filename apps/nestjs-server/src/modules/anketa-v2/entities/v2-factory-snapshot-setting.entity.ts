import {
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import type { V2FactorySnapshotSource } from "@smart-anketa/api-contract";
import { V2TemplateEntity } from "./v2-template.entity";
import { V2TemplateVersionEntity } from "./v2-template-version.entity";

@Entity({ name: "v2_factory_snapshot_setting" })
export class V2FactorySnapshotSettingEntity {
	@PrimaryColumn({ type: "smallint", default: 1 })
	id: number;

	@Column({ type: "varchar", length: 20, default: "builtin" })
	source: V2FactorySnapshotSource;

	@Column({ name: "template_id", type: "uuid", nullable: true })
	templateId: string | null;

	@ManyToOne(() => V2TemplateEntity, { nullable: true, onDelete: "SET NULL" })
	@JoinColumn({ name: "template_id" })
	template?: V2TemplateEntity | null;

	@Column({ name: "version_id", type: "uuid", nullable: true })
	versionId: string | null;

	@ManyToOne(() => V2TemplateVersionEntity, {
		nullable: true,
		onDelete: "SET NULL",
	})
	@JoinColumn({ name: "version_id" })
	version?: V2TemplateVersionEntity | null;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt: Date;

	@Column({ name: "updated_by", type: "varchar", length: 255, nullable: true })
	updatedBy: string | null;
}
