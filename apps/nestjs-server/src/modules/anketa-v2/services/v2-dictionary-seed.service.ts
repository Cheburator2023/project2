import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { V2_ALL_DEFAULT_DICTIONARIES } from "../constants/v2-default-dictionary-codes";
import { isV2DefaultDictionaryCode } from "../constants/v2-default-dictionary-codes";
import {
	buildLegacyFactoryDictionaryCodes,
	isObsoleteFactoryDictionary,
	supersededSchemaDictionaryCodes,
} from "../constants/v2-default-dictionaries.registry";
import {
	V2_DEFAULT_DICTIONARIES,
	V2_DEFAULT_TEMPLATE_SNAPSHOT,
} from "../constants/v2-default-template-snapshot";
import { V2DictionaryItemEntity } from "../entities/v2-dictionary-item.entity";
import { V2DictionaryEntity } from "../entities/v2-dictionary.entity";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";
import { collectAllDictionaryCodesInUse } from "../utils/v2-schema-dictionary.util";

@Injectable()
export class V2DictionarySeedService implements OnModuleInit {
	private readonly logger = new Logger(V2DictionarySeedService.name);

	constructor(
		@InjectRepository(V2DictionaryEntity)
		private readonly dictionaryRepository: Repository<V2DictionaryEntity>,
		@InjectRepository(V2DictionaryItemEntity)
		private readonly itemRepository: Repository<V2DictionaryItemEntity>,
		@InjectRepository(V2TemplateVersionEntity)
		private readonly versionRepository: Repository<V2TemplateVersionEntity>,
	) {}

	async onModuleInit(): Promise<void> {
		await this.removeSupersededDuplicates();
		await this.removeObsoleteFactoryDictionaries();
		await this.ensureDefaultDictionaries();
		await this.syncCorrectedComplexityDictionaryItems();
		await this.syncDefaultMetadata();
	}

	/**
	 * Исправляет две заводские шкалы, которые в старом snapshot были скопированы
	 * от других полей при одинаковом title «Сложность реализации».
	 */
	private async syncCorrectedComplexityDictionaryItems(): Promise<void> {
		const codes = [
			"v2.detailInfo.dataMart.field_46LCnfWo",
			"v2.detailInfo.sourceSystems.items.field_L1lRlgf1",
		];
		for (const code of codes) {
			const def = V2_ALL_DEFAULT_DICTIONARIES.find((item) => item.code === code);
			if (!def) continue;
			const dictionary = await this.dictionaryRepository.findOne({
				where: { code },
			});
			if (!dictionary) continue;
			const existing = await this.itemRepository.find({
				where: { dictionaryId: dictionary.id },
				order: { order: "ASC" },
			});
			const existingLabels = existing.map((item) => item.label);
			const expectedLabels = def.items.map((item) => item.label);
			if (JSON.stringify(existingLabels) === JSON.stringify(expectedLabels)) {
				continue;
			}
			await this.itemRepository.delete({ dictionaryId: dictionary.id });
			await this.itemRepository.save(
				def.items.map((item) =>
					this.itemRepository.create({
						dictionaryId: dictionary.id,
						code: item.code,
						label: item.label,
						order: item.order,
						isActive: true,
						parentCode: null,
						payload: item.payload ?? null,
					}),
				),
			);
			this.logger.log(`Исправлена заводская шкала справочника ${code}`);
		}
	}

	async ensureDefaultDictionaries(): Promise<void> {
		let created = 0;
		let skipped = 0;

		for (const def of V2_ALL_DEFAULT_DICTIONARIES) {
			const existing = await this.dictionaryRepository.findOne({
				where: { code: def.code },
			});

			if (existing) {
				const itemCount = await this.itemRepository.count({
					where: { dictionaryId: existing.id },
				});
				if (itemCount === 0 && def.items.length > 0) {
					await this.itemRepository.save(
						def.items.map((item) =>
							this.itemRepository.create({
								dictionaryId: existing.id,
								code: item.code,
								label: item.label,
								order: item.order,
								isActive: true,
								parentCode: null,
								payload: item.payload ?? null,
							}),
						),
					);
					created++;
				} else {
					skipped++;
				}
				continue;
			}

			const dictionary = await this.dictionaryRepository.save(
				this.dictionaryRepository.create({
					code: def.code,
					name: def.name,
					category: def.category,
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
					payload: item.payload ?? null,
				}),
			);

			if (items.length > 0) {
				await this.itemRepository.save(items);
			}
			created++;
		}

		if (created > 0) {
			this.logger.log(
				`Заводские справочники V2: создано ${created}, уже было ${skipped}`,
			);
		}
	}

	/** Обновляет category/name/description у уже существующих заводских справочников. */
	async syncDefaultMetadata(): Promise<void> {
		for (const def of V2_ALL_DEFAULT_DICTIONARIES) {
			await this.dictionaryRepository.update(
				{ code: def.code },
				{
					category: def.category,
					name: def.name,
					description: def.description,
				},
			);
		}
	}

	/** Удаляет enum-дубли схемы, заменённые методологическими справочниками. */
	async removeSupersededDuplicates(): Promise<void> {
		const versions = await this.versionRepository.find({
			select: ["id", "uiSchema"],
		});
		const codesInUse = collectAllDictionaryCodesInUse(versions);
		const superseded = supersededSchemaDictionaryCodes(
			V2_DEFAULT_TEMPLATE_SNAPSHOT.jsonSchema,
		);
		let removed = 0;

		for (const code of superseded) {
			if (codesInUse.has(code)) continue;

			const dictionary = await this.dictionaryRepository.findOne({
				where: { code },
			});
			if (!dictionary) continue;

			await this.itemRepository.delete({ dictionaryId: dictionary.id });
			await this.dictionaryRepository.remove(dictionary);
			removed++;
		}

		if (removed > 0) {
			this.logger.log(
				`Удалены дубли enum-справочников схемы (заменены методологией): ${removed}`,
			);
		}
	}

	/** Удаляет заводские справочники, не входящие в factory allowlist. */
	async removeObsoleteFactoryDictionaries(): Promise<void> {
		const versions = await this.versionRepository.find({
			select: ["id", "uiSchema"],
		});
		const codesInUse = collectAllDictionaryCodesInUse(versions);
		const legacyCodes = new Set(
			buildLegacyFactoryDictionaryCodes(V2_DEFAULT_DICTIONARIES),
		);
		const dictionaries = await this.dictionaryRepository.find({
			select: ["id", "code", "category", "description"],
		});
		let removed = 0;

		for (const dictionary of dictionaries) {
			if (isV2DefaultDictionaryCode(dictionary.code)) continue;
			if (codesInUse.has(dictionary.code)) continue;
			if (!isObsoleteFactoryDictionary(dictionary, legacyCodes)) {
				continue;
			}

			await this.itemRepository.delete({ dictionaryId: dictionary.id });
			await this.dictionaryRepository.remove(dictionary);
			removed++;
		}

		if (removed > 0) {
			this.logger.log(
				`Удалены заводские справочники вне factory allowlist: ${removed}`,
			);
		}
	}
}
