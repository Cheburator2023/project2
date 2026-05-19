import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Body,
	Param,
	HttpCode,
	HttpStatus,
	ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { V2DictionaryService } from "../services/v2-dictionary.service";
import { V2AuditService } from "../services/v2-audit.service";
import {
	V2DictionaryResponseDto,
	V2DictionaryItemResponseDto,
	CreateV2DictionaryDto,
	UpdateV2DictionaryDto,
	CreateV2DictionaryItemDto,
	UpdateV2DictionaryItemDto,
	BulkV2DictionaryIdsDto,
} from "../dto";
import { CurrentUser } from "../../../shared/decorators/user.decorator";

@ApiTags("v2-dictionaries")
@Controller("v2/dictionaries")
export class V2DictionaryController {
	constructor(
		private readonly dictionaryService: V2DictionaryService,
		private readonly auditService: V2AuditService,
	) {}

	@Get()
	@ApiOperation({ summary: "Получить все справочники" })
	@ApiResponse({ status: 200, type: [V2DictionaryResponseDto] })
	async findAll(): Promise<V2DictionaryResponseDto[]> {
		const dictionaries = await this.dictionaryService.findAllWithMeta();
		return dictionaries.map((d) => this.toResponseDto(d));
	}

	@Post("bulk-delete")
	@ApiOperation({ summary: "Массовое удаление справочников" })
	@ApiResponse({ status: 200 })
	async bulkDelete(
		@Body() dto: BulkV2DictionaryIdsDto,
		@CurrentUser() user: { id: string } | null,
	) {
		const result = await this.dictionaryService.bulkDelete(dto.ids);

		for (const id of result.deletedIds) {
			await this.auditService.logDictionary(
				id,
				"dictionary.deleted",
				{ bulk: true },
				user?.id ?? null,
			);
		}

		return result;
	}

	@Post("bulk-reset")
	@ApiOperation({ summary: "Массовый сброс заводских справочников" })
	@ApiResponse({ status: 200 })
	async bulkReset(
		@Body() dto: BulkV2DictionaryIdsDto,
		@CurrentUser() user: { id: string } | null,
	) {
		const result = await this.dictionaryService.bulkReset(dto.ids);

		for (const id of result.resetIds) {
			await this.auditService.logDictionary(
				id,
				"dictionary.updated",
				{ resetToDefault: true, bulk: true },
				user?.id ?? null,
			);
		}

		return result;
	}

	@Get("code/:code")
	@ApiOperation({ summary: "Получить справочник по коду" })
	@ApiResponse({ status: 200, type: V2DictionaryResponseDto })
	async findByCode(@Param("code") code: string): Promise<V2DictionaryResponseDto> {
		const dictionary = await this.dictionaryService.findByCode(code);
		return this.toResponseDto(dictionary);
	}

	@Get("json/:code")
	@ApiOperation({ summary: "Получить справочник в формате JSON" })
	@ApiResponse({ status: 200 })
	async getAsJson(@Param("code") code: string): Promise<Record<string, unknown>> {
		return this.dictionaryService.getDictionaryAsJson(code);
	}

	@Get("items/:itemId")
	@ApiOperation({ summary: "Получить элемент справочника по ID" })
	@ApiResponse({ status: 200, type: V2DictionaryItemResponseDto })
	async findItem(
		@Param("itemId", ParseUUIDPipe) itemId: string,
	): Promise<V2DictionaryItemResponseDto> {
		const item = await this.dictionaryService.findItem(itemId);
		return this.toItemResponseDto(item);
	}

	@Get(":id/field-usages")
	@ApiOperation({
		summary: "Где справочник привязан к полям схем (версии шаблонов)",
	})
	@ApiResponse({ status: 200 })
	async findFieldUsages(@Param("id", ParseUUIDPipe) id: string) {
		return this.dictionaryService.findFieldUsages(id);
	}

	@Get(":id/items")
	@ApiOperation({ summary: "Получить все элементы справочника" })
	@ApiResponse({ status: 200, type: [V2DictionaryItemResponseDto] })
	async findAllItems(
		@Param("id", ParseUUIDPipe) id: string,
	): Promise<V2DictionaryItemResponseDto[]> {
		const items = await this.dictionaryService.findAllItems(id);
		return items.map((i) => this.toItemResponseDto(i));
	}

	@Post(":id/items")
	@ApiOperation({ summary: "Создать элемент справочника" })
	@ApiResponse({ status: 201, type: V2DictionaryItemResponseDto })
	async createItem(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() dto: CreateV2DictionaryItemDto,
		@CurrentUser() user: { id: string } | null,
	): Promise<V2DictionaryItemResponseDto> {
		const item = await this.dictionaryService.createItem(id, dto);
		await this.auditService.logDictionary(
			id,
			"dictionary_item.created",
			{ item: this.toItemResponseDto(item) },
			user?.id ?? null,
		);
		return this.toItemResponseDto(item);
	}

	@Put("items/:itemId")
	@ApiOperation({ summary: "Обновить элемент справочника" })
	@ApiResponse({ status: 200, type: V2DictionaryItemResponseDto })
	async updateItem(
		@Param("itemId", ParseUUIDPipe) itemId: string,
		@Body() dto: UpdateV2DictionaryItemDto,
		@CurrentUser() user: { id: string } | null,
	): Promise<V2DictionaryItemResponseDto> {
		const item = await this.dictionaryService.updateItem(itemId, dto);
		await this.auditService.logDictionary(
			item.dictionaryId,
			"dictionary_item.updated",
			{ item: this.toItemResponseDto(item), changes: dto },
			user?.id ?? null,
		);
		return this.toItemResponseDto(item);
	}

	@Delete("items/:itemId")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Удалить элемент справочника" })
	@ApiResponse({ status: 204 })
	async deleteItem(
		@Param("itemId", ParseUUIDPipe) itemId: string,
		@CurrentUser() user: { id: string } | null,
	): Promise<void> {
		const item = await this.dictionaryService.findItem(itemId);
		await this.dictionaryService.deleteItem(itemId);
		await this.auditService.logDictionary(
			item.dictionaryId,
			"dictionary_item.deleted",
			{ itemId },
			user?.id ?? null,
		);
	}

	@Get(":id")
	@ApiOperation({ summary: "Получить справочник по ID" })
	@ApiResponse({ status: 200, type: V2DictionaryResponseDto })
	async findOne(
		@Param("id", ParseUUIDPipe) id: string,
	): Promise<V2DictionaryResponseDto> {
		const dictionary = await this.dictionaryService.findOne(id);
		return this.toResponseDto(dictionary);
	}

	@Post()
	@ApiOperation({ summary: "Создать новый справочник" })
	@ApiResponse({ status: 201, type: V2DictionaryResponseDto })
	async create(
		@Body() dto: CreateV2DictionaryDto,
		@CurrentUser() user: { id: string } | null,
	): Promise<V2DictionaryResponseDto> {
		const dictionary = await this.dictionaryService.create(dto);
		await this.auditService.logDictionary(
			dictionary.id,
			"dictionary.created",
			{ dictionary: this.toResponseDto(dictionary) },
			user?.id ?? null,
		);
		return this.toResponseDto(dictionary);
	}

	@Post(":id/reset-default")
	@ApiOperation({ summary: "Сбросить заводской справочник к эталонным значениям" })
	@ApiResponse({ status: 200, type: V2DictionaryResponseDto })
	async resetToDefault(
		@Param("id", ParseUUIDPipe) id: string,
		@CurrentUser() user: { id: string } | null,
	): Promise<V2DictionaryResponseDto> {
		const dictionary = await this.dictionaryService.resetToDefault(id);
		await this.auditService.logDictionary(
			dictionary.id,
			"dictionary.updated",
			{ resetToDefault: true },
			user?.id ?? null,
		);
		const meta = await this.dictionaryService.findAllWithMeta();
		const row = meta.find((d) => d.id === dictionary.id);
		return this.toResponseDto(row ?? { ...dictionary, isDefault: true, isInUse: false });
	}

	@Put(":id")
	@ApiOperation({ summary: "Обновить справочник" })
	@ApiResponse({ status: 200, type: V2DictionaryResponseDto })
	async update(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() dto: UpdateV2DictionaryDto,
		@CurrentUser() user: { id: string } | null,
	): Promise<V2DictionaryResponseDto> {
		const dictionary = await this.dictionaryService.update(id, dto);
		await this.auditService.logDictionary(
			dictionary.id,
			"dictionary.updated",
			{ dictionary: this.toResponseDto(dictionary), changes: dto },
			user?.id ?? null,
		);
		return this.toResponseDto(dictionary);
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Удалить справочник" })
	@ApiResponse({ status: 204 })
	async delete(
		@Param("id", ParseUUIDPipe) id: string,
		@CurrentUser() user: { id: string } | null,
	): Promise<void> {
		await this.dictionaryService.delete(id);
		await this.auditService.logDictionary(
			id,
			"dictionary.deleted",
			{},
			user?.id ?? null,
		);
	}

	private toResponseDto(dictionary: {
		id: string;
		code: string;
		name: string;
		description: string | null;
		createdAt: Date;
		updatedAt: Date;
		isDefault?: boolean;
		isInUse?: boolean;
	}): V2DictionaryResponseDto {
		return {
			id: dictionary.id,
			code: dictionary.code,
			name: dictionary.name,
			description: dictionary.description,
			createdAt: dictionary.createdAt.toISOString(),
			updatedAt: dictionary.updatedAt.toISOString(),
			isDefault: dictionary.isDefault,
			isInUse: dictionary.isInUse,
		};
	}

	private toItemResponseDto(item: any): V2DictionaryItemResponseDto {
		return {
			id: item.id,
			dictionaryId: item.dictionaryId,
			code: item.code,
			label: item.label,
			parentCode: item.parentCode,
			order: item.order,
			isActive: item.isActive,
			payload: item.payload,
		};
	}
}
