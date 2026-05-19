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
import { V2TemplateVersionService } from "../services/v2-template-version.service";
import { V2TemplateService } from "../services/v2-template.service";
import { V2AuditService } from "../services/v2-audit.service";
import {
	V2TemplateVersionResponseDto,
	CreateV2TemplateVersionDto,
	PublishV2TemplateVersionDto,
	RollbackV2TemplateVersionDto,
	BulkDeleteV2TemplateVersionsDto,
	RestoreV2TemplateVersionsDto,
	V2BulkDeleteTemplateVersionsResponseDto,
} from "../dto";
import { CurrentUser } from "../../../shared/decorators/user.decorator";

@ApiTags("v2-template-versions")
@Controller("v2/templates/:templateId/versions")
export class V2TemplateVersionController {
	constructor(
		private readonly versionService: V2TemplateVersionService,
		private readonly templateService: V2TemplateService,
		private readonly auditService: V2AuditService,
	) {}

	@Get()
	@ApiOperation({ summary: "Получить все версии шаблона" })
	@ApiResponse({ status: 200, type: [V2TemplateVersionResponseDto] })
	async findAll(
		@Param("templateId", ParseUUIDPipe) templateId: string,
	): Promise<V2TemplateVersionResponseDto[]> {
		const versions = await this.versionService.findAll(templateId);
		return versions.map((v) => this.toResponseDto(v));
	}

	@Get(":id")
	@ApiOperation({ summary: "Получить версию по ID" })
	@ApiResponse({ status: 200, type: V2TemplateVersionResponseDto })
	async findOne(
		@Param("id", ParseUUIDPipe) id: string,
	): Promise<V2TemplateVersionResponseDto> {
		const version = await this.versionService.findOne(id);
		return this.toResponseDto(version);
	}

	@Post()
	@ApiOperation({ summary: "Создать новую версию шаблона" })
	@ApiResponse({ status: 201, type: V2TemplateVersionResponseDto })
	async create(
		@Param("templateId", ParseUUIDPipe) templateId: string,
		@Body() dto: CreateV2TemplateVersionDto,
		@CurrentUser() user: { id: string } | null,
	): Promise<V2TemplateVersionResponseDto> {
		const version = await this.versionService.create(templateId, dto, user?.id ?? null);
		await this.auditService.log(
			templateId,
			"version.created",
			version.id,
			{ version },
			user?.id ?? null,
		);
		return this.toResponseDto(version);
	}

	@Put(":id")
	@ApiOperation({ summary: "Обновить версию шаблона" })
	@ApiResponse({ status: 200, type: V2TemplateVersionResponseDto })
	async update(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() dto: Partial<CreateV2TemplateVersionDto>,
		@CurrentUser() user: { id: string } | null,
	): Promise<V2TemplateVersionResponseDto> {
		const version = await this.versionService.update(id, dto, user?.id ?? null);
		await this.auditService.log(
			version.templateId,
			"version.updated",
			version.id,
			{ version, changes: dto },
			user?.id ?? null,
		);
		return this.toResponseDto(version);
	}

	@Post(":id/publish")
	@ApiOperation({
		summary: "Опубликовать версию шаблона",
		description:
			"Версия становится опубликованной и единственной актуальной схемой системы; у других шаблонов снимается актуальность.",
	})
	@ApiResponse({ status: 200, type: V2TemplateVersionResponseDto })
	async publish(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() dto: PublishV2TemplateVersionDto,
		@CurrentUser() user: { id: string } | null,
	): Promise<V2TemplateVersionResponseDto> {
		const version = await this.versionService.publish(id, dto, user?.id ?? null);
		await this.auditService.log(
			version.templateId,
			"version.published",
			version.id,
			{ version },
			user?.id ?? null,
		);
		return this.toResponseDto(version);
	}

	@Post(":id/archive")
	@ApiOperation({ summary: "Архивировать версию шаблона" })
	@ApiResponse({ status: 200, type: V2TemplateVersionResponseDto })
	async archive(
		@Param("id", ParseUUIDPipe) id: string,
		@CurrentUser() user: { id: string } | null,
	): Promise<V2TemplateVersionResponseDto> {
		const version = await this.versionService.archive(id);
		await this.auditService.log(
			version.templateId,
			"version.archived",
			version.id,
			{ version },
			user?.id ?? null,
		);
		return this.toResponseDto(version);
	}

	@Post("rollback")
	@ApiOperation({ summary: "Откатиться к предыдущей версии" })
	@ApiResponse({ status: 201, type: V2TemplateVersionResponseDto })
	async rollback(
		@Param("templateId", ParseUUIDPipe) templateId: string,
		@Body() dto: RollbackV2TemplateVersionDto,
		@CurrentUser() user: { id: string } | null,
	): Promise<V2TemplateVersionResponseDto> {
		const version = await this.versionService.rollback(templateId, dto);
		await this.auditService.log(
			templateId,
			"version.rolled_back",
			version.id,
			{ version, targetVersionId: dto.targetVersionId },
			user?.id ?? null,
		);
		return this.toResponseDto(version);
	}

	@Post("from-default")
	@ApiOperation({
		summary: "Создать черновик из заводской схемы",
		description:
			"Новая draft-версия по эталону анкеты калькуляции. Без публикации и без смены актуальной схемы системы.",
	})
	@ApiResponse({ status: 201, type: V2TemplateVersionResponseDto })
	async createFromDefault(
		@Param("templateId", ParseUUIDPipe) templateId: string,
		@CurrentUser() user: { id: string } | null,
	): Promise<V2TemplateVersionResponseDto> {
		const version = await this.versionService.createDraftFromDefault(
			templateId,
			user?.id ?? null,
		);
		await this.auditService.log(
			templateId,
			"version.created",
			version.id,
			{ version, source: "default_factory" },
			user?.id ?? null,
		);
		return this.toResponseDto(version);
	}

	@Post("bulk-delete")
	@ApiOperation({
		summary: "Удалить версии шаблона скопом",
		description:
			"Удаляет указанные версии или все версии шаблона, кроме актуальной схемы системы.",
	})
	@ApiResponse({ status: 200, type: V2BulkDeleteTemplateVersionsResponseDto })
	async bulkDelete(
		@Param("templateId", ParseUUIDPipe) templateId: string,
		@Body() dto: BulkDeleteV2TemplateVersionsDto,
	): Promise<V2BulkDeleteTemplateVersionsResponseDto> {
		return this.templateService.bulkDeleteVersions(
			templateId,
			dto.versionIds,
		);
	}

	@Post("restore")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Восстановить удалённые версии (undo)" })
	@ApiResponse({ status: 204 })
	async restoreVersions(
		@Param("templateId", ParseUUIDPipe) templateId: string,
		@Body() dto: RestoreV2TemplateVersionsDto,
	): Promise<void> {
		await this.templateService.restoreVersions(templateId, dto.versions);
	}

	@Post("reset-default")
	@ApiOperation({
		summary: "Сбросить шаблон к заводской схеме и логике",
		description:
			"Создаёт новую версию из встроенного эталона (по мотивам базовой анкеты v1) и публикует её как текущую.",
	})
	@ApiResponse({ status: 201, type: V2TemplateVersionResponseDto })
	async resetDefault(
		@Param("templateId", ParseUUIDPipe) templateId: string,
		@CurrentUser() user: { id: string } | null,
	): Promise<V2TemplateVersionResponseDto> {
		const version = await this.versionService.resetToDefault(templateId, user?.id ?? null);
		await this.auditService.log(
			templateId,
			"version.reset_to_default",
			version.id,
			{ version },
			user?.id ?? null,
		);
		return this.toResponseDto(version);
	}

	@Post(":versionId/activate-as-current")
	@ApiOperation({
		summary: "Сделать версию актуальной схемой системы",
		description:
			"В системе может быть только одна актуальная схема. У остальных шаблонов снимается признак актуальности. Черновик будет опубликован; опубликованная — станет текущей; архивная будет скопирована в новую версию и опубликована.",
	})
	@ApiResponse({ status: 200, type: V2TemplateVersionResponseDto })
	async activateAsCurrent(
		@Param("templateId", ParseUUIDPipe) templateId: string,
		@Param("versionId", ParseUUIDPipe) versionId: string,
		@CurrentUser() user: { id: string } | null,
	): Promise<V2TemplateVersionResponseDto> {
		const { version, changed } = await this.versionService.activateAsCurrent(
			templateId,
			versionId,
			user?.id ?? null,
		);

		if (changed) {
			await this.auditService.log(
				templateId,
				"version.activated_as_current",
				version.id,
				{ version },
				user?.id ?? null,
			);
		}

		return this.toResponseDto(version);
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Удалить версию шаблона" })
	@ApiResponse({ status: 204 })
	async delete(
		@Param("id", ParseUUIDPipe) id: string,
		@CurrentUser() user: { id: string } | null,
	): Promise<void> {
		const version = await this.versionService.findOne(id);
		await this.versionService.delete(id);
		await this.auditService.log(
			version.templateId,
			"version.deleted",
			version.id,
			{ versionId: id },
			user?.id ?? null,
		);
	}

	private toResponseDto(version: any): V2TemplateVersionResponseDto {
		return {
			id: version.id,
			templateId: version.templateId,
			versionNumber: version.versionNumber,
			status: version.status,
			jsonSchema: version.jsonSchema,
			uiSchema: version.uiSchema,
			logic: version.logic,
			dictionariesSnapshot: version.dictionariesSnapshot,
			releaseNotes: version.releaseNotes,
			parentVersionId: version.parentVersionId,
			createdAt: version.createdAt.toISOString(),
			updatedAt: version.updatedAt.toISOString(),
			publishedAt: version.publishedAt?.toISOString() ?? null,
			createdBy: version.createdBy,
		};
	}
}
