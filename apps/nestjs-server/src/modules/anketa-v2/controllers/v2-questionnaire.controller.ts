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
	Put,
	Query,
	Res,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import type {
	BulkDeleteV2QuestionnairesResultDto,
	SeedV2TestQuestionnairesResultDto,
	V2QuestionnaireCommentDto,
	V2QuestionnaireDto,
	V2QuestionnaireEditLockDto,
	V2QuestionnaireEditLocksListDto,
	V2QuestionnaireFormPackageDto,
	V2QuestionnaireRegistryConfigDto,
} from "@smart-anketa/api-contract";
import {
	AcquireV2QuestionnaireEditLockDto,
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
import { V2QuestionnaireEditLockService } from "../services/v2-questionnaire-edit-lock.service";
import { CurrentUser } from "../../../shared/decorators/user.decorator";
import { RealmRole } from "../../../shared/decorators/realm-role.decorator";
import { Permission } from "../../../shared/types/permissions";
import { AuditService } from "../../../shared/audit/audit.service";
import {
    AUDIT_EVENT_SUMD_CREATEANKETA,
    AUDIT_EVENT_SUMD_SAVEANKETA,
    AUDIT_EVENT_SUMD_DELETEANKETA,
    AUDIT_EVENT_SUMD_HOLDANKETA,
    AUDIT_EVENT_SUMD_BLOCKAPPROVE,
    AUDIT_EVENT_SUMD_ANKETAAPPROVE,
    AUDIT_EVENT_SUMD_EXPORTLISTANKET,
    AUDIT_EVENT_SUMD_EXPORTANKETA,
} from "../../../shared/audit/audit.constants";
import { v4 as uuidv4 } from "uuid";
import { normalizeV2AnketaWorkflow } from "../utils/v2-anketa-workflow.util";

const questionnaireAuditUserId = (
	user: Record<string, unknown> | undefined,
): string | null => {
	if (!user) return null;
	const id = user.id ?? user.sub ?? user.preferred_username ?? user.login;
	return typeof id === "string" && id.trim() ? id.trim() : null;
};

@ApiTags("v2-questionnaires")
@Controller("v2/questionnaires")
export class V2QuestionnaireController {
    constructor(
        private readonly questionnaireService: V2QuestionnaireService,
        private readonly commentService: V2QuestionnaireCommentService,
        private readonly editLockService: V2QuestionnaireEditLockService,
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

	@Get("edit-locks")
	@ApiOperation({
		summary: "Активные блокировки редактирования анкет (для индикации в реестре)",
	})
	async listEditLocks(): Promise<V2QuestionnaireEditLocksListDto> {
		const locks = await this.editLockService.listActive();
		return { locks };
	}

	@Get()
	@ApiOperation({
		summary:
			"Реестр анкет v2 (полный список; фильтр по стриму — на UI, см. /v2/runtime-settings/stream-filter)",
	})
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
            AUDIT_EVENT_SUMD_EXPORTLISTANKET,
            "START",
            correlationId,
            initiator,
            { exportType: "all" },
        );

        try {
            const buffer = await this.questionnaireService.exportRegistryXlsx();
            this.sendRegistryXlsxResponse(res, buffer, "v2-questionnaires");
            this.auditService.sendEvent(
                AUDIT_EVENT_SUMD_EXPORTLISTANKET,
                "SUCCESS",
                correlationId,
                initiator,
                { exportType: "all" },
            );
        } catch (error) {
            this.auditService.sendEvent(
                AUDIT_EVENT_SUMD_EXPORTLISTANKET,
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
            AUDIT_EVENT_SUMD_EXPORTANKETA,
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
                AUDIT_EVENT_SUMD_EXPORTANKETA,
                "SUCCESS",
                correlationId,
                initiator,
                { exportType: "selected", ids: body.ids },
            );
        } catch (error) {
            this.auditService.sendEvent(
                AUDIT_EVENT_SUMD_EXPORTANKETA,
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

	@Get(":id/edit-lock")
	@ApiOperation({ summary: "Текущая блокировка редактирования анкеты" })
	async getEditLock(
		@Param("id", ParseUUIDPipe) id: string,
	): Promise<V2QuestionnaireEditLockDto | null> {
		return this.editLockService.getLock(id);
	}

	@Post(":id/edit-lock")
	@RealmRole(Permission.ANKETA_EDIT_CALCULATION)
	@ApiOperation({ summary: "Захватить блокировку редактирования анкеты" })
	async acquireEditLock(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: AcquireV2QuestionnaireEditLockDto,
		@CurrentUser() user: Record<string, unknown> | undefined,
	): Promise<V2QuestionnaireEditLockDto> {
		return this.editLockService.acquire(id, {
			label: body.lockedByLabel,
			userId: questionnaireAuditUserId(user),
		});
	}

	@Put(":id/edit-lock")
	@RealmRole(Permission.ANKETA_EDIT_CALCULATION)
	@ApiOperation({ summary: "Продлить блокировку редактирования анкеты" })
	async renewEditLock(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: AcquireV2QuestionnaireEditLockDto,
		@CurrentUser() user: Record<string, unknown> | undefined,
	): Promise<V2QuestionnaireEditLockDto> {
		return this.editLockService.renew(id, {
			label: body.lockedByLabel,
			userId: questionnaireAuditUserId(user),
		});
	}

	@Delete(":id/edit-lock")
	@HttpCode(HttpStatus.NO_CONTENT)
	@RealmRole(Permission.ANKETA_EDIT_CALCULATION)
	@ApiOperation({ summary: "Снять блокировку редактирования анкеты" })
	async releaseEditLock(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: AcquireV2QuestionnaireEditLockDto,
		@CurrentUser() user: Record<string, unknown> | undefined,
	): Promise<void> {
		return this.editLockService.release(id, {
			label: body.lockedByLabel,
			userId: questionnaireAuditUserId(user),
		});
	}

	/**
	 * Отдельный POST для снятия lock при закрытии вкладки (fetch keepalive).
	 * Только query `lockedByLabel` — simple-request без CORS-preflight на unload.
	 */
	@Post(":id/edit-lock/release")
	@HttpCode(HttpStatus.NO_CONTENT)
	@RealmRole(Permission.ANKETA_EDIT_CALCULATION)
	@ApiOperation({
		summary: "Снять блокировку (unload/beacon)",
	})
	async releaseEditLockOnUnload(
		@Param("id", ParseUUIDPipe) id: string,
		@Query("lockedByLabel") lockedByLabel: string,
		@CurrentUser() user: Record<string, unknown> | undefined,
	): Promise<void> {
		return this.editLockService.release(id, {
			label: typeof lockedByLabel === "string" ? lockedByLabel : "",
			userId: questionnaireAuditUserId(user),
		});
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
                // Глобальный статус -> HOLDANKETA (утверждение/блокировка)
                if (
                    beforeWorkflow.globalStatus !== "Заполнено" &&
                    afterWorkflow.globalStatus === "Заполнено"
                ) {
                    // Отправляем событие блокировки анкеты (SUMD_HOLDANKETA)
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
                    // Отправляем событие подтверждения завершения анкеты (SUMD_ANKETAAPPROVE)
                    this.auditService.sendEvent(
                        AUDIT_EVENT_SUMD_ANKETAAPPROVE,
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

                // Статусы разделов -> BLOCKAPPROVE (подтверждение завершения блока)
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
                            AUDIT_EVENT_SUMD_BLOCKAPPROVE,
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
        @CurrentUser() user: Record<string, unknown> | undefined,
    ): Promise<V2QuestionnaireDto> {
        const correlationId = uuidv4();
        const initiator = this.buildInitiator(user);

        this.auditService.sendEvent(
            AUDIT_EVENT_SUMD_HOLDANKETA,
            "START",
            correlationId,
            initiator,
            { questionnaireId: id },
        );

        try {
            const result = await this.questionnaireService.hold(id);
            this.auditService.sendEvent(
                AUDIT_EVENT_SUMD_HOLDANKETA,
                "SUCCESS",
                uuidv4(),
                initiator,
                { questionnaireId: id },
            );
            return result;
        } catch (error) {
            this.auditService.sendEvent(
                AUDIT_EVENT_SUMD_HOLDANKETA,
                "FAILURE",
                correlationId,
                initiator,
                { questionnaireId: id, errorMessage: (error as Error).message },
            );
            throw error;
        }
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