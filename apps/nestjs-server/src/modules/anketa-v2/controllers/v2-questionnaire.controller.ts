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
	V2QuestionnaireRegistryConfigDto,
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
import { AuditService } from "../../../shared/audit/audit.service";
import {
    AUDIT_EVENT_SUMD_CREATEANKETA,
    AUDIT_EVENT_SUMD_SAVEANKETA,
    AUDIT_EVENT_SUMD_DELETEANKETA,
    AUDIT_EVENT_SUMD_EXPORT,
    AUDIT_EVENT_SUMD_HOLDANKETA,
    AUDIT_EVENT_SUMD_APPROVE,
} from "../../../shared/audit/audit.constants";
import { v4 as uuidv4 } from "uuid";
import { normalizeV2AnketaWorkflow } from "../utils/v2-anketa-workflow.util";

@ApiTags("v2-questionnaires")
@Controller("v2/questionnaires")
@UseInterceptors(StreamFilterInterceptor)
export class V2QuestionnaireController {
    constructor(
        private readonly questionnaireService: V2QuestionnaireService,
        private readonly commentService: V2QuestionnaireCommentService,
        private readonly auditService: AuditService,
    ) {}

	@Get("registry-config")
	@ApiOperation({
		summary:
			"Колонки реестра анкет: объединение схем всех привязанных версий шаблонов",
	})
	async getRegistryConfig(): Promise<V2QuestionnaireRegistryConfigDto> {
		return this.questionnaireService.getRegistryConfig();
	}

	@Get()
	@StreamFilter()
	@ApiOperation({ summary: "Реестр анкет v2 (отдельно от реестра схем)" })
	async findAll(): Promise<V2QuestionnaireDto[]> {
		return this.questionnaireService.findAll();
	}

	@Post("bulk-delete")
	@HttpCode(200)
	@RealmRole(Permission.ANKETA_DELETE_CALCULATION)
	@ApiOperation({ summary: "Массовое удаление анкет v2 по id" })
       async bulkDelete(
        @Body() body: BulkDeleteV2QuestionnairesDto,
        @CurrentUser() user: Record<string, unknown> | undefined,
    ): Promise<BulkDeleteV2QuestionnairesResultDto> {
        const correlationId = uuidv4();
        const initiator = this.buildInitiator(user);

        this.auditService.sendEvent(
            AUDIT_EVENT_SUMD_DELETEANKETA,
            "START",
            correlationId,
            initiator,
            { ids: body.ids },
        );

        try {
            const result = await this.questionnaireService.bulkDelete(body.ids);

            for (const id of result.deletedIds) {
                this.auditService.sendEvent(
                    AUDIT_EVENT_SUMD_DELETEANKETA,
                    "SUCCESS",
                    uuidv4(),
                    initiator,
                    { questionnaireId: id },
                );
            }
            for (const failed of result.failed) {
                this.auditService.sendEvent(
                    AUDIT_EVENT_SUMD_DELETEANKETA,
                    "FAILURE",
                    uuidv4(),
                    initiator,
                    { questionnaireId: failed.id, errorMessage: failed.message },
                );
            }

            return result;
        } catch (error) {
            this.auditService.sendEvent(
                AUDIT_EVENT_SUMD_DELETEANKETA,
                "FAILURE",
                correlationId,
                initiator,
                { errorMessage: (error as Error).message },
            );
            throw error;
        }
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
        const correlationId = uuidv4();
        const initiator = this.buildInitiator(user);

        this.auditService.sendEvent(
            AUDIT_EVENT_SUMD_CREATEANKETA,
            "START",
            correlationId,
            initiator,
            { templateId: body.templateId, seed: true },
        );

        try {
            const result = await this.questionnaireService.seedTestQuestionnaires(
                body.templateId,
                user as never,
            );
            for (const created of result.created) {
                this.auditService.sendEvent(
                    AUDIT_EVENT_SUMD_CREATEANKETA,
                    "SUCCESS",
                    uuidv4(),
                    initiator,
                    { questionnaireId: created.id },
                );
            }
            return result;
        } catch (error) {
            this.auditService.sendEvent(
                AUDIT_EVENT_SUMD_CREATEANKETA,
                "FAILURE",
                correlationId,
                initiator,
                { errorMessage: (error as Error).message },
            );
            throw error;
        }
    }

	@Get("export/xlsx")
	@RealmRole(Permission.ANKETA_EXPORT_REPORTS)
	@ApiOperation({ summary: "Выгрузка всех анкет v2 реестра в XLSX" })
	@ApiResponse({
		status: HttpStatus.OK,
		content: {
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
				schema: { type: "string", format: "binary" },
			},
		},
	})
    async exportRegistryXlsx(
        @Res() res: Response,
        @CurrentUser() user: Record<string, unknown> | undefined,
    ): Promise<void> {
        const correlationId = uuidv4();
        const initiator = this.buildInitiator(user);

        this.auditService.sendEvent(
            AUDIT_EVENT_SUMD_EXPORT,
            "START",
            correlationId,
            initiator,
            { exportType: "all" },
        );

        try {
            const buffer = await this.questionnaireService.exportRegistryXlsx();
            this.sendRegistryXlsxResponse(res, buffer, "v2-questionnaires");
            this.auditService.sendEvent(
                AUDIT_EVENT_SUMD_EXPORT,
                "SUCCESS",
                correlationId,
                initiator,
                { exportType: "all" },
            );
        } catch (error) {
            this.auditService.sendEvent(
                AUDIT_EVENT_SUMD_EXPORT,
                "FAILURE",
                correlationId,
                initiator,
                { exportType: "all", errorMessage: (error as Error).message },
            );
            throw error;
        }
    }

	@Post("export/xlsx")
	@HttpCode(200)
	@RealmRole(Permission.ANKETA_EXPORT_REPORTS)
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
        const correlationId = uuidv4();
        const initiator = this.buildInitiator(user);

        this.auditService.sendEvent(
            AUDIT_EVENT_SUMD_EXPORT,
            "START",
            correlationId,
            initiator,
            { exportType: "selected", ids: body.ids },
        );

        try {
            const buffer = await this.questionnaireService.exportRegistryXlsx(body.ids);
            this.sendRegistryXlsxResponse(
                res,
                buffer,
                `v2-questionnaires-selected-${body.ids.length}`,
            );
            this.auditService.sendEvent(
                AUDIT_EVENT_SUMD_EXPORT,
                "SUCCESS",
                correlationId,
                initiator,
                { exportType: "selected", ids: body.ids },
            );
        } catch (error) {
            this.auditService.sendEvent(
                AUDIT_EVENT_SUMD_EXPORT,
                "FAILURE",
                correlationId,
                initiator,
                { exportType: "selected", ids: body.ids, errorMessage: (error as Error).message },
            );
            throw error;
        }
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
	@RealmRole(Permission.ANKETA_CREATE_CALCULATION)
	@ApiOperation({
		summary:
			"Создать анкету по актуальной опубликованной схеме шаблона (фиксируется boundTemplateVersionId)",
	})
    async create(
        @Body() body: CreateV2QuestionnaireDto,
        @CurrentUser() user: Record<string, unknown> | undefined,
    ): Promise<V2QuestionnaireDto> {
        const correlationId = uuidv4();
        const initiator = this.buildInitiator(user);

        this.auditService.sendEvent(
            AUDIT_EVENT_SUMD_CREATEANKETA,
            "START",
            correlationId,
            initiator,
            { templateId: body.templateId },
        );

        try {
            const result = await this.questionnaireService.create(body, user as never);
            this.auditService.sendEvent(
                AUDIT_EVENT_SUMD_CREATEANKETA,
                "SUCCESS",
                correlationId,
                initiator,
                { questionnaireId: result.id },
            );
            return result;
        } catch (error) {
            this.auditService.sendEvent(
                AUDIT_EVENT_SUMD_CREATEANKETA,
                "FAILURE",
                correlationId,
                initiator,
                { errorMessage: (error as Error).message },
            );
            throw error;
        }
    }

	@Patch(":id")
	@RealmRole(Permission.ANKETA_EDIT_CALCULATION)
	@ApiOperation({ summary: "Обновить данные анкеты" })
	    async update(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() body: UpdateV2QuestionnaireDto,
        @CurrentUser() user: Record<string, unknown> | undefined,
    ): Promise<V2QuestionnaireDto> {
        const correlationId = uuidv4();
        const initiator = this.buildInitiator(user);

        // Получаем текущую анкету до обновления для сравнения статусов
        const before = await this.questionnaireService.findOne(id);
        const beforeWorkflow = normalizeV2AnketaWorkflow(before.formData?.workflow);

        this.auditService.sendEvent(
            AUDIT_EVENT_SUMD_SAVEANKETA,
            "START",
            correlationId,
            initiator,
            { questionnaireId: id, changes: body },
        );

        try {
            const result = await this.questionnaireService.update(id, body);
            const afterWorkflow = normalizeV2AnketaWorkflow(result.formData?.workflow);

            // Дополнительные события при изменении статусов
            if (beforeWorkflow && afterWorkflow) {
                // Глобальный статус -> HOLDANKETA (утверждение)
                if (
                    beforeWorkflow.globalStatus !== "Заполнено" &&
                    afterWorkflow.globalStatus === "Заполнено"
                ) {
                    this.auditService.sendEvent(
                        AUDIT_EVENT_SUMD_HOLDANKETA,
                        "SUCCESS",
                        uuidv4(),
                        initiator,
                        {
                            questionnaireId: id,
                            oldStatus: beforeWorkflow.globalStatus,
                            newStatus: afterWorkflow.globalStatus,
                        },
                    );
                }

                // Статусы разделов -> APPROVE
                const sections = [
                    "generalInfo",
                    "detailInfo",
                    "streamDataSources",
                    "streamModelControl",
                ] as const;
                for (const section of sections) {
                    const beforeStatus = beforeWorkflow.sections?.[section];
                    const afterStatus = afterWorkflow.sections?.[section];
                    if (beforeStatus !== "Заполнено" && afterStatus === "Заполнено") {
                        this.auditService.sendEvent(
                            AUDIT_EVENT_SUMD_APPROVE,
                            "SUCCESS",
                            uuidv4(),
                            initiator,
                            {
                                questionnaireId: id,
                                section,
                                oldStatus: beforeStatus,
                                newStatus: afterStatus,
                            },
                        );
                    }
                }
            }

            // Если статус анкеты изменился на 'archived' -> удаление
            if (before.status !== "archived" && result.status === "archived") {
                this.auditService.sendEvent(
                    AUDIT_EVENT_SUMD_DELETEANKETA,
                    "SUCCESS",
                    uuidv4(),
                    initiator,
                    { questionnaireId: id },
                );
            }

            this.auditService.sendEvent(
                AUDIT_EVENT_SUMD_SAVEANKETA,
                "SUCCESS",
                correlationId,
                initiator,
                { questionnaireId: id },
            );

            return result;
        } catch (error) {
            this.auditService.sendEvent(
                AUDIT_EVENT_SUMD_SAVEANKETA,
                "FAILURE",
                correlationId,
                initiator,
                { questionnaireId: id, errorMessage: (error as Error).message },
            );
            throw error;
        }
    }

	@Post(":id/hold")
	@HttpCode(200)
	@RealmRole(Permission.ANKETA_HOLD)
	@ApiOperation({
		summary: "Зафиксировать срез анкеты (Заполнено → Утверждена)",
	})
	async hold(
		@Param("id", ParseUUIDPipe) id: string,
	): Promise<V2QuestionnaireDto> {
		return this.questionnaireService.hold(id);
	}

	@Post(":id/new-version")
	@RealmRole(Permission.ANKETA_CREATE_CALCULATION)
	@ApiOperation({
		summary:
			"Новая версия анкеты в серии (наследует привязку к схеме, как v1)",
	})
    async createNewVersion(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() body: CreateV2QuestionnaireVersionDto,
        @CurrentUser() user: Record<string, unknown> | undefined,
    ): Promise<V2QuestionnaireDto> {
        const correlationId = uuidv4();
        const initiator = this.buildInitiator(user);

        this.auditService.sendEvent(
            AUDIT_EVENT_SUMD_CREATEANKETA,
            "START",
            correlationId,
            initiator,
            { sourceQuestionnaireId: id },
        );

        try {
            const result = await this.questionnaireService.createNewVersion(
                id,
                body,
                user as never,
            );
            this.auditService.sendEvent(
                AUDIT_EVENT_SUMD_CREATEANKETA,
                "SUCCESS",
                correlationId,
                initiator,
                { questionnaireId: result.id, sourceQuestionnaireId: id },
            );
            return result;
        } catch (error) {
            this.auditService.sendEvent(
                AUDIT_EVENT_SUMD_CREATEANKETA,
                "FAILURE",
                correlationId,
                initiator,
                { sourceQuestionnaireId: id, errorMessage: (error as Error).message },
            );
            throw error;
        }
    }

    private buildInitiator(
        user: Record<string, unknown> | undefined,
    ): Record<string, unknown> {
        return {
            sub: user?.preferred_username ?? user?.sub ?? "unknown",
            channel: "internal",
            realm: user?.realm ?? "",
        };
    }
}