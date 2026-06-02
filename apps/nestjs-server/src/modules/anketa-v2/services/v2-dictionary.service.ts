import {
	Injectable,
	NotFoundException,
	ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { V2DictionaryEntity } from "../entities/v2-dictionary.entity";
import { V2DictionaryItemEntity } from "../entities/v2-dictionary-item.entity";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";
import {
	findV2DefaultDictionaryDef,
	isV2DefaultDictionaryCode,
} from "../constants/v2-default-dictionary-codes";
import {
	collectAllDictionaryCodesInUse,
	findDictionaryFieldUsagesInVersion,
} from "../utils/v2-schema-dictionary.util";
import type {
	BulkDeleteV2DictionariesResultDto,
	BulkResetV2DictionariesResultDto,
	V2DictionaryBulkFailureDto,
	V2DictionaryFieldUsageDto,
} from "@smart-anketa/api-contract";
import type {
	CreateV2DictionaryDto,
	UpdateV2DictionaryDto,
	CreateV2DictionaryItemDto,
	UpdateV2DictionaryItemDto,
} from "../dto";

export type V2DictionaryWithMeta = V2DictionaryEntity & {
	isDefault: boolean;
	isInUse: boolean;
};

@Injectable()
export class V2DictionaryService {
	constructor(
		@InjectRepository(V2DictionaryEntity)
		private readonly dictionaryRepository: Repository<V2DictionaryEntity>,
		@InjectRepository(V2DictionaryItemEntity)
		private readonly itemRepository: Repository<V2DictionaryItemEntity>,
		@InjectRepository(V2TemplateVersionEntity)
		private readonly versionRepository: Repository<V2TemplateVersionEntity>,
	) {}

	async findAll(): Promise<V2DictionaryEntity[]> {
		return this.dictionaryRepository.find({
			order: { code: "ASC" },
		});
	}

	private async getDictionaryCodesInUse(): Promise<Set<string>> {
		const versions = await this.versionRepository.find({
			select: ["id", "uiSchema"],
		});
		return collectAllDictionaryCodesInUse(versions);
	}

	async findAllWithMeta(): Promise<V2DictionaryWithMeta[]> {
		const [dictionaries, codesInUse] = await Promise.all([
			this.findAll(),
			this.getDictionaryCodesInUse(),
		]);

		return dictionaries.map((d) => ({
			...d,
			isDefault: isV2DefaultDictionaryCode(d.code),
			isInUse: codesInUse.has(d.code),
		}));
	}

	private async assertDeletable(
		dictionary: V2DictionaryEntity,
		codesInUse: Set<string>,
	): Promise<V2DictionaryBulkFailureDto | null> {
		if (isV2DefaultDictionaryCode(dictionary.code)) {
			return {
				id: dictionary.id,
				code: dictionary.code,
				reason: "default_dictionary",
				message:
					"Заводской справочник нельзя удалить. Используйте сброс к заводским значениям.",
			};
		}

		if (codesInUse.has(dictionary.code)) {
			const usages = await this.findFieldUsages(dictionary.id);
			const hint =
				usages.length > 0
					? ` Привязан к полям схем (например ${usages[0]!.fieldPointer}).`
					: "";
			return {
				id: dictionary.id,
				code: dictionary.code,
				reason: "in_use",
				message: `Справочник используется в схемах шаблонов и не может быть удалён.${hint}`,
			};
		}

		return null;
	}

	async findOne(id: string): Promise<V2DictionaryEntity> {
		const dictionary = await this.dictionaryRepository.findOne({
			where: { id },
		});

		if (!dictionary) {
			throw new NotFoundException(`Dictionary with id ${id} not found`);
		}

		return dictionary;
	}

	async findByCode(code: string): Promise<V2DictionaryEntity> {
		const dictionary = await this.dictionaryRepository.findOne({
			where: { code },
		});

		if (!dictionary) {
			throw new NotFoundException(`Dictionary with code ${code} not found`);
		}

		return dictionary;
	}

	async create(dto: CreateV2DictionaryDto): Promise<V2DictionaryEntity> {
		const existing = await this.dictionaryRepository.findOne({
			where: { code: dto.code },
		});

		if (existing) {
			throw new ConflictException(
				`Dictionary with code ${dto.code} already exists`,
			);
		}

		const dictionary = this.dictionaryRepository.create(dto);

		return this.dictionaryRepository.save(dictionary);
	}

	async update(
		id: string,
		dto: UpdateV2DictionaryDto,
	): Promise<V2DictionaryEntity> {
		const dictionary = await this.findOne(id);

		Object.assign(dictionary, dto);

		return this.dictionaryRepository.save(dictionary);
	}

	async delete(id: string): Promise<void> {
		const dictionary = await this.findOne(id);
		const codesInUse = await this.getDictionaryCodesInUse();
		const block = await this.assertDeletable(dictionary, codesInUse);

		if (block) {
			throw new ConflictException(block.message);
		}

		await this.dictionaryRepository.remove(dictionary);
	}

	async resetToDefault(id: string): Promise<V2DictionaryEntity> {
		const dictionary = await this.findOne(id);

		if (!isV2DefaultDictionaryCode(dictionary.code)) {
			throw new ConflictException(
				"Сброс доступен только для заводских справочников (код начинается с v2.).",
			);
		}

		const def = findV2DefaultDictionaryDef(dictionary.code);

		if (!def) {
			throw new NotFoundException(
				`Заводское определение для кода ${dictionary.code} не найдено`,
			);
		}

		await this.itemRepository.delete({ dictionaryId: id });

		const items = def.items.map((item) =>
			this.itemRepository.create({
				dictionaryId: id,
				code: item.code,
				label: item.label,
				order: item.order,
				isActive: true,
				parentCode: null,
				payload:
					item.payload ??
					(def.fieldPointer ? { fieldPointer: def.fieldPointer } : null),
			}),
		);

		if (items.length > 0) {
			await this.itemRepository.save(items);
		}

		dictionary.name = def.name;
		dictionary.category = def.category;
		dictionary.description = def.description;

		return this.dictionaryRepository.save(dictionary);
	}

	async bulkDelete(ids: string[]): Promise<BulkDeleteV2DictionariesResultDto> {
		const uniqueIds = [...new Set(ids)];
		const codesInUse = await this.getDictionaryCodesInUse();
		const deletedIds: string[] = [];
		const failed: V2DictionaryBulkFailureDto[] = [];

		for (const id of uniqueIds) {
			let dictionary: V2DictionaryEntity | null = null;

			try {
				dictionary = await this.dictionaryRepository.findOne({
					where: { id },
				});
			} catch {
				dictionary = null;
			}

			if (!dictionary) {
				failed.push({
					id,
					code: null,
					reason: "not_found",
					message: "Справочник не найден",
				});
				continue;
			}

			const block = await this.assertDeletable(dictionary, codesInUse);

			if (block) {
				failed.push(block);
				continue;
			}

			await this.dictionaryRepository.remove(dictionary);
			deletedIds.push(id);
		}

		return { deletedIds, failed };
	}

	async bulkReset(ids: string[]): Promise<BulkResetV2DictionariesResultDto> {
		const uniqueIds = [...new Set(ids)];
		const resetIds: string[] = [];
		const failed: V2DictionaryBulkFailureDto[] = [];

		for (const id of uniqueIds) {
			let dictionary: V2DictionaryEntity | null = null;

			try {
				dictionary = await this.findOne(id);
			} catch (err) {
				if (err instanceof NotFoundException) {
					failed.push({
						id,
						code: null,
						reason: "not_found",
						message: "Справочник не найден",
					});
					continue;
				}
				throw err;
			}

			if (!isV2DefaultDictionaryCode(dictionary.code)) {
				failed.push({
					id: dictionary.id,
					code: dictionary.code,
					reason: "not_default",
					message:
						"Сброс доступен только для заводских справочников. Пользовательские можно удалить, если они не привязаны к схемам.",
				});
				continue;
			}

			try {
				await this.resetToDefault(id);
				resetIds.push(id);
			} catch (err) {
				failed.push({
					id: dictionary.id,
					code: dictionary.code,
					reason: "reset_failed",
					message:
						err instanceof Error ? err.message : "Не удалось выполнить сброс",
				});
			}
		}

		return { resetIds, failed };
	}

	// Методы для работы с элементами словаря

	async findAllItems(dictionaryId: string): Promise<V2DictionaryItemEntity[]> {
		return this.itemRepository.find({
			where: { dictionaryId },
			order: { order: "ASC", code: "ASC" },
		});
	}

	async findItem(id: string): Promise<V2DictionaryItemEntity> {
		const item = await this.itemRepository.findOne({
			where: { id },
			relations: ["dictionary"],
		});

		if (!item) {
			throw new NotFoundException(`Dictionary item with id ${id} not found`);
		}

		return item;
	}

	async createItem(
		dictionaryId: string,
		dto: CreateV2DictionaryItemDto,
	): Promise<V2DictionaryItemEntity> {
		const dictionary = await this.dictionaryRepository.findOne({
			where: { id: dictionaryId },
		});

		if (!dictionary) {
			throw new NotFoundException(
				`Dictionary with id ${dictionaryId} not found`,
			);
		}

		// Проверяем уникальность кода в пределах словаря
		const existing = await this.itemRepository.findOne({
			where: { dictionaryId, code: dto.code },
		});

		if (existing) {
			throw new ConflictException(
				`Item with code ${dto.code} already exists in this dictionary`,
			);
		}

		const item = this.itemRepository.create({
			dictionaryId,
			...dto,
		});

		return this.itemRepository.save(item);
	}

	async updateItem(
		id: string,
		dto: UpdateV2DictionaryItemDto,
	): Promise<V2DictionaryItemEntity> {
		const item = await this.findItem(id);

		Object.assign(item, dto);

		return this.itemRepository.save(item);
	}

	async deleteItem(id: string): Promise<void> {
		const item = await this.findItem(id);

		await this.itemRepository.remove(item);
	}

	async getDictionaryAsJson(code: string): Promise<Record<string, unknown>> {
		const dictionary = await this.findByCode(code);

		const items = await this.itemRepository.find({
			where: { dictionaryId: dictionary.id, isActive: true },
			order: { order: "ASC", code: "ASC" },
		});

		return {
			code: dictionary.code,
			name: dictionary.name,
			items: items.map((item) => ({
				code: item.code,
				label: item.label,
				parentCode: item.parentCode,
				payload: item.payload,
			})),
		};
	}

	async findFieldUsages(dictionaryId: string): Promise<V2DictionaryFieldUsageDto[]> {
		const dictionary = await this.findOne(dictionaryId);
		const versions = await this.versionRepository.find({
			relations: ["template"],
			order: { templateId: "ASC", versionNumber: "DESC" },
		});

		const usages: V2DictionaryFieldUsageDto[] = [];

		for (const version of versions) {
			const template = version.template;
			if (!template) continue;

			const hits = findDictionaryFieldUsagesInVersion(
				version.jsonSchema,
				version.uiSchema ?? {},
				dictionary.code,
			);

			for (const hit of hits) {
				usages.push({
					templateId: template.id,
					templateCode: template.code,
					templateName: template.name,
					versionId: version.id,
					versionNumber: version.versionNumber,
					versionStatus: version.status,
					isCurrentPublished: template.currentVersionId === version.id,
					fieldPointer: hit.fieldPointer,
					fieldTitle: hit.fieldTitle,
				});
			}
		}

		return usages;
	}
}
