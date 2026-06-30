import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity({ name: "v2_typical_work_assignment" })
@Index(["workId", "streamExecutor"], { unique: true })
export class V2TypicalWorkAssignmentEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ name: "work_id", type: "uuid" })
	workId: string;

	@Column({ name: "stream_executor", type: "varchar", length: 120 })
	streamExecutor: string;

	@Column({ name: "is_active", type: "boolean", default: true })
	isActive: boolean;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt: Date;
}
