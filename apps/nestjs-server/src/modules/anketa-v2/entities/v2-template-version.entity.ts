import type {
	V2DictionariesSnapshotDto,
	V2JsonSchemaDto,
	V2LogicGraphDto,
	V2TemplateStatus,
	V2UiSchemaDto,
} from "@smart-anketa/api-contract";
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
import { V2TemplateEntity } from "./v2-template.entity";

@Entity({ name: "v2_template_version" })
@Index("uq_v2_template_version_number", ["templateId", "versionNumber"], {
	unique: true,
})
export class V2TemplateVersionEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Index()
	@Column({ name: "template_id", type: "uuid", nullable: false })
	templateId: string;

	@ManyToOne(() => V2TemplateEntity, { nullable: false, onDelete: "CASCADE" })
	@JoinColumn({ name: "template_id" })
	template?: V2TemplateEntity;

	@Column({ name: "version_number", type: "integer", nullable: false })
	versionNumber: number;

	@Index()
	@Column({
		type: "enum",
		enum: ["draft", "published", "archived"],
		default: "draft",
	})
	status: V2TemplateStatus;

	@Column({ name: "json_schema", type: "jsonb", nullable: false, default: () => "'{}'::jsonb" })
	jsonSchema: V2JsonSchemaDto;

	@Column({ name: "ui_schema", type: "jsonb", nullable: false, default: () => "'{}'::jsonb" })
	uiSchema: V2UiSchemaDto;

	@Column({ type: "jsonb", nullable: false, default: () => `'{"rules":[]}'::jsonb` })
	logic: V2LogicGraphDto;

	@Column({ name: "dictionaries_snapshot", type: "jsonb", nullable: true })
	dictionariesSnapshot: V2DictionariesSnapshotDto | null;

	@Column({ name: "release_notes", type: "text", nullable: true })
	releaseNotes: string | null;

	@Column({ name: "parent_version_id", type: "uuid", nullable: true })
	parentVersionId: string | null;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt: Date;

	@Column({ name: "published_at", type: "timestamptz", nullable: true })
	publishedAt: Date | null;

	@Column({ name: "created_by", type: "varchar", length: 255, nullable: true })
	createdBy: string | null;
}
