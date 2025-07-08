import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("stream_average")
export class StreamAverageEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ type: "varchar", length: 100, unique: true })
	epicName: string;

	@Column({ type: "float" })
	averageValue: number;

	@Column({ type: "text", nullable: true })
	description?: string;

	@Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
	createdAt: Date;

	@Column({
		type: "timestamp",
		default: () => "CURRENT_TIMESTAMP",
		onUpdate: "CURRENT_TIMESTAMP",
	})
	updatedAt: Date;
}
