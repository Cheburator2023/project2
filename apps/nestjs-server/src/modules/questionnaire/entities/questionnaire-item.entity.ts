import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Coefficient } from "./coefficient.entity";

@Entity()
export class QuestionnaireItem {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	code: string;

	@Column()
	title: string;

	@Column({ type: "jsonb", nullable: true })
	hints: { text: string; example: string }[];

	@OneToMany(
		() => Coefficient,
		(coefficient) => coefficient.questionnaireItem,
	)
	coefficients: Coefficient[];
}
