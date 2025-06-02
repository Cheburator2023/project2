import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Calculation } from "../../calculation/entities/calculation.entity";

@Entity()
export class User {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ unique: true })
	email: string;

	@Column()
	password: string;

	@Column({ type: "enum", enum: ["admin", "ds_lead", "business_user"] })
	role: string;

	@OneToMany(
		() => Calculation,
		(calculation) => calculation.author,
	)
	calculations: Calculation[];
}
