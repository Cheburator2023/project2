import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "kanban_board_task_images" })
export class KanbanBoardTaskImageEntity {
	@PrimaryColumn({ type: "varchar", length: 26 })
	id: string;

	@Column({ name: "task_id", type: "varchar", length: 26 })
	taskId: string;

	@Column({ name: "original_name", type: "varchar", length: 255 })
	originalName: string;

	@Column({ name: "mime_type", type: "varchar", length: 64 })
	mimeType: string;

	@Column({ type: "int" })
	width: number;

	@Column({ type: "int" })
	height: number;

	@Column({ name: "full_byte_size", type: "int" })
	fullByteSize: number;

	@Column({ name: "thumb_byte_size", type: "int" })
	thumbByteSize: number;

	@Column({ name: "full_path", type: "varchar", length: 512 })
	fullPath: string;

	@Column({ name: "thumb_path", type: "varchar", length: 512 })
	thumbPath: string;

	@Column({ name: "created_at", type: "varchar", length: 64 })
	createdAt: string;
}
