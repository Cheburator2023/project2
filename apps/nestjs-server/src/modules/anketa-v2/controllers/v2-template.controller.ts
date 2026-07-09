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
import { V2TemplateService } from "../services/v2-template.service";
import { V2AuditService } from "../services/v2-audit.service";
import {
	V2TemplateResponseDto,
	V2TemplateRegistryListResponseDto,
	CreateV2TemplateDto,
	UpdateV2TemplateDto,
	RestoreV2TemplateDto,
	V2TemplateDeleteSnapshotResponseDto,
} from "../dto";
import { CurrentUser } from "../../../shared/decorators/user.decorator";

@ApiTags("v2-templates")
@Controller("v2/templates")
export class V2TemplateController {
	constructor(
		private readonly templateService: V2TemplateService,
		private readonly auditService: V2AuditService,
	) {}

	@Get()
	@ApiOperation({ summary: "Получить все шаблоны" })
	@ApiResponse({ status: 200, type: [V2TemplateResponseDto] })
	async findAll(): Promise<V2TemplateResponseDto[]> {
		const templates = await this.templateService.findAll();
		return templates.map((t) => this.toResponseDto(t));
	}

	@Get("registry")
	@ApiOperation({
		summary: "Реестр схем",
		description:
			"Шаблоны с кратким списком версий (без jsonSchema/uiSchema/logic) для таблицы админки.",
	})
	@ApiResponse({ status: 200, type: V2TemplateRegistryListResponseDto })
	async findRegistry(): Promise<V2TemplateRegistryListResponseDto> {
		return this.templateService.findRegistryList();
	}

	@Post("restore")
	@ApiOperation({ summary: "Восстановить удалённый шаблон (undo)" })
	@ApiResponse({ status: 201, type: V2TemplateResponseDto })
	async restore(
		@Body() dto: RestoreV2TemplateDto,
	): Promise<V2TemplateResponseDto> {
		await this.templateService.restoreFromSnapshot(dto);
		const template = await this.templateService.findOne(dto.template.id);
		return this.toResponseDto(template);
	}

	@Get("code/:code")
	@ApiOperation({ summary: "Получить шаблон по коду" })
	@ApiResponse({ status: 200, type: V2TemplateResponseDto })
	async findByCode(
		@Param("code") code: string,
	): Promise<V2TemplateResponseDto> {
		const template = await this.templateService.findByCode(code);
		return this.toResponseDto(template);
	}

	@Get(":id")
	@ApiOperation({ summary: "Получить шаблон по ID" })
	@ApiResponse({ status: 200, type: V2TemplateResponseDto })
	async findOne(
		@Param("id", ParseUUIDPipe) id: string,
	): Promise<V2TemplateResponseDto> {
		const template = await this.templateService.findOne(id);
		return this.toResponseDto(template);
	}

	@Post()
	@ApiOperation({ summary: "Создать новый шаблон" })
	@ApiResponse({ status: 201, type: V2TemplateResponseDto })
	async create(
		@Body() dto: CreateV2TemplateDto,
		@CurrentUser() user: { id: string } | null,
	): Promise<V2TemplateResponseDto> {
		const template = await this.templateService.create(dto, user?.id ?? null);
		await this.auditService.log(
			template.id,
			"template.created",
			null,
			{ template },
			user?.id ?? null,
		);
		return this.toResponseDto(template);
	}

	@Put(":id")
	@ApiOperation({ summary: "Обновить шаблон" })
	@ApiResponse({ status: 200, type: V2TemplateResponseDto })
	async update(
		@Param("id") id: string,
		@Body() dto: UpdateV2TemplateDto,
		@CurrentUser() user: { id: string } | null,
	): Promise<V2TemplateResponseDto> {
		const template = await this.templateService.update(
			id,
			dto,
			user?.id ?? null,
		);
		await this.auditService.log(
			template.id,
			"template.updated",
			null,
			{ template, changes: dto },
			user?.id ?? null,
		);
		return this.toResponseDto(template);
	}

	@Delete(":id")
	@ApiOperation({
		summary:
			"Удалить шаблон вместе со всеми версиями (кроме случая актуальной схемы системы)",
	})
	@ApiResponse({ status: 200, type: V2TemplateDeleteSnapshotResponseDto })
	async delete(
		@Param("id", ParseUUIDPipe) id: string,
		@CurrentUser() user: { id: string } | null,
	): Promise<V2TemplateDeleteSnapshotResponseDto> {
		const snapshot = await this.templateService.deleteWithSnapshot(id);
		return snapshot;
	}

	private toResponseDto(template: any): V2TemplateResponseDto {
		return {
			id: template.id,
			code: template.code,
			name: template.name,
			description: template.description,
			streamCode: template.streamCode,
			currentVersionId: template.currentVersionId,
			createdAt: template.createdAt.toISOString(),
			updatedAt: template.updatedAt.toISOString(),
			createdBy: template.createdBy,
			updatedBy: template.updatedBy,
		};
	}
}
