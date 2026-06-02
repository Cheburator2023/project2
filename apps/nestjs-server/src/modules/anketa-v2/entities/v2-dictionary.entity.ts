import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity({ name: "v2_dictionary" })
export class V2DictionaryEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Index({ unique: true })
	@Column({ type: "varchar", length: 100, nullable: false })
	code: string;

	@Column({ type: "varchar", length: 255, nullable: false })
	name: string;

	@Column({ type: "varchar", length: 100, nullable: true })
	category: string | null;

	@Column({ type: "text", nullable: true })
	description: string | null;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt: Date;
}
