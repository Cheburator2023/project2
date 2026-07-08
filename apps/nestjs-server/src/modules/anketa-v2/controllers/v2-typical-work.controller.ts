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
	Query,
} from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import type {
	CreateV2TypicalWorkRequestDto,
	CreateV2TypicalWorkParameterRequestDto,
	CreateV2TypicalWorkParameterValueRequestDto,
	PatchV2TypicalWorkRequestDto,
	UpdateV2TypicalWorkParameterRequestDto,
	UpdateV2TypicalWorkParameterValueRequestDto,
	V2ParameterDependencyListResponseDto,
	V2TypicalWorkCardDto,
	V2TypicalWorkListResponseDto,
	V2TypicalWorkParameterDto,
	V2TypicalWorkParameterListResponseDto,
	V2TypicalWorkParameterValueDto,
	V2TypicalWorkPreviewRequestDto,
	V2TypicalWorkPreviewResponseDto,
	CreateV2TypicalWorkAssignmentRequestDto,
	CopyV2TypicalWorkRequestDto,
	V2TypicalWorkAssignmentDto,
	V2TypicalWorkCatalogListResponseDto,
	V2TypicalWorkAssignmentListResponseDto,
} from "@smart-anketa/api-contract";
import { V2TypicalWorkService } from "../services/v2-typical-work.service";
import { V2TypicalWorkWriteService } from "../services/v2-typical-work-write.service";

@ApiTags("v2-works")
@Controller("v2/works")
export class V2TypicalWorkController {
	constructor(
		private readonly typicalWorkService: V2TypicalWorkService,
		private readonly typicalWorkWriteService: V2TypicalWorkWriteService,
	) {}

	@Get("catalog")
	@ApiOperation({ summary: "Каталог типовых работ (реестровые поля)" })
	@ApiQuery({ name: "templateId", required: false })
	listCatalog(
		@Query("templateId") templateId?: string,
	): Promise<V2TypicalWorkCatalogListResponseDto> {
		return this.typicalWorkService.listCatalog(
			templateId ? { templateId } : undefined,
		);
	}

	@Get("assignments/list")
	@ApiOperation({ summary: "Назначения работ на области" })
	@ApiQuery({ name: "workId", required: false })
	@ApiQuery({ name: "streamExecutor", required: false })
	@ApiQuery({ name: "archComponentType", required: false })
	@ApiQuery({ name: "templateVersionId", required: false })
	listAssignments(
		@Query("workId") workId?: string,
		@Query("streamExecutor") streamExecutor?: string,
		@Query("archComponentType") archComponentType?: string,
		@Query("templateVersionId") templateVersionId?: string,
	): Promise<V2TypicalWorkAssignmentListResponseDto> {
		return this.typicalWorkService.listAssignments({
			workId,
			streamExecutor,
			archComponentType,
			templateVersionId,
		});
	}

	@Get()
	@ApiOperation({ summary: "Список типовых работ (F-03)" })
	@ApiQuery({ name: "archComponentType", required: false })
	@ApiQuery({ name: "streamExecutor", required: false })
	@ApiQuery({ name: "templateId", required: false })
	async list(
		@Query("archComponentType") archComponentType?: string,
		@Query("streamExecutor") streamExecutor?: string,
		@Query("templateId") templateId?: string,
	): Promise<V2TypicalWorkListResponseDto> {
		return this.typicalWorkService.listWorks({
			archComponentType,
			streamExecutor,
			templateId,
		});
	}

	@Get("parameters/catalog")
	@ApiOperation({ summary: "Глобальный справочник параметров для условий и коэффициентов" })
	@ApiQuery({ name: "includeInactive", required: false })
	listParameters(
		@Query("includeInactive") includeInactive?: string,
	): Promise<V2TypicalWorkParameterListResponseDto> {
		return this.typicalWorkWriteService.listParameters(
			includeInactive === "true" || includeInactive === "1",
		);
	}

	@Post("parameters")
	@ApiOperation({ summary: "Создать параметр типовых работ" })
	createParameter(
		@Body() dto: CreateV2TypicalWorkParameterRequestDto,
	): Promise<V2TypicalWorkParameterDto> {
		return this.typicalWorkWriteService.createParameter(dto);
	}

	@Patch("parameters/:code")
	@ApiOperation({ summary: "Обновить параметр типовых работ" })
	updateParameter(
		@Param("code") code: string,
		@Body() dto: UpdateV2TypicalWorkParameterRequestDto,
	): Promise<V2TypicalWorkParameterDto> {
		return this.typicalWorkWriteService.updateParameter(code, dto);
	}

	@Delete("parameters/:code")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Удалить параметр типовых работ" })
	deleteParameter(@Param("code") code: string): Promise<void> {
		return this.typicalWorkWriteService.deleteParameter(code);
	}

	@Post("parameters/:code/values")
	@ApiOperation({ summary: "Создать значение параметра типовых работ" })
	createParameterValue(
		@Param("code") code: string,
		@Body() dto: CreateV2TypicalWorkParameterValueRequestDto,
	): Promise<V2TypicalWorkParameterValueDto> {
		return this.typicalWorkWriteService.createParameterValue(code, dto);
	}

	@Patch("parameters/:code/values/:valueCode")
	@ApiOperation({ summary: "Обновить значение параметра типовых работ" })
	updateParameterValue(
		@Param("code") code: string,
		@Param("valueCode") valueCode: string,
		@Body() dto: UpdateV2TypicalWorkParameterValueRequestDto,
	): Promise<V2TypicalWorkParameterValueDto> {
		return this.typicalWorkWriteService.updateParameterValue(
			code,
			valueCode,
			dto,
		);
	}

	@Delete("parameters/:code/values/:valueCode")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Удалить значение параметра типовых работ" })
	deleteParameterValue(
		@Param("code") code: string,
		@Param("valueCode") valueCode: string,
	): Promise<void> {
		return this.typicalWorkWriteService.deleteParameterValue(code, valueCode);
	}

	@Get("parameters/dependencies")
	@ApiOperation({ summary: "Зависимости параметров (методологический каталог)" })
	listDependencies(): Promise<V2ParameterDependencyListResponseDto> {
		return this.typicalWorkWriteService.listParameterDependencies();
	}

	@Post("assignments")
	@ApiOperation({ summary: "Назначить работу на область (стрим)" })
	createAssignment(
		@Body() dto: CreateV2TypicalWorkAssignmentRequestDto,
	): Promise<V2TypicalWorkAssignmentDto> {
		return this.typicalWorkWriteService.createAssignment(dto);
	}

	@Delete("assignments/:assignmentId")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Снять назначение работы с области" })
	@ApiQuery({ name: "confirm", required: false })
	deleteAssignment(
		@Param("assignmentId", ParseUUIDPipe) assignmentId: string,
		@Query("confirm") confirm?: string,
	): Promise<void> {
		return this.typicalWorkWriteService.deleteAssignment(
			assignmentId,
			confirm === "true" || confirm === "1",
		);
	}

	@Post()
	@ApiOperation({ summary: "Создать типовую работу" })
	async create(
		@Body() dto: CreateV2TypicalWorkRequestDto,
	): Promise<V2TypicalWorkCardDto> {
		return this.typicalWorkWriteService.createWork(dto);
	}

	@Post("calculation-logic/backfill")
	@ApiOperation({
		summary: "Скомпилировать JsonLogic для всех сохранённых формул version_config",
	})
	async backfillCalculationLogic(): Promise<{ updated: number; skipped: number }> {
		return this.typicalWorkWriteService.backfillCalculationLogic();
	}

	@Get(":id")
	@ApiOperation({ summary: "Карточка типовой работы для стрима" })
	@ApiQuery({ name: "streamExecutor", required: true })
	@ApiQuery({ name: "templateVersionId", required: false })
	async getCard(
		@Param("id", ParseUUIDPipe) id: string,
		@Query("streamExecutor") streamExecutor: string,
		@Query("templateVersionId") templateVersionId?: string,
	): Promise<V2TypicalWorkCardDto> {
		return this.typicalWorkService.getWorkCard(
			id,
			streamExecutor,
			templateVersionId,
		);
	}

	@Patch(":id")
	@ApiOperation({ summary: "Обновить типовую работу (нормы, условия, коэффициенты, формула)" })
	async patch(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() dto: PatchV2TypicalWorkRequestDto,
	): Promise<V2TypicalWorkCardDto> {
		return this.typicalWorkWriteService.patchWork(id, dto);
	}

	@Post(":id/copy")
	@ApiOperation({ summary: "Скопировать типовую работу (глубокий клон) в схему" })
	async copy(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() dto: CopyV2TypicalWorkRequestDto,
	): Promise<V2TypicalWorkCardDto> {
		return this.typicalWorkWriteService.copyWork(id, dto);
	}

	@Post(":id/preview")
	@ApiOperation({ summary: "Превью расчёта типовой работы" })
	async preview(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() dto: V2TypicalWorkPreviewRequestDto,
	): Promise<V2TypicalWorkPreviewResponseDto> {
		return this.typicalWorkWriteService.previewWork(id, dto);
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Удалить типовую работу" })
	@ApiQuery({
		name: "confirm",
		required: false,
		description: "Подтвердить удаление при использовании в анкетах",
	})
	async delete(
		@Param("id", ParseUUIDPipe) id: string,
		@Query("confirm") confirm?: string,
	): Promise<void> {
		return this.typicalWorkWriteService.deleteWork(
			id,
			confirm === "true" || confirm === "1",
		);
	}
}
