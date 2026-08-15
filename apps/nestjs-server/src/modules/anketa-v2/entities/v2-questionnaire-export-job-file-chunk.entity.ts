import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "v2_questionnaire_export_job_file_chunk" })
export class V2QuestionnaireExportJobFileChunkEntity {
	@PrimaryColumn({ name: "job_id", type: "uuid" })
	jobId: string;

	@PrimaryColumn({ name: "chunk_index", type: "int" })
	chunkIndex: number;

	@Column({ type: "bytea" })
	content: Buffer;
}
