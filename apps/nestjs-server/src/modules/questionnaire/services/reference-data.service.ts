import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ReferenceDataDto } from "../dto/response/reference-data.dto";
import { ArtefactValueEntity } from "../entities/artefact-value.entity";

@Injectable()
export class ReferenceDataService {
	constructor(
		@InjectRepository(ArtefactValueEntity)
		private readonly artefactValueRepo: Repository<ArtefactValueEntity>,
	) {}

	async getReferenceData(): Promise<ReferenceDataDto> {
		const [departments, streamExecutors] = await Promise.all([
			this.artefactValueRepo.find({
				where: { artefact_id: 6, is_active_flg: "1" },
				select: ["artefact_value"],
			}),
			this.artefactValueRepo.find({
				where: { artefact_id: 7, is_active_flg: "1" },
				select: ["artefact_value"],
			}),
		]);

		return {
			department: departments.map((item) => item.artefact_value),
			streamExecutor: streamExecutors.map((item) => item.artefact_value),
		};
	}
}
