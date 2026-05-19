import { ApiProperty } from "@nestjs/swagger";
import type {
	V2BulkDeleteTemplateVersionsResultDto,
	V2TemplateDeleteSnapshotDto,
} from "@smart-anketa/api-contract";
import { V2TemplateResponseDto, V2TemplateVersionResponseDto } from "./v2-template-response.dto";

export class V2TemplateDeleteSnapshotResponseDto implements V2TemplateDeleteSnapshotDto {
	@ApiProperty({ type: V2TemplateResponseDto })
	template: V2TemplateResponseDto;

	@ApiProperty({ type: [V2TemplateVersionResponseDto] })
	versions: V2TemplateVersionResponseDto[];
}

export class V2BulkDeleteTemplateVersionsResponseDto
	implements V2BulkDeleteTemplateVersionsResultDto
{
	@ApiProperty({ type: [String] })
	deletedVersionIds: string[];

	@ApiProperty({ required: false, nullable: true })
	skippedCurrentVersionId: string | null;

	@ApiProperty({ type: [V2TemplateVersionResponseDto] })
	snapshot: V2TemplateVersionResponseDto[];
}
