import { ApiProperty } from "@nestjs/swagger";
import type { V2TemplateStatus, V2ValidationIssueLevel } from "@smart-anketa/api-contract";

export class V2TemplateStatusDto {
	@ApiProperty({ enum: ["draft", "published", "archived"] })
	status: V2TemplateStatus;
}

export class V2ValidationIssueDto {
	@ApiProperty({ enum: ["error", "warning", "info"] })
	level: V2ValidationIssueLevel;

	@ApiProperty()
	code: string;

	@ApiProperty()
	message: string;

	@ApiProperty({ required: false })
	path?: string;

	@ApiProperty({ required: false })
	details?: Record<string, unknown>;
}

export class V2ValidationReportDto {
	@ApiProperty()
	ok: boolean;

	@ApiProperty({ type: [V2ValidationIssueDto] })
	issues: V2ValidationIssueDto[];
}
