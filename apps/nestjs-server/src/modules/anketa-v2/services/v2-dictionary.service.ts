import {
	Injectable,
	NotFoundException,
	ConflictException,
	BadRequestException,
	Inject,
	forwardRef,
	Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import {
	V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE,
	isValidImplementationStreamCodeFormat,
	isV2ImplementationStreamCode,
	parseImplementationStreamPayload,
} from "@smart-anketa/api-contract";
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
	BulkV2DictionaryJsonResponseDto,
	V2DictionaryBulkFailureDto,
	V2DictionaryFieldUsageDto,
	V2DictionaryJsonSnapshotDto,
} from "@smart-anketa/api-contract";
import type {
	CreateV2DictionaryDto,
	UpdateV2DictionaryDto,
	CreateV2DictionaryItemDto,
	UpdateV2DictionaryItemDto,
} from "../dto";
import { V2StreamCatalogService } from "./v2-stream-catalog.service";

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
		@Optional()
		@Inject(forwardRef(() => V2StreamCatalogService))
		private readonly streamCatalog?: V2StreamCatalogService,
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

		const saved = await this.dictionaryRepository.save(dictionary);
		this.invalidateStreamCatalogIfNeeded(dictionary.code);
		return saved;
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

		const normalized = this.normalizeStreamItemDto(dictionary.code, dto);

		// Проверяем уникальность кода в пределах словаря
		const existing = await this.itemRepository.findOne({
			where: { dictionaryId, code: normalized.code },
		});

		if (existing) {
			throw new ConflictException(
				`Item with code ${normalized.code} already exists in this dictionary`,
			);
		}

		const item = this.itemRepository.create({
			dictionaryId,
			...normalized,
		});

		const saved = await this.itemRepository.save(item);
		this.invalidateStreamCatalogIfNeeded(dictionary.code);
		return saved;
	}

	async updateItem(
		id: string,
		dto: UpdateV2DictionaryItemDto,
	): Promise<V2DictionaryItemEntity> {
		const item = await this.findItem(id);
		const dictionary = await this.dictionaryRepository.findOne({
			where: { id: item.dictionaryId },
		});
		const dictCode = dictionary?.code ?? "";

		if (dictCode === V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE) {
			const nextLabel =
				typeof dto.label === "string" ? dto.label : item.label;
			const nextPayload = parseImplementationStreamPayload(
				dto.payload !== undefined ? dto.payload : item.payload,
				{ label: nextLabel, code: item.code },
			);
			Object.assign(item, {
				...dto,
				payload: nextPayload,
			});
		} else {
			Object.assign(item, dto);
		}

		const saved = await this.itemRepository.save(item);
		this.invalidateStreamCatalogIfNeeded(dictCode);
		return saved;
	}

	async deleteItem(id: string): Promise<void> {
		const item = await this.findItem(id);
		const dictionary = await this.dictionaryRepository.findOne({
			where: { id: item.dictionaryId },
		});
		if (
			dictionary?.code === V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE &&
			isV2ImplementationStreamCode(item.code)
		) {
			throw new ConflictException(
				"Заводской стрим нельзя удалить. Можно отключить (Активен = нет).",
			);
		}
		await this.itemRepository.remove(item);
		this.invalidateStreamCatalogIfNeeded(dictionary?.code ?? "");
	}

	private invalidateStreamCatalogIfNeeded(dictionaryCode: string): void {
		if (dictionaryCode === V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE) {
			this.streamCatalog?.invalidate();
		}
	}

	private normalizeStreamItemDto(
		dictionaryCode: string,
		dto: CreateV2DictionaryItemDto,
	): CreateV2DictionaryItemDto {
		if (dictionaryCode !== V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE) {
			return dto;
		}
		const code = dto.code.trim().toLowerCase();
		if (!isValidImplementationStreamCodeFormat(code)) {
			throw new BadRequestException(
				"Код стрима: 1–6 символов [a-z0-9] (например rb, kmbkcb)",
			);
		}
		const label = dto.label.trim();
		if (!label) {
			throw new BadRequestException("Подпись стрима обязательна");
		}
		return {
			...dto,
			code,
			label,
			payload: parseImplementationStreamPayload(dto.payload, { label, code }),
		};
	}

	async getDictionaryAsJson(code: string): Promise<Record<string, unknown>> {
		const dictionary = await this.findByCode(code);

		const items = await this.itemRepository.find({
			where: { dictionaryId: dictionary.id, isActive: true },
			order: { order: "ASC", code: "ASC" },
		});

		return this.toDictionaryJsonSnapshot(dictionary, items);
	}

	async getDictionariesAsJsonBulk(
		codes: string[],
	): Promise<BulkV2DictionaryJsonResponseDto> {
		const uniqueCodes = [
			...new Set(
				codes
					.filter((code) => typeof code === "string")
					.map((code) => code.trim())
					.filter(Boolean),
			),
		];
		if (uniqueCodes.length === 0) return {};

		const dictionaries = await this.dictionaryRepository.find({
			where: { code: In(uniqueCodes) },
		});
		if (dictionaries.length === 0) return {};

		const dictionaryIds = dictionaries.map((dictionary) => dictionary.id);
		const items = await this.itemRepository.find({
			where: { dictionaryId: In(dictionaryIds), isActive: true },
			order: { order: "ASC", code: "ASC" },
		});

		const itemsByDictionaryId = new Map<string, V2DictionaryItemEntity[]>();
		for (const item of items) {
			const bucket = itemsByDictionaryId.get(item.dictionaryId) ?? [];
			bucket.push(item);
			itemsByDictionaryId.set(item.dictionaryId, bucket);
		}

		const result: BulkV2DictionaryJsonResponseDto = {};
		for (const dictionary of dictionaries) {
			result[dictionary.code] = this.toDictionaryJsonSnapshot(
				dictionary,
				itemsByDictionaryId.get(dictionary.id) ?? [],
			);
		}

		return result;
	}

	private toDictionaryJsonSnapshot(
		dictionary: Pick<V2DictionaryEntity, "code" | "name">,
		items: V2DictionaryItemEntity[],
	): V2DictionaryJsonSnapshotDto {
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
