import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { CalculationQuestionnaireDataDto } from "../dto/response/calculation-response.dto";

@Entity()
export class Calculation {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ type: "varchar", length: 255, nullable: false })
	name: string;

	@Column({ type: "varchar", length: 255, nullable: true })
	rfd: string;

	@Column({ type: "varchar", length: 255, nullable: true })
	streamExecutor: string;

	@Column({ type: "jsonb", nullable: true })
	department: string[];

	@Column({ type: "varchar", length: 255, nullable: true })
	customerName: string;

	@Column({ type: "varchar", length: 255, nullable: true })
	comment: string;

    @Column({
        type: "jsonb",
        nullable: false,
        transformer: {
            to: (value: CalculationQuestionnaireDataDto) => value,
            from: (value: any) => {
                if (value.generalUncertainty && !Array.isArray(value.generalUncertainty)) {
                    value.generalUncertainty = Object.entries(value.generalUncertainty)
                        .map(([type, val]) => ({
                            type,
                            ...(val as any)
                        }));
                }
                return value as CalculationQuestionnaireDataDto;
            }
        }
    })
    questionnaireData: CalculationQuestionnaireDataDto;

	@Column({ type: "float", nullable: false })
	finalCoefficient: number;

	@Column({
		type: "timestamp",
		default: () => "CURRENT_TIMESTAMP",
		nullable: false,
	})
	createdAt: Date;

	@Column({ type: "varchar", length: 255, nullable: true })
	author: string;
}
