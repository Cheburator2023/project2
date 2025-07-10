import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("artefact_values")
export class ArtefactValueEntity {
	@PrimaryColumn({ type: "numeric", precision: 38 })
	artefact_value_id: number;

	@Column({ type: "numeric", precision: 38 })
	artefact_id: number;

	@Column({ type: "varchar", length: 4000 })
	artefact_value: string;

	@Column({ type: "varchar", length: 4000, nullable: true })
	artefact_value_label: string;

	@Column({ type: "varchar", length: 1 })
	is_active_flg: string;

    @Column({ type: "numeric", precision: 38, nullable: true })
    artefact_parent_value_id: number | null;
}
