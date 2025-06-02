import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../../auth/entities/user.entity";

@Entity()
export class Calculation {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column()
	name: string;

	@Column({ type: "jsonb" })
	questionnaireData: Record<string, any>;

	@ManyToOne(
		() => User,
		(user) => user.calculations,
	)
	author: User;
}
