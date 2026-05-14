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
		const dictionaries = await this.dictionaryService.findAll();
		return dictionaries.map((d) => this.toResponseDto(d));
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
		await this.auditService.log(
			id,
			"dictionary_item.created",
			null,
			{ item },
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
		await this.auditService.log(
			item.dictionaryId,
			"dictionary_item.updated",
			null,
			{ item, changes: dto },
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
		await this.auditService.log(
			item.dictionaryId,
			"dictionary_item.deleted",
			null,
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
		await this.auditService.log(
			dictionary.id,
			"dictionary.created",
			null,
			{ dictionary },
			user?.id ?? null,
		);
		return this.toResponseDto(dictionary);
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
		await this.auditService.log(
			dictionary.id,
			"dictionary.updated",
			null,
			{ dictionary, changes: dto },
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
		await this.auditService.log(
			id,
			"dictionary.deleted",
			null,
			{ dictionaryId: id },
			user?.id ?? null,
		);
	}

	private toResponseDto(dictionary: any): V2DictionaryResponseDto {
		return {
			id: dictionary.id,
			code: dictionary.code,
			name: dictionary.name,
			description: dictionary.description,
			createdAt: dictionary.createdAt.toISOString(),
			updatedAt: dictionary.updatedAt.toISOString(),
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
