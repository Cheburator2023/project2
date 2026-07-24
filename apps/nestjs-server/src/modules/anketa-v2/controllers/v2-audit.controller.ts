import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { V2AuditService } from "../services/v2-audit.service";
import { V2TemplateAuditResponseDto } from "../dto";
import { RealmRole } from "../../../shared/decorators/realm-role.decorator";
import { Permission } from "../../../shared/types/permissions";

@ApiTags("v2-audit")
@Controller("v2/audit")
export class V2AuditController {
	constructor(private readonly auditService: V2AuditService) {}

	@Get()
	@RealmRole(Permission.ANKETA_AUDIT_VIEW)
	@ApiOperation({ summary: "Получить записи аудита" })
	@ApiResponse({ status: 200, type: [V2TemplateAuditResponseDto] })
	async findAll(
		@Query("templateId") templateId?: string,
		@Query("versionId") versionId?: string,
	): Promise<V2TemplateAuditResponseDto[]> {
		const audits = await this.auditService.findAll(templateId, versionId);
		return audits.map((a) => this.toResponseDto(a));
	}

	private toResponseDto(audit: any): V2TemplateAuditResponseDto {
		return {
			id: audit.id,
			templateId: audit.templateId,
			versionId: audit.versionId,
			action: audit.action,
			payload: audit.payload,
			createdAt: audit.createdAt.toISOString(),
			createdBy: audit.createdBy,
			templateName: audit.templateName ?? null,
			templateCode: audit.templateCode ?? null,
			templateCurrentVersionId: audit.templateCurrentVersionId ?? null,
			versionNumber: audit.versionNumber ?? null,
		};
	}
}
