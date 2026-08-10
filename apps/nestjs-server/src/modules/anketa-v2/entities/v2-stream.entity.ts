import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

/**
 * Реестр стрим-исполнителей (конструктор / runtime / filter).
 * Не связан со справочником формы `v2.generalInfo.implementationStream`.
 */
@Entity({ name: "v2_stream" })
export class V2StreamEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Index({ unique: true })
	@Column({ type: "varchar", length: 100, nullable: false })
	code: string;

	@Column({ type: "varchar", length: 500, nullable: false })
	label: string;

	@Column({ name: "order", type: "integer", nullable: false, default: 0 })
	order: number;

	@Column({ name: "is_active", type: "boolean", nullable: false, default: true })
	isActive: boolean;

	/** Метаданные каталога: dbNames, keycloakAliases, isModelStream, … */
	@Column({ type: "jsonb", nullable: true })
	payload: Record<string, unknown> | null;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt: Date;
}
