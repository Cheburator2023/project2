import { Injectable } from "@nestjs/common";
import type {
	PaginatedV2QuestionnaireResponseDto,
	V2QuestionnaireRegistryConfigDto,
} from "@smart-anketa/api-contract";

export type V2RegistryConfigCacheEntry = {
	config: V2QuestionnaireRegistryConfigDto;
	formPaths: string[];
};

export type V2RegistryListCacheKeyInput = {
	streams: string[] | null;
	page: number;
	limit: number;
	search: string;
	versionMode?: string;
};

const MAX_LIST_ENTRIES = 32;

/**
 * Process-local кеш реестра (колонки + страницы списка).
 * Без Redis: на каждом поде свой; инвалидация — при CUD анкет / смене схемы.
 */
@Injectable()
export class V2QuestionnaireRegistryReadCache {
	private generation = 0;
	private config: V2RegistryConfigCacheEntry | null = null;
	private readonly list = new Map<string, PaginatedV2QuestionnaireResponseDto>();

	getGeneration(): number {
		return this.generation;
	}

	getConfig(): V2RegistryConfigCacheEntry | null {
		return this.config;
	}

	setConfig(entry: V2RegistryConfigCacheEntry, generation: number): void {
		if (generation !== this.generation) return;
		this.config = entry;
	}

	listKey(input: V2RegistryListCacheKeyInput): string {
		const streams =
			input.streams == null ? "*" : [...input.streams].sort().join(",");
		return `${streams}|${input.page}|${input.limit}|${input.search}|${input.versionMode ?? ""}`;
	}

	getList(key: string): PaginatedV2QuestionnaireResponseDto | undefined {
		return this.list.get(key);
	}

	setList(
		key: string,
		value: PaginatedV2QuestionnaireResponseDto,
		generation: number,
	): void {
		if (generation !== this.generation) return;
		if (this.list.size >= MAX_LIST_ENTRIES && !this.list.has(key)) {
			const oldest = this.list.keys().next().value;
			if (oldest) this.list.delete(oldest);
		}
		this.list.set(key, value);
	}

	invalidateList(): void {
		this.generation += 1;
		this.list.clear();
	}

	invalidateConfig(): void {
		this.generation += 1;
		this.config = null;
		this.list.clear();
	}

	invalidateAll(): void {
		this.invalidateConfig();
	}
}
