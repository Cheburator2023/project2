import {
	Injectable,
	NotFoundException,
	ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { V2DictionaryEntity } from "../entities/v2-dictionary.entity";
import { V2DictionaryItemEntity } from "../entities/v2-dictionary-item.entity";
import type {
	CreateV2DictionaryDto,
	UpdateV2DictionaryDto,
	CreateV2DictionaryItemDto,
	UpdateV2DictionaryItemDto,
} from "../dto";

@Injectable()
export class V2DictionaryService {
	constructor(
		@InjectRepository(V2DictionaryEntity)
		private readonly dictionaryRepository: Repository<V2DictionaryEntity>,
		@InjectRepository(V2DictionaryItemEntity)
		private readonly itemRepository: Repository<V2DictionaryItemEntity>,
	) {}

	async findAll(): Promise<V2DictionaryEntity[]> {
		return this.dictionaryRepository.find({
			order: { code: "ASC" },
		});
	}

	async findOne(id: string): Promise<V2DictionaryEntity> {
		const dictionary = await this.dictionaryRepository.findOne({
			where: { id },
			relations: ["items"],
		});

		if (!dictionary) {
			throw new NotFoundException(`Dictionary with id ${id} not found`);
		}

		return dictionary;
	}

	async findByCode(code: string): Promise<V2DictionaryEntity> {
		const dictionary = await this.dictionaryRepository.findOne({
			where: { code },
			relations: ["items"],
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

		// Проверяем, есть ли связанные элементы
		const itemCount = await this.itemRepository.count({
			where: { dictionaryId: id },
		});

		if (itemCount > 0) {
			throw new ConflictException(
				`Cannot delete dictionary with ${itemCount} associated items. Delete items first.`,
			);
		}

		await this.dictionaryRepository.remove(dictionary);
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
}
