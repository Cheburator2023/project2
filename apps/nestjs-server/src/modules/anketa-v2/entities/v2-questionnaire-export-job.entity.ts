import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

export const V2_QUESTIONNAIRE_EXPORT_JOB_STATUSES = [
	"pending",
	"processing",
	"done",
	"failed",
] as const;

export type V2QuestionnaireExportJobStatus =
	(typeof V2_QUESTIONNAIRE_EXPORT_JOB_STATUSES)[number];

@Entity({ name: "v2_questionnaire_export_job" })
export class V2QuestionnaireExportJobEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Index()
	@Column({ type: "varchar", length: 16, default: "pending" })
	status: V2QuestionnaireExportJobStatus;

	@Column({ type: "int", default: 0 })
	progress: number;

	@Column({ type: "int", nullable: true })
	total: number | null;

	@Column({ type: "text", nullable: true })
	error: string | null;

	@Column({ name: "requested_ids", type: "jsonb", nullable: true })
	requestedIds: string[] | null;

	@Column({ name: "user_groups", type: "jsonb", nullable: true })
	userGroups: string[] | null;

	@Index()
	@Column({ name: "created_by", type: "varchar", length: 255, nullable: true })
	createdBy: string | null;

	@Column({ type: "varchar", length: 255, nullable: true })
	filename: string | null;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt: Date;
}
