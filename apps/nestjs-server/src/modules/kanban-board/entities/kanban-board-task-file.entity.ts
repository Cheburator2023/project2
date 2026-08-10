import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "kanban_board_task_files" })
export class KanbanBoardTaskFileEntity {
	@PrimaryColumn({ type: "varchar", length: 26 })
	id: string;

	@Column({ name: "task_id", type: "varchar", length: 26 })
	taskId: string;

	@Column({ name: "original_name", type: "varchar", length: 255 })
	originalName: string;

	@Column({ name: "mime_type", type: "varchar", length: 128 })
	mimeType: string;

	@Column({ name: "byte_size", type: "int" })
	byteSize: number;

	@Column({ name: "storage_path", type: "varchar", length: 512 })
	storagePath: string;

	@Column({ name: "file_data", type: "bytea", nullable: true })
	fileData: Buffer | null;

	@Column({ name: "created_at", type: "varchar", length: 64 })
	createdAt: string;
}
