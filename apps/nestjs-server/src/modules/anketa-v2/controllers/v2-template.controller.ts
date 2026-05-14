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
	CreateV2TemplateDto,
	UpdateV2TemplateDto,
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
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Удалить шаблон" })
	@ApiResponse({ status: 204 })
	async delete(
		@Param("id", ParseUUIDPipe) id: string,
		@CurrentUser() user: { id: string } | null,
	): Promise<void> {
		await this.templateService.delete(id);
		await this.auditService.log(
			id,
			"template.deleted",
			null,
			{ templateId: id },
			user?.id ?? null,
		);
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
