import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { V2_DEFAULT_DICTIONARIES } from "../constants/v2-default-template-snapshot";
import { V2DictionaryItemEntity } from "../entities/v2-dictionary-item.entity";
import { V2DictionaryEntity } from "../entities/v2-dictionary.entity";

@Injectable()
export class V2DictionarySeedService implements OnModuleInit {
	private readonly logger = new Logger(V2DictionarySeedService.name);

	constructor(
		@InjectRepository(V2DictionaryEntity)
		private readonly dictionaryRepository: Repository<V2DictionaryEntity>,
		@InjectRepository(V2DictionaryItemEntity)
		private readonly itemRepository: Repository<V2DictionaryItemEntity>,
	) {}

	async onModuleInit(): Promise<void> {
		await this.ensureDefaultDictionaries();
	}

	async ensureDefaultDictionaries(): Promise<void> {
		let created = 0;
		let skipped = 0;

		for (const def of V2_DEFAULT_DICTIONARIES) {
			const existing = await this.dictionaryRepository.findOne({
				where: { code: def.code },
			});

			if (existing) {
				skipped++;
				continue;
			}

			const dictionary = await this.dictionaryRepository.save(
				this.dictionaryRepository.create({
					code: def.code,
					name: def.name,
					description: def.description,
				}),
			);

			const items = def.items.map((item) =>
				this.itemRepository.create({
					dictionaryId: dictionary.id,
					code: item.code,
					label: item.label,
					order: item.order,
					isActive: true,
					parentCode: null,
					payload: { fieldPointer: def.fieldPointer },
				}),
			);

			await this.itemRepository.save(items);
			created++;
		}

		if (created > 0) {
			this.logger.log(
				`Заводские справочники V2: создано ${created}, уже было ${skipped}`,
			);
		}
	}
}
