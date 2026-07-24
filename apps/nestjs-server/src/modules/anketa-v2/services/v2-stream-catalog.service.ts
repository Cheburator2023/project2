import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
	V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE,
	buildFactoryImplementationStreamCatalog,
	buildStreamFilterAliasMap,
	normalizeImplementationStreamCatalogEntry,
	type V2ImplementationStreamCatalogEntry,
} from "@smart-anketa/api-contract";
import { Repository } from "typeorm";
import { V2DictionaryItemEntity } from "../entities/v2-dictionary-item.entity";
import { V2DictionaryEntity } from "../entities/v2-dictionary.entity";

@Injectable()
export class V2StreamCatalogService implements OnModuleInit {
	private readonly logger = new Logger(V2StreamCatalogService.name);
	private cache: V2ImplementationStreamCatalogEntry[] | null = null;

	constructor(
		@InjectRepository(V2DictionaryEntity)
		private readonly dictionaryRepository: Repository<V2DictionaryEntity>,
		@InjectRepository(V2DictionaryItemEntity)
		private readonly itemRepository: Repository<V2DictionaryItemEntity>,
	) {}

	async onModuleInit(): Promise<void> {
		try {
			await this.refresh();
		} catch (error) {
			this.logger.warn(
				`Не удалось загрузить каталог стримов при старте: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}

	invalidate(): void {
		this.cache = null;
	}

	async refresh(): Promise<V2ImplementationStreamCatalogEntry[]> {
		const dictionary = await this.dictionaryRepository.findOne({
			where: { code: V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE },
		});
		if (!dictionary) {
			this.cache = buildFactoryImplementationStreamCatalog();
			return this.cache;
		}
		const items = await this.itemRepository.find({
			where: { dictionaryId: dictionary.id },
			order: { order: "ASC" },
		});
		const catalog: V2ImplementationStreamCatalogEntry[] = [];
		for (const item of items) {
			const entry = normalizeImplementationStreamCatalogEntry({
				code: item.code,
				label: item.label,
				order: item.order,
				isActive: item.isActive,
				payload: item.payload,
			});
			if (entry) catalog.push(entry);
		}
		this.cache =
			catalog.length > 0
				? catalog
				: buildFactoryImplementationStreamCatalog();
		return this.cache;
	}

	async getCatalog(options?: {
		activeOnly?: boolean;
		forceRefresh?: boolean;
	}): Promise<V2ImplementationStreamCatalogEntry[]> {
		if (options?.forceRefresh || !this.cache) {
			await this.refresh();
		}
		const catalog = this.cache ?? buildFactoryImplementationStreamCatalog();
		if (options?.activeOnly === false) return catalog;
		return catalog.filter((entry) => entry.isActive);
	}

	/** Snapshot для sync-хелперов (может быть factory fallback). */
	getCachedCatalog(): V2ImplementationStreamCatalogEntry[] {
		return this.cache ?? buildFactoryImplementationStreamCatalog();
	}

	async getFilterAliasMap(): Promise<Record<string, readonly string[]>> {
		const catalog = await this.getCatalog({ activeOnly: true });
		return buildStreamFilterAliasMap(catalog);
	}
}
