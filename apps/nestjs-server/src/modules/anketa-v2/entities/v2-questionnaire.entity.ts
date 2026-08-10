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
import type { V2QuestionnaireStatus } from "@smart-anketa/api-contract";
import { V2TemplateEntity } from "./v2-template.entity";
import { V2TemplateVersionEntity } from "./v2-template-version.entity";

@Entity({ name: "v2_questionnaire" })
export class V2QuestionnaireEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ name: "calc_name", type: "varchar", length: 255, nullable: false })
	calcName: string;

	@Column({
		type: "enum",
		enum: ["active", "archived", "inactive"],
		default: "active",
	})
	status: V2QuestionnaireStatus;

	@Column({ type: "varchar", length: 20, nullable: false, default: "1" })
	version: string;

	@Index()
	@Column({ name: "series_id", type: "varchar", length: 50, nullable: false })
	seriesId: string;

	@Column({ name: "parent_questionnaire_id", type: "uuid", nullable: true })
	parentQuestionnaireId: string | null;

	@ManyToOne(() => V2QuestionnaireEntity, { nullable: true })
	@JoinColumn({ name: "parent_questionnaire_id" })
	parentQuestionnaire?: V2QuestionnaireEntity | null;

	@Column({ name: "readable_id", type: "varchar", length: 100, nullable: true })
	readableId: string | null;

	@Column({ name: "template_id", type: "uuid", nullable: false })
	templateId: string;

	@ManyToOne(() => V2TemplateEntity)
	@JoinColumn({ name: "template_id" })
	template?: V2TemplateEntity;

	@Column({ name: "bound_template_version_id", type: "uuid", nullable: false })
	boundTemplateVersionId: string;

	@ManyToOne(() => V2TemplateVersionEntity)
	@JoinColumn({ name: "bound_template_version_id" })
	boundTemplateVersion?: V2TemplateVersionEntity;

	@Column({ name: "form_data", type: "jsonb", nullable: false, default: {} })
	formData: Record<string, unknown>;

	@Column({ name: "final_coefficient", type: "float", nullable: true })
	finalCoefficient: number | null;

	@Column({ type: "varchar", length: 255, nullable: true })
	author: string | null;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt: Date;
}
