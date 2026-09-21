import {
	BadRequestException,
	ConflictException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
	V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE,
	buildFactoryImplementationStreamCatalog,
	buildStreamFilterAliasMap,
	catalogFormDictionaryEntries,
	isFactoryProtectedStreamCode,
	isValidImplementationStreamCodeFormat,
	normalizeImplementationStreamCatalogEntry,
	parseImplementationStreamPayload,
	type V2ImplementationStreamCatalogEntry,
} from "@smart-anketa/api-contract";
import { Repository } from "typeorm";
import { V2DictionaryEntity } from "../entities/v2-dictionary.entity";
import { V2DictionaryItemEntity } from "../entities/v2-dictionary-item.entity";
import { V2StreamEntity } from "../entities/v2-stream.entity";

export type V2StreamWriteInput = {
	code?: string;
	label: string;
	order?: number;
	isActive?: boolean;
	payload?: unknown;
};

@Injectable()
export class V2StreamCatalogService {
	private readonly logger = new Logger(V2StreamCatalogService.name);
	private cache: V2ImplementationStreamCatalogEntry[] | null = null;

	constructor(
		@InjectRepository(V2StreamEntity)
		private readonly streamRepository: Repository<V2StreamEntity>,
		@InjectRepository(V2DictionaryEntity)
		private readonly dictionaryRepository: Repository<V2DictionaryEntity>,
		@InjectRepository(V2DictionaryItemEntity)
		private readonly dictionaryItemRepository: Repository<V2DictionaryItemEntity>,
	) {}

	async runStartupSeed(): Promise<void> {
		try {
			await this.ensureFactoryStreams();
			await this.refresh();
			await this.syncFormDictionariesFromCatalog();
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

	/**
	 * Soft-sync factory-стримов в `v2_stream`: добавить отсутствующие,
	 * не перетирать label/payload admin-правок.
	 */
	async ensureFactoryStreams(): Promise<void> {
		const factory = buildFactoryImplementationStreamCatalog();
		const existing = await this.streamRepository.find();
		const byCode = new Map(existing.map((row) => [row.code, row]));
		let added = 0;
		for (const entry of factory) {
			if (byCode.has(entry.code)) continue;
			await this.streamRepository.save(
				this.streamRepository.create({
					code: entry.code,
					label: entry.label,
					order: entry.order,
					isActive: entry.isActive,
					payload: entry.payload as unknown as Record<string, unknown>,
				}),
			);
			added++;
		}
		if (added > 0) {
			this.logger.log(`Добавлены factory-стримы в v2_stream: ${added}`);
			this.invalidate();
		}
	}

	async refresh(): Promise<V2ImplementationStreamCatalogEntry[]> {
		const rows = await this.streamRepository.find({
			order: { order: "ASC", code: "ASC" },
		});
		const catalog: V2ImplementationStreamCatalogEntry[] = [];
		for (const row of rows) {
			const entry = normalizeImplementationStreamCatalogEntry({
				code: row.code,
				label: row.label,
				order: row.order,
				isActive: row.isActive,
				payload: row.payload,
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

	async listRows(options?: { includeInactive?: boolean }) {
		const catalog = await this.getCatalog({
			activeOnly: !options?.includeInactive,
			forceRefresh: true,
		});
		const rows = await this.streamRepository.find({
			order: { order: "ASC", code: "ASC" },
		});
		const byCode = new Map(rows.map((row) => [row.code, row]));
		return catalog.map((entry) => {
			const row = byCode.get(entry.code);
			return {
				id: row?.id ?? entry.code,
				code: entry.code,
				label: entry.label,
				order: entry.order,
				isActive: entry.isActive,
				dbNames: entry.payload.dbNames,
				legacyLabels: entry.payload.legacyLabels,
				keycloakAliases: entry.payload.keycloakAliases,
				isModelStream: entry.payload.isModelStream,
				isUmbrellaStream: entry.payload.isUmbrellaStream,
				isExecutor: entry.payload.isExecutor,
				kind: entry.payload.kind,
				v1Labels: entry.payload.v1Labels,
				payload: entry.payload,
			};
		});
	}

	async create(input: V2StreamWriteInput): Promise<V2StreamEntity> {
		const code = (input.code ?? "").trim().toLowerCase();
		if (!isValidImplementationStreamCodeFormat(code)) {
			throw new BadRequestException(
				"Код стрима: 1–6 символов [a-z0-9] (например rb, kmbkcb)",
			);
		}
		const label = input.label.trim();
		if (!label) {
			throw new BadRequestException("Подпись стрима обязательна");
		}
		const existing = await this.streamRepository.findOne({ where: { code } });
		if (existing) {
			throw new ConflictException(`Стрим с кодом «${code}» уже есть`);
		}
		const payload = parseImplementationStreamPayload(input.payload, {
			label,
			code,
		});
		const saved = await this.streamRepository.save(
			this.streamRepository.create({
				code,
				label,
				order: typeof input.order === "number" ? input.order : 0,
				isActive: input.isActive !== false,
				payload: payload as unknown as Record<string, unknown>,
			}),
		);
		this.invalidate();
		await this.syncFormDictionariesFromCatalog();
		return saved;
	}

	async update(id: string, input: V2StreamWriteInput): Promise<V2StreamEntity> {
		const row = await this.streamRepository.findOne({ where: { id } });
		if (!row) throw new NotFoundException("Стрим не найден");
		const label =
			typeof input.label === "string" ? input.label.trim() : row.label;
		if (!label) {
			throw new BadRequestException("Подпись стрима обязательна");
		}
		const payload = parseImplementationStreamPayload(
			input.payload !== undefined ? input.payload : row.payload,
			{ label, code: row.code },
		);
		if (typeof input.order === "number" && Number.isFinite(input.order)) {
			row.order = input.order;
		}
		if (typeof input.isActive === "boolean") {
			row.isActive = input.isActive;
		}
		row.label = label;
		row.payload = payload as unknown as Record<string, unknown>;
		const saved = await this.streamRepository.save(row);
		this.invalidate();
		await this.syncFormDictionariesFromCatalog();
		return saved;
	}

	async remove(id: string): Promise<void> {
		const row = await this.streamRepository.findOne({ where: { id } });
		if (!row) throw new NotFoundException("Стрим не найден");
		if (isFactoryProtectedStreamCode(row.code)) {
			throw new ConflictException(
				"Заводской стрим нельзя удалить. Можно отключить (Активен = нет).",
			);
		}
		await this.streamRepository.remove(row);
		this.invalidate();
		await this.syncFormDictionariesFromCatalog();
	}

	/**
	 * Единый справочник формы = все активные незонтичные стримы.
	 * Поле «Стрим-исполнитель» фильтрует isExecutor на клиенте.
	 */
	async syncFormDictionariesFromCatalog(): Promise<void> {
		const catalog = await this.getCatalog({
			activeOnly: false,
			forceRefresh: true,
		});
		await this.replaceDictionaryItems(
			V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE,
			catalogFormDictionaryEntries(catalog),
		);
	}

	private async replaceDictionaryItems(
		dictionaryCode: string,
		entries: V2ImplementationStreamCatalogEntry[],
	): Promise<void> {
		const dictionary = await this.dictionaryRepository.findOne({
			where: { code: dictionaryCode },
		});
		if (!dictionary) return;
		const existing = await this.dictionaryItemRepository.find({
			where: { dictionaryId: dictionary.id },
			order: { order: "ASC" },
		});
		const existingByCode = new Map(existing.map((item) => [item.code, item]));
		const expectedCodes = new Set(entries.map((entry) => entry.code));
		for (const [index, entry] of entries.entries()) {
			const current = existingByCode.get(entry.code);
			const payload = {
				storeCode: true,
				isExecutor: entry.payload.isExecutor,
				kind: entry.payload.kind,
			};
			if (!current) {
				await this.dictionaryItemRepository.save(
					this.dictionaryItemRepository.create({
						dictionaryId: dictionary.id,
						code: entry.code,
						label: entry.label,
						order: index,
						isActive: true,
						parentCode: null,
						payload,
					}),
				);
				continue;
			}
			if (
				current.label !== entry.label ||
				current.order !== index ||
				!current.isActive ||
				current.parentCode !== null ||
				JSON.stringify(current.payload) !== JSON.stringify(payload)
			) {
				current.label = entry.label;
				current.order = index;
				current.isActive = true;
				current.parentCode = null;
				current.payload = payload;
				await this.dictionaryItemRepository.save(current);
			}
		}
		const stale = existing.filter((item) => !expectedCodes.has(item.code));
		if (stale.length > 0) {
			await this.dictionaryItemRepository.remove(stale);
		}
	}
}
