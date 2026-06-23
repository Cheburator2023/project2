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
	PatchV2TypicalWorkRequestDto,
	V2ParameterDependencyListResponseDto,
	V2TypicalWorkCardDto,
	V2TypicalWorkListResponseDto,
	V2TypicalWorkParameterListResponseDto,
	V2TypicalWorkPreviewRequestDto,
	V2TypicalWorkPreviewResponseDto,
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

	@Get()
	@ApiOperation({ summary: "Список типовых работ (F-03)" })
	@ApiQuery({ name: "archComponentType", required: false })
	@ApiQuery({ name: "streamExecutor", required: false })
	async list(
		@Query("archComponentType") archComponentType?: string,
		@Query("streamExecutor") streamExecutor?: string,
	): Promise<V2TypicalWorkListResponseDto> {
		return this.typicalWorkService.listWorks({
			archComponentType,
			streamExecutor,
		});
	}

	@Get("parameters/catalog")
	@ApiOperation({ summary: "Глобальный справочник параметров для условий и коэффициентов" })
	listParameters(): Promise<V2TypicalWorkParameterListResponseDto> {
		return this.typicalWorkWriteService.listParameters();
	}

	@Get("parameters/dependencies")
	@ApiOperation({ summary: "Зависимости параметров (методологический каталог)" })
	listDependencies(): Promise<V2ParameterDependencyListResponseDto> {
		return this.typicalWorkWriteService.listParameterDependencies();
	}

	@Post()
	@ApiOperation({ summary: "Создать типовую работу" })
	async create(
		@Body() dto: CreateV2TypicalWorkRequestDto,
	): Promise<V2TypicalWorkCardDto> {
		return this.typicalWorkWriteService.createWork(dto);
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
