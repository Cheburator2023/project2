import {
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from "typeorm";
import type { CalculationQuestionnaireDataDto } from "../dto/response/calculation-response.dto";

export enum CalculationStatus {
	ACTIVE = "Активная",
	ARCHIVE = "Архивная",
}

@Entity()
export class Calculation {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ type: "varchar", length: 255, nullable: false })
	calcName: string;

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
		type: "enum",
		enum: CalculationStatus,
		default: CalculationStatus.ACTIVE,
	})
	status: CalculationStatus;

	@Column({ type: "varchar", length: 20, nullable: false, default: "1" })
	version: string;

	@Column({ type: "varchar", length: 50, nullable: true })
	seriesId: string | null;

	@Column({ type: "uuid", nullable: true })
	parentCalcId: string | null;

	@ManyToOne(() => Calculation, { nullable: true })
	@JoinColumn({ name: "parentCalcId" })
	parentCalc?: Calculation | null;

	@Column({ type: "varchar", length: 100, nullable: true })
	readableId: string | null;

	@Column({
		type: "jsonb",
		nullable: false,
		transformer: {
			to: (value: CalculationQuestionnaireDataDto) => value,
			from: (value: any) => {
				if (
					value &&
					value?.generalUncertainty &&
					!Array.isArray(value.generalUncertainty)
				) {
					value.generalUncertainty = Object.entries(
						value.generalUncertainty,
					).map(([type, val]) => ({
						type,
						...(val as any),
					}));
				}

				if (value && !Object.hasOwn(value, "modelDeveloped")) {
					value.modelDeveloped = "Нет"; // значение по умолчанию
				}

				return value as CalculationQuestionnaireDataDto;
			},
		},
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
