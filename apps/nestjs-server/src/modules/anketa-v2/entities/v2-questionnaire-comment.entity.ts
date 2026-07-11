import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryColumn,
} from "typeorm";

@Entity({ name: "v2_questionnaire_comments" })
export class V2QuestionnaireCommentEntity {
	@PrimaryColumn({ type: "varchar", length: 26 })
	id!: string;

	@Index()
	@Column({ name: "questionnaire_id", type: "uuid" })
	questionnaireId!: string;

	@Index()
	@Column({ name: "parent_comment_id", type: "varchar", length: 26, nullable: true })
	parentCommentId!: string | null;

	@Column({ type: "text" })
	body!: string;

	@Column({ name: "author_name", type: "varchar", length: 255 })
	authorName!: string;

	@Column({ name: "is_anketa_author", type: "boolean", default: false })
	isAnketaAuthor!: boolean;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt!: Date;
}
