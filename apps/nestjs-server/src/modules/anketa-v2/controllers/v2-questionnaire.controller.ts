import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Res,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import type {
	BulkDeleteV2QuestionnairesResultDto,
	SeedV2TestQuestionnairesResultDto,
	V2QuestionnaireDto,
	V2QuestionnaireFormPackageDto,
} from "@smart-anketa/api-contract";
import {
	BulkDeleteV2QuestionnairesDto,
	CreateV2QuestionnaireDto,
	CreateV2QuestionnaireVersionDto,
	SeedV2TestQuestionnairesDto,
	UpdateV2QuestionnaireDto,
} from "../dto";
import { V2QuestionnaireService } from "../services/v2-questionnaire.service";
import { CurrentUser } from "../../../shared/decorators/user.decorator";

@ApiTags("v2-questionnaires")
@Controller("v2/questionnaires")
export class V2QuestionnaireController {
	constructor(private readonly questionnaireService: V2QuestionnaireService) {}

	@Get()
	@ApiOperation({ summary: "Реестр анкет v2 (отдельно от реестра схем)" })
	async findAll(): Promise<V2QuestionnaireDto[]> {
		return this.questionnaireService.findAll();
	}

	@Post("bulk-delete")
	@HttpCode(200)
	@ApiOperation({ summary: "Массовое удаление анкет v2 по id (админка)" })
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
	async exportRegistryXlsx(@Res() res: Response): Promise<void> {
		const buffer = await this.questionnaireService.exportRegistryXlsx();
		const date = new Date().toISOString().slice(0, 10);
		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		);
		res.setHeader(
			"Content-Disposition",
			`attachment; filename=v2-questionnaires-${date}.xlsx`,
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
