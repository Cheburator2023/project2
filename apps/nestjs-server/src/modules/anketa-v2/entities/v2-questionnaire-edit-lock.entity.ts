import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "v2_questionnaire_edit_locks" })
export class V2QuestionnaireEditLockEntity {
	@PrimaryColumn({ name: "questionnaire_id", type: "uuid" })
	questionnaireId!: string;

	@Column({ name: "locked_by_label", type: "varchar", length: 255 })
	lockedByLabel!: string;

	@Column({
		name: "locked_by_user_id",
		type: "varchar",
		length: 128,
		nullable: true,
	})
	lockedByUserId!: string | null;

	@Column({ name: "expires_at", type: "timestamptz" })
	expiresAt!: Date;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt!: Date;
}
