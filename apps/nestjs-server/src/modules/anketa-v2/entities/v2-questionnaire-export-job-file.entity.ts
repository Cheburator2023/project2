import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { V2QuestionnaireExportJobEntity } from "./v2-questionnaire-export-job.entity";

@Entity({ name: "v2_questionnaire_export_job_file" })
export class V2QuestionnaireExportJobFileEntity {
	@PrimaryColumn({ name: "job_id", type: "uuid" })
	jobId: string;

	@OneToOne(() => V2QuestionnaireExportJobEntity, { onDelete: "CASCADE" })
	@JoinColumn({ name: "job_id" })
	job?: V2QuestionnaireExportJobEntity;

	@Column({ type: "varchar", length: 255 })
	filename: string;

	@Column({ name: "size_bytes", type: "int" })
	sizeBytes: number;
}
