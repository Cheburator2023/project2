import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from "typeorm";
import { V2DictionaryEntity } from "./v2-dictionary.entity";

@Entity({ name: "v2_dictionary_item" })
@Index("uq_v2_dictionary_item_code", ["dictionaryId", "code"], { unique: true })
export class V2DictionaryItemEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Index()
	@Column({ name: "dictionary_id", type: "uuid", nullable: false })
	dictionaryId: string;

	@ManyToOne(() => V2DictionaryEntity, { nullable: false, onDelete: "CASCADE" })
	@JoinColumn({ name: "dictionary_id" })
	dictionary?: V2DictionaryEntity;

	@Column({ type: "varchar", length: 100, nullable: false })
	code: string;

	@Column({ type: "varchar", length: 500, nullable: false })
	label: string;

	@Column({ name: "parent_code", type: "varchar", length: 100, nullable: true })
	parentCode: string | null;

	@Column({ name: "order", type: "integer", nullable: false, default: 0 })
	order: number;

	@Column({ name: "is_active", type: "boolean", nullable: false, default: true })
	isActive: boolean;

	@Column({ type: "jsonb", nullable: true })
	payload: Record<string, unknown> | null;
}
