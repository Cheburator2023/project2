import {
	Body,
	Controller,
	Get,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type {
	V2QuestionnaireDto,
	V2QuestionnaireFormPackageDto,
} from "@smart-anketa/api-contract";
import {
	CreateV2QuestionnaireDto,
	CreateV2QuestionnaireVersionDto,
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
