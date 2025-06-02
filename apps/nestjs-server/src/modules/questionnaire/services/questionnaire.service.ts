import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { QuestionnaireItem } from "../entities/questionnaire-item.entity";

@Injectable()
export class QuestionnaireService {
	constructor(
		@InjectRepository(QuestionnaireItem)
		private questionnaireItemRepository: Repository<QuestionnaireItem>,
	) {}

	async findAll(): Promise<QuestionnaireItem[]> {
		return this.questionnaireItemRepository.find();
	}

	async findOneByCode(code: string): Promise<QuestionnaireItem> {
		const item = await this.questionnaireItemRepository.findOne({
			where: { code },
		});
		if (!item) {
			throw new Error(`QuestionnaireItem with code ${code} not found`);
		}
		return item;
	}
}
