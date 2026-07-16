import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Res,
	UseInterceptors,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import type {
	BulkDeleteV2QuestionnairesResultDto,
	SeedV2TestQuestionnairesResultDto,
	V2QuestionnaireCommentDto,
	V2QuestionnaireDto,
	V2QuestionnaireFormPackageDto,
} from "@smart-anketa/api-contract";
import {
	BulkDeleteV2QuestionnairesDto,
	CreateV2QuestionnaireCommentDto,
	CreateV2QuestionnaireDto,
	CreateV2QuestionnaireVersionDto,
	ExportV2QuestionnairesXlsxDto,
	SeedV2TestQuestionnairesDto,
	UpdateV2QuestionnaireDto,
} from "../dto";
import { V2QuestionnaireService } from "../services/v2-questionnaire.service";
import { V2QuestionnaireCommentService } from "../services/v2-questionnaire-comment.service";
import { CurrentUser } from "../../../shared/decorators/user.decorator";
import { RealmRole } from "../../../shared/decorators/realm-role.decorator";
import { StreamFilter } from "../../../shared/decorators/stream-filter.decorator";
import { StreamFilterInterceptor } from "../../../shared/interceptors/stream-filter.interceptor";
import { Permission } from "../../../shared/types/permissions";

@ApiTags("v2-questionnaires")
@Controller("v2/questionnaires")
@UseInterceptors(StreamFilterInterceptor)
export class V2QuestionnaireController {
	constructor(
		private readonly questionnaireService: V2QuestionnaireService,
		private readonly commentService: V2QuestionnaireCommentService,
	) {}

	@Get()
	@StreamFilter()
	@ApiOperation({ summary: "Реестр анкет v2 (отдельно от реестра схем)" })
	async findAll(): Promise<V2QuestionnaireDto[]> {
		return this.questionnaireService.findAll();
	}

	@Post("bulk-delete")
	@HttpCode(200)
	@RealmRole(
		Permission.ANKETA_DELETE_CALCULATION,
		Permission.ANKETA_ADMIN_PANEL,
	)
	@ApiOperation({ summary: "Массовое удаление анкет v2 по id" })
	async bulkDelete(
		@Body() body: BulkDeleteV2QuestionnairesDto,
	): Promise<BulkDeleteV2QuestionnairesResultDto> {
		return this.questionnaireService.bulkDelete(body.ids);
	}

	@Post("seed-test")
	@HttpCode(200)
	@ApiOperation({
		summary:
			"Создать тестовые анкеты по актуальной схеме шаблона (formData из jsonSchema + расчёт)",
	})
	async seedTest(
		@Body() body: SeedV2TestQuestionnairesDto,
		@CurrentUser() user: Record<string, unknown> | undefined,
	): Promise<SeedV2TestQuestionnairesResultDto> {
		return this.questionnaireService.seedTestQuestionnaires(
			body.templateId,
			user as never,
		);
	}

	@Get("export/xlsx")
	@ApiOperation({ summary: "Выгрузка всех анкет v2 реестра в XLSX" })
	@ApiResponse({
		status: HttpStatus.OK,
		content: {
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
				schema: { type: "string", format: "binary" },
			},
		},
	})
	async exportRegistryXlsx(@Res() res: Response, @CurrentUser() user: Record<string, unknown> | undefined): Promise<void> {
		const buffer = await this.questionnaireService.exportRegistryXlsx(undefined, user);
		this.sendRegistryXlsxResponse(res, buffer, "v2-questionnaires");
	}

	@Post("export/xlsx")
	@HttpCode(200)
	@ApiOperation({ summary: "Выгрузка выбранных анкет v2 реестра в XLSX" })
	@ApiResponse({
		status: HttpStatus.OK,
		content: {
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
				schema: { type: "string", format: "binary" },
			},
		},
	})
	async exportSelectedRegistryXlsx(
		@Body() body: ExportV2QuestionnairesXlsxDto,
		@Res() res: Response,
		@CurrentUser() user: Record<string, unknown> | undefined,
	): Promise<void> {
		const buffer = await this.questionnaireService.exportRegistryXlsx(
			body.ids,
			user,
		);
		this.sendRegistryXlsxResponse(
			res,
			buffer,
			`v2-questionnaires-selected-${body.ids.length}`,
		);
	}

	private sendRegistryXlsxResponse(
		res: Response,
		buffer: Buffer,
		filenamePrefix: string,
	): void {
		const date = new Date().toISOString().slice(0, 10);
		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		);
		res.setHeader(
			"Content-Disposition",
			`attachment; filename=${filenamePrefix}-${date}.xlsx`,
		);
		res.end(buffer);
	}

	@Get(":id")
	@ApiOperation({ summary: "Анкета по id" })
	async findOne(
		@Param("id", ParseUUIDPipe) id: string,
	): Promise<V2QuestionnaireDto> {
		return this.questionnaireService.findOne(id);
	}

	@Get(":id/form-package")
	@ApiOperation({
		summary:
			"Пакет для UI: formData + привязанная схема + статус относительно актуальной схемы админки",
	})
	async getFormPackage(
		@Param("id", ParseUUIDPipe) id: string,
	): Promise<V2QuestionnaireFormPackageDto> {
		return this.questionnaireService.getFormPackage(id);
	}

	@Get(":id/comments")
	@ApiOperation({ summary: "Комментарии к анкете" })
	async listComments(
		@Param("id", ParseUUIDPipe) id: string,
	): Promise<V2QuestionnaireCommentDto[]> {
		return this.commentService.listForQuestionnaire(id);
	}

	@Post(":id/comments")
	@ApiOperation({ summary: "Добавить комментарий к анкете" })
	async createComment(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: CreateV2QuestionnaireCommentDto,
		@CurrentUser() user: Record<string, unknown> | undefined,
	): Promise<V2QuestionnaireCommentDto> {
		return this.commentService.create(id, body, user as never);
	}

	@Delete(":id/comments/:commentId")
	@HttpCode(204)
	@ApiOperation({ summary: "Удалить комментарий" })
	async deleteComment(
		@Param("id", ParseUUIDPipe) id: string,
		@Param("commentId") commentId: string,
	): Promise<void> {
		return this.commentService.delete(id, commentId);
	}

	@Post()
	@ApiOperation({
		summary:
			"Создать анкету по актуальной опубликованной схеме шаблона (фиксируется boundTemplateVersionId)",
	})
	async create(
		@Body() body: CreateV2QuestionnaireDto,
		@CurrentUser() user: Record<string, unknown> | undefined,
	): Promise<V2QuestionnaireDto> {
		return this.questionnaireService.create(body, user as never);
	}

	@Patch(":id")
	@ApiOperation({ summary: "Обновить данные анкеты" })
	async update(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: UpdateV2QuestionnaireDto,
	): Promise<V2QuestionnaireDto> {
		return this.questionnaireService.update(id, body);
	}

	@Post(":id/new-version")
	@ApiOperation({
		summary:
			"Новая версия анкеты в серии (наследует привязку к схеме, как v1)",
	})
	async createNewVersion(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: CreateV2QuestionnaireVersionDto,
		@CurrentUser() user: Record<string, unknown> | undefined,
	): Promise<V2QuestionnaireDto> {
		return this.questionnaireService.createNewVersion(id, body, user as never);
	}
}
