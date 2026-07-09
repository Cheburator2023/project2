import { ApiProperty } from "@nestjs/swagger";
import type {
	V2TemplateDto,
	V2TemplateVersionDto,
	V2TemplateAuditDto,
	V2DictionaryDto,
	V2DictionaryItemDto,
	V2TemplateStatus,
	V2TemplateAuditAction,
	V2LogicGraphDto,
	V2DictionariesSnapshotDto,
} from "@smart-anketa/api-contract";
import { V2_TEMPLATE_AUDIT_ACTION_VALUES } from "@smart-anketa/api-contract";

export class V2TemplateResponseDto implements V2TemplateDto {
	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	id: string;

	@ApiProperty({ example: "model-stream-v1" })
	code: string;

	@ApiProperty({ example: "Модельный стрим v1" })
	name: string;

	@ApiProperty({ required: false })
	description: string | null;

	@ApiProperty({ required: false })
	streamCode: string | null;

	@ApiProperty({ required: false })
	currentVersionId: string | null;

	@ApiProperty()
	createdAt: string;

	@ApiProperty()
	updatedAt: string;

	@ApiProperty({ required: false })
	createdBy: string | null;

	@ApiProperty({ required: false })
	updatedBy: string | null;
}

export class V2TemplateVersionSummaryResponseDto {
	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	id: string;

	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	templateId: string;

	@ApiProperty({ example: 1 })
	versionNumber: number;

	@ApiProperty({ enum: ["draft", "published", "archived"] })
	status: V2TemplateStatus;

	@ApiProperty({ required: false })
	releaseNotes: string | null;

	@ApiProperty({ required: false })
	publishedAt: string | null;
}

export class V2TemplateRegistryItemResponseDto extends V2TemplateResponseDto {
	@ApiProperty({ type: [V2TemplateVersionSummaryResponseDto] })
	versions: V2TemplateVersionSummaryResponseDto[];
}

export class V2TemplateRegistryListResponseDto {
	@ApiProperty({ type: [V2TemplateRegistryItemResponseDto] })
	items: V2TemplateRegistryItemResponseDto[];
}

export class V2TemplateVersionResponseDto implements V2TemplateVersionDto {
	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	id: string;

	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	templateId: string;

	@ApiProperty({ example: 1 })
	versionNumber: number;

	@ApiProperty({ enum: ["draft", "published", "archived"] })
	status: V2TemplateStatus;

	@ApiProperty()
	jsonSchema: Record<string, unknown>;

	@ApiProperty()
	uiSchema: Record<string, unknown>;

	@ApiProperty()
	logic: V2LogicGraphDto;

	@ApiProperty({ required: false })
	dictionariesSnapshot: V2DictionariesSnapshotDto | null;

	@ApiProperty({ required: false })
	releaseNotes: string | null;

	@ApiProperty({ required: false })
	parentVersionId: string | null;

	@ApiProperty()
	createdAt: string;

	@ApiProperty()
	updatedAt: string;

	@ApiProperty({ required: false })
	publishedAt: string | null;

	@ApiProperty({ required: false })
	createdBy: string | null;
}

export class V2TemplateAuditResponseDto implements V2TemplateAuditDto {
	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	id: string;

	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	templateId: string;

	@ApiProperty({ required: false })
	versionId: string | null;

	@ApiProperty({
		enum: V2_TEMPLATE_AUDIT_ACTION_VALUES,
	})
	action: V2TemplateAuditAction;

	@ApiProperty({ required: false })
	payload: Record<string, unknown> | null;

	@ApiProperty()
	createdAt: string;

	@ApiProperty({ required: false })
	createdBy: string | null;

	@ApiProperty({ required: false })
	templateName: string | null;

	@ApiProperty({ required: false })
	templateCode: string | null;

	@ApiProperty({ required: false })
	templateCurrentVersionId: string | null;

	@ApiProperty({ required: false })
	versionNumber: number | null;
}

export class V2DictionaryResponseDto implements V2DictionaryDto {
	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	id: string;

	@ApiProperty({ example: "model-class" })
	code: string;

	@ApiProperty({ example: "Класс модели" })
	name: string;

	@ApiProperty({ required: false, example: "Методологический" })
	category: string | null;

	@ApiProperty({ required: false })
	description: string | null;

	@ApiProperty()
	createdAt: string;

	@ApiProperty()
	updatedAt: string;

	@ApiProperty({ required: false })
	isDefault?: boolean;

	@ApiProperty({ required: false })
	isInUse?: boolean;
}

export class V2DictionaryItemResponseDto implements V2DictionaryItemDto {
	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	id: string;

	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	dictionaryId: string;

	@ApiProperty({ example: "retail" })
	code: string;

	@ApiProperty({ example: "Розничные бизнес-модели" })
	label: string;

	@ApiProperty({ required: false })
	parentCode: string | null;

	@ApiProperty({ example: 0 })
	order: number;

	@ApiProperty({ example: true })
	isActive: boolean;

	@ApiProperty({ required: false })
	payload: Record<string, unknown> | null;
}
