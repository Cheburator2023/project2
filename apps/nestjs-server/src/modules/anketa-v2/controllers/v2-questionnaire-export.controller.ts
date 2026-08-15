import {
	Body,
	Controller,
	Get,
	Header,
	HttpCode,
	HttpStatus,
	Param,
	ParseUUIDPipe,
	Post,
	Res,
} from "@nestjs/common";
import { once } from "node:events";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { CurrentUser } from "../../../shared/decorators/user.decorator";
import { RealmRole } from "../../../shared/decorators/realm-role.decorator";
import { Permission } from "../../../shared/types/permissions";
import { AuditService } from "../../../shared/audit/audit.service";
import {
	AUDIT_EVENT_SUMD_EXPORTANKETA,
	AUDIT_EVENT_SUMD_EXPORTLISTANKET,
} from "../../../shared/audit/audit.constants";
import { v4 as uuidv4 } from "uuid";
import { ExportV2QuestionnairesXlsxDto } from "../dto";
import { V2QuestionnaireExportJobService } from "../services/v2-questionnaire-export-job.service";

@ApiTags("v2-questionnaires")
@Controller("v2/questionnaires")
export class V2QuestionnaireExportController {
	constructor(
		private readonly exportJobService: V2QuestionnaireExportJobService,
		private readonly auditService: AuditService,
	) {}

	@Post("export/xlsx")
	@HttpCode(HttpStatus.ACCEPTED)
	@RealmRole(Permission.ANKETA_EXPORT_REPORTS)
	@ApiOperation({
		summary: "Поставить выгрузку реестра v2 в очередь (все или выбранные id)",
	})
	async enqueueExport(
		@CurrentUser() user: Record<string, unknown> | undefined,
		@Body() body: ExportV2QuestionnairesXlsxDto = {},
	) {
		return this.enqueue(body.ids, user);
	}

	@Get("export/xlsx")
	@HttpCode(HttpStatus.ACCEPTED)
	@Header("Cache-Control", "no-store")
	@RealmRole(Permission.ANKETA_EXPORT_REPORTS)
	@ApiOperation({
		summary: "Поставить выгрузку всех анкет v2 в очередь (без ожидания файла)",
	})
	async enqueueExportAll(
		@CurrentUser() user: Record<string, unknown> | undefined,
	) {
		return this.enqueue(undefined, user);
	}

	@Get("export/xlsx/lock")
	@Header("Cache-Control", "no-store")
	@RealmRole(Permission.ANKETA_EXPORT_REPORTS)
	@ApiOperation({
		summary: "Занята ли сейчас глобальная выгрузка XLSX",
	})
	async getExportLock() {
		return this.exportJobService.getLock();
	}

	@Get("export/:jobId/status")
	@RealmRole(Permission.ANKETA_EXPORT_REPORTS)
	@ApiOperation({ summary: "Статус фоновой выгрузки XLSX" })
	async getStatus(@Param("jobId", ParseUUIDPipe) jobId: string) {
		return this.exportJobService.getStatus(jobId);
	}

	@Get("export/:jobId/download")
	@RealmRole(Permission.ANKETA_EXPORT_REPORTS)
	@ApiOperation({ summary: "Скачать готовый XLSX фоновой выгрузки" })
	async download(
		@Param("jobId", ParseUUIDPipe) jobId: string,
		@Res() res: Response,
		@CurrentUser() user: Record<string, unknown> | undefined,
	): Promise<void> {
		const file = await this.exportJobService.getDownloadMeta(jobId);
		const correlationId = uuidv4();
		this.auditService.sendEvent(
			AUDIT_EVENT_SUMD_EXPORTLISTANKET,
			"SUCCESS",
			correlationId,
			this.buildInitiator(user),
			{ exportType: "job", jobId, sizeBytes: file.sizeBytes },
		);
		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		);
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="${file.filename}"`,
		);
		res.setHeader("Content-Length", String(file.sizeBytes));
		for await (const chunk of this.exportJobService.iterateDownloadChunks(
			jobId,
		)) {
			if (!res.write(chunk)) {
				await once(res, "drain");
			}
		}
		res.end();
	}

	private async enqueue(
		ids: string[] | undefined,
		user: Record<string, unknown> | undefined,
	) {
		const correlationId = uuidv4();
		const exportType = ids && ids.length > 0 ? "selected" : "all";
		this.auditService.sendEvent(
			exportType === "all"
				? AUDIT_EVENT_SUMD_EXPORTLISTANKET
				: AUDIT_EVENT_SUMD_EXPORTANKETA,
			"START",
			correlationId,
			this.buildInitiator(user),
			{ exportType, ids },
		);
		return this.exportJobService.enqueue(ids, user);
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
