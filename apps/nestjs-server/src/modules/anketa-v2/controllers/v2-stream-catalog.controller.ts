import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
	V2StreamCatalogService,
	type V2StreamWriteInput,
} from "../services/v2-stream-catalog.service";

@ApiTags("v2-streams")
@Controller("v2/streams")
export class V2StreamCatalogController {
	constructor(private readonly streamCatalog: V2StreamCatalogService) {}

	@Get()
	@ApiOperation({
		summary: "Каталог стрим-исполнителей (таблица v2_stream)",
	})
	@ApiResponse({ status: 200 })
	async list(@Query("includeInactive") includeInactive?: string) {
		return this.streamCatalog.listRows({
			includeInactive: includeInactive === "1" || includeInactive === "true",
		});
	}

	@Post()
	@ApiOperation({ summary: "Создать стрим в реестре" })
	@ApiResponse({ status: 201 })
	async create(@Body() body: V2StreamWriteInput) {
		return this.streamCatalog.create(body);
	}

	@Put(":id")
	@ApiOperation({ summary: "Обновить стрим реестра" })
	@ApiResponse({ status: 200 })
	async update(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: V2StreamWriteInput,
	) {
		return this.streamCatalog.update(id, body);
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Удалить стрим реестра" })
	@ApiResponse({ status: 204 })
	async remove(@Param("id", ParseUUIDPipe) id: string) {
		await this.streamCatalog.remove(id);
	}
}
