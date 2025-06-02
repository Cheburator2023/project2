import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { QuestionnaireItem } from "./questionnaire-item.entity";

@Entity()
export class Coefficient {
	@PrimaryGeneratedColumn()
	id: number;

	@Column("decimal", { precision: 5, scale: 2 })
	value: number;

	@Column({ type: "jsonb" })
	conditions: Record<string, any>;

	@ManyToOne(
		() => QuestionnaireItem,
		(item) => item.coefficients,
	)
	questionnaireItem: QuestionnaireItem;
}
