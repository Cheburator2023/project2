import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Calculation {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column()
	name: string;

	@Column({ type: "jsonb" })
	questionnaireData: Record<string, any>;

	@Column({ type: "float" })
	finalCoefficient: number;

	@Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
	createdAt: Date;
}
